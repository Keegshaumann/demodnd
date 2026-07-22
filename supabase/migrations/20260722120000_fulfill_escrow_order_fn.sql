-- ============================================================================
-- fulfill_escrow_order (2026-07-22) — atomic escrow order fulfilment
-- ============================================================================
-- Phase 1 of the escrow + courier build (ESCROW-COURIER-SPEC.md §7.3). The
-- escrow equivalent of fulfill_payfast_order: does the idempotency check, the
-- anti-tamper amount check, the active->sold claim, and the order insert in ONE
-- transaction under the listing row lock. Any failure rolls back everything; the
-- caller re-raises so the webhook route returns 5xx and the provider retries
-- cleanly. No "funds secured but no order" half-state.
--
-- Differences from fulfill_payfast_order:
--   • Idempotency key is ESCROW_ID (the provider transaction id), not
--     gateway_reference. orders.escrow_id is UNIQUE (Phase 0), a hard backstop.
--   • Anti-tamper expects gross = item + shipping. Building the RPC shipping-aware
--     NOW (shipping defaults to 0 in Phase 1) means Phase 4 only starts PASSING a
--     non-zero p_shipping_cents — the guardrail in §11 ("teach the RPC to expect
--     item + shipping the moment shipping is folded in") is satisfied up front,
--     with no risky later change to the anti-tamper check.
--   • Sets the escrow + structured-address + courier columns added in Phase 0.
--     Commission is on the ITEM only (passed in by the caller); shipping is a
--     pass-through, so it is stored on shipping_amount_cents, never commissioned.
--   • Logistics/escrow state is SEPARATE from orders.status: the order is born
--     status='paid' (funds secured in escrow) + escrow_status='funded'. Release to
--     the seller is a later escrow_status='released' event, NOT a status change.
--
-- p_ship is the discrete address as jsonb {recipient,line1,line2,suburb,city,
-- province,postal_code,phone} — copied onto the order's ship_* columns (§6.1) so
-- the courier "to" address does not depend on parsing the flattened blob.
--
-- Returns one of:
--   'created'         — order inserted, listing claimed
--   'duplicate'       — this escrow was already fulfilled (idempotent no-op)
--   'already_sold'    — a DIFFERENT payment claimed the piece (double sale)
--   'amount_mismatch' — charged != item(+agreed) + shipping, or offer re-validation failed
--   'listing_missing' — listing vanished
-- ============================================================================
create or replace function public.fulfill_escrow_order(
  p_escrow_id        text,
  p_escrow_provider  text,
  p_listing_id       uuid,
  p_buyer_id         uuid,
  p_gross_cents      integer,
  p_commission_cents integer,
  p_payout_cents     integer,
  p_shipping_cents   integer,
  p_fee_rate_bps     integer,
  p_pp_quoteno       text,
  p_shipping_name    text,
  p_shipping_address text,
  p_ship             jsonb default '{}'::jsonb,
  p_offer_id         uuid default null,
  p_agreed_cents     integer default null
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
  -- Lock the listing row: concurrent webhooks for the same piece serialize here.
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    return 'listing_missing';
  end if;

  -- Idempotency (re-checked under the lock): a duplicate webhook for THIS escrow.
  if exists (
    select 1 from public.orders where escrow_id = p_escrow_id
  ) then
    return 'duplicate';
  end if;

  -- Anti-tamper: charged amount must equal the EXPECTED price — the frozen agreed
  -- amount when paying an accepted offer, else the listing price, PLUS shipping.
  v_expected := coalesce(p_agreed_cents, v_listing.price_cents)
                + coalesce(p_shipping_cents, 0);
  if v_expected <> p_gross_cents then
    return 'amount_mismatch';
  end if;

  -- Accepted-offer order: re-validate the offer UNDER THE LISTING LOCK. The offer
  -- must be the offering buyer's, for THIS listing, still 'accepted', within its
  -- pay window, with the frozen agreed amount equal to the ITEM charge (gross less
  -- shipping) — so the DB itself refuses a mispriced or hijacked offer order.
  if p_offer_id is not null then
    select * into v_offer from public.offers where id = p_offer_id for update;
    if not found
       or v_offer.buyer_id <> p_buyer_id
       or v_offer.listing_id <> p_listing_id
       or v_offer.state <> 'accepted'
       or v_offer.agreed_amount_cents is distinct from (p_gross_cents - coalesce(p_shipping_cents, 0))
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

  -- Claim + create the order atomically. status='paid' means funds secured in
  -- escrow; escrow_status='funded' mirrors the provider. Logistics stays null.
  update public.listings set status = 'sold' where id = p_listing_id;

  insert into public.orders (
    buyer_id, listing_id, seller_id,
    gross_amount_cents, commission_amount_cents, seller_payout_amount_cents,
    fee_rate_bps, status,
    shipping_name, shipping_address,
    ship_recipient, ship_line1, ship_line2, ship_suburb, ship_city,
    ship_province, ship_postal_code, ship_phone,
    shipping_amount_cents, pp_quoteno,
    escrow_provider, escrow_id, escrow_status, escrow_funded_at,
    paid_at
  ) values (
    p_buyer_id, p_listing_id, v_listing.seller_id,
    p_gross_cents, p_commission_cents, p_payout_cents,
    p_fee_rate_bps, 'paid',
    p_shipping_name, p_shipping_address,
    p_ship->>'recipient', p_ship->>'line1', p_ship->>'line2', p_ship->>'suburb', p_ship->>'city',
    p_ship->>'province', p_ship->>'postal_code', p_ship->>'phone',
    coalesce(p_shipping_cents, 0), p_pp_quoteno,
    p_escrow_provider, p_escrow_id, 'funded', now(),
    now()
  );

  return 'created';
end;
$$;

-- Only the service role (webhook handler via the admin client) may call this.
revoke all on function public.fulfill_escrow_order(
  text, text, uuid, uuid, integer, integer, integer, integer, integer,
  text, text, text, jsonb, uuid, integer
) from public;
grant execute on function public.fulfill_escrow_order(
  text, text, uuid, uuid, integer, integer, integer, integer, integer,
  text, text, text, jsonb, uuid, integer
) to service_role;
