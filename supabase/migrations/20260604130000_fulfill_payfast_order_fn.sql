-- ============================================================================
-- fulfill_payfast_order (2026-06-04) — atomic order fulfilment
-- ============================================================================
-- The ITN handler previously (a) marked the listing sold, then (b) inserted the
-- order as two separate statements. If (b) failed transiently AFTER (a), the
-- listing was stuck "sold" with no order, the buyer had paid, and PayFast was
-- told 200 (no retry) — money in, no order, no notifications.
--
-- This function does the idempotency check, the active->sold claim, the
-- anti-tamper amount check, and the order insert in a SINGLE transaction under a
-- row lock. Any failure rolls back BOTH steps; the caller re-raises so the route
-- returns 5xx and PayFast retries cleanly. It returns a status string the caller
-- maps to the right outcome.
--
-- Returns one of:
--   'created'         — order inserted, listing claimed
--   'duplicate'       — this payment was already fulfilled (idempotent no-op)
--   'already_sold'    — a DIFFERENT payment claimed the piece (double sale)
--   'amount_mismatch' — charged amount != listing price (refuse)
--   'listing_missing' — listing vanished
-- ============================================================================
create or replace function public.fulfill_payfast_order(
  p_gateway_reference text,
  p_listing_id uuid,
  p_buyer_id uuid,
  p_gross_cents integer,
  p_commission_cents integer,
  p_payout_cents integer,
  p_fee_rate_bps integer,
  p_shipping_name text,
  p_shipping_address text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings%rowtype;
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

  -- Anti-tamper: the charged amount must equal the listing price.
  if v_listing.price_cents <> p_gross_cents then
    return 'amount_mismatch';
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
  text, uuid, uuid, integer, integer, integer, integer, text, text
) from public;
grant execute on function public.fulfill_payfast_order(
  text, uuid, uuid, integer, integer, integer, integer, text, text
) to service_role;
