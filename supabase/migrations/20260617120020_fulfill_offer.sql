-- ============================================================================
-- fulfill_payfast_order (2026-06-17) — widen for accepted-offer pricing
-- ============================================================================
-- The 2026-06-04 fulfilment RPC always anti-tampers against the LISTING price.
-- An accepted-offer order is paid at the frozen AGREED amount, so the charged
-- amount legitimately differs from the listing price. This migration widens the
-- RPC with two NULL-default params:
--
--   p_offer_id    uuid    — the accepted offer the payment is bound to (null = full price)
--   p_agreed_cents integer — the frozen agreed amount (null = full listing price)
--
-- and replaces the anti-tamper check so the EXPECTED price is the agreed amount
-- when an offer is present, else the listing price:
--
--   v_expected := coalesce(p_agreed_cents, v_listing.price_cents);
--   if v_expected <> p_gross_cents then return 'amount_mismatch'; end if;
--
-- When p_offer_id is not null it ALSO re-validates the offer UNDER THE LISTING
-- LOCK (a third, DB-level guard on top of the server action + checkout page): the
-- offer must be the offering buyer's, for this listing, still 'accepted', within
-- its pay window, with agreed_amount == charged amount. Any mismatch → the DB
-- itself refuses to record a mispriced or hijacked offer order ('amount_mismatch').
--
-- Commission/payout are passed in (computed by the caller from the actual charged
-- amount) and recorded as before — automatically correct on the agreed price.
-- gateway_reference idempotency, the active->sold claim, and the atomic insert are
-- UNCHANGED, so the function stays idempotent and one-order-per-listing.
--
-- We DROP the old 9-arg signature and recreate WITH the two default-valued params
-- in ONE transaction (every migration runs in a transaction) so there is never an
-- ambiguous-overload window between the old and new signatures. The existing
-- 9-arg call site keeps working because the two new params default to null; the
-- checkout/fulfil TS caller passes p_offer_id/p_agreed_cents in the same release.
--
-- Returns one of:
--   'created'         — order inserted, listing claimed
--   'duplicate'       — this payment was already fulfilled (idempotent no-op)
--   'already_sold'    — a DIFFERENT payment claimed the piece (double sale)
--   'amount_mismatch' — charged amount != expected price, or offer re-validation
--                       failed (wrong buyer/listing/state/expired/agreed mismatch)
--   'listing_missing' — listing vanished
-- ============================================================================
drop function if exists public.fulfill_payfast_order(
  text, uuid, uuid, integer, integer, integer, integer, text, text
);

create or replace function public.fulfill_payfast_order(
  p_gateway_reference text,
  p_listing_id uuid,
  p_buyer_id uuid,
  p_gross_cents integer,
  p_commission_cents integer,
  p_payout_cents integer,
  p_fee_rate_bps integer,
  p_shipping_name text,
  p_shipping_address text,
  p_offer_id uuid default null,
  p_agreed_cents integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing  public.listings%rowtype;
  v_offer    public.offers%rowtype;
  v_expected integer;
begin
  -- Lock the listing row: concurrent ITNs for the same piece serialize here.
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    return 'listing_missing';
  end if;

  -- Idempotency (re-checked under the lock): a duplicate ITN for THIS payment.
  if exists (
    select 1 from public.orders where gateway_reference = p_gateway_reference
  ) then
    return 'duplicate';
  end if;

  -- Anti-tamper: the charged amount must equal the EXPECTED price — the frozen
  -- agreed amount when paying an accepted offer, else the listing price.
  v_expected := coalesce(p_agreed_cents, v_listing.price_cents);
  if v_expected <> p_gross_cents then
    return 'amount_mismatch';
  end if;

  -- Accepted-offer order: re-validate the offer UNDER THE LISTING LOCK so the DB
  -- itself refuses to record a mispriced or hijacked offer order. The offer must
  -- be the offering buyer's, for THIS listing, still 'accepted', within its pay
  -- window, with the frozen agreed amount equal to the charged amount.
  if p_offer_id is not null then
    select * into v_offer from public.offers where id = p_offer_id for update;
    if not found
       or v_offer.buyer_id <> p_buyer_id
       or v_offer.listing_id <> p_listing_id
       or v_offer.state <> 'accepted'
       or v_offer.agreed_amount_cents is distinct from p_gross_cents
       or v_offer.pay_deadline_at is null
       or now() > v_offer.pay_deadline_at
    then
      return 'amount_mismatch';
    end if;
  end if;

  -- A different payment already claimed this one-of-a-kind piece -> double sale.
  if v_listing.status <> 'active' then
    return 'already_sold';
  end if;

  -- Claim + create the order atomically.
  update public.listings set status = 'sold' where id = p_listing_id;

  insert into public.orders (
    buyer_id, listing_id, seller_id, gateway_reference,
    gross_amount_cents, commission_amount_cents, seller_payout_amount_cents,
    fee_rate_bps, status, shipping_name, shipping_address, paid_at
  ) values (
    p_buyer_id, p_listing_id, v_listing.seller_id, p_gateway_reference,
    p_gross_cents, p_commission_cents, p_payout_cents,
    p_fee_rate_bps, 'paid', p_shipping_name, p_shipping_address, now()
  );

  return 'created';
end;
$$;

-- Only the service role (ITN handler via the admin client) may call this.
revoke all on function public.fulfill_payfast_order(
  text, uuid, uuid, integer, integer, integer, integer, text, text, uuid, integer
) from public;
grant execute on function public.fulfill_payfast_order(
  text, uuid, uuid, integer, integer, integer, integer, text, text, uuid, integer
) to service_role;
