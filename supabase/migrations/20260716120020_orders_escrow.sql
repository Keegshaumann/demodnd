-- ============================================================================
-- escrow columns (2026-07-16) — Phase 0 of the escrow + courier build
-- (ESCROW-COURIER-SPEC.md §6.3): mirror of the provider's transaction state.
-- ============================================================================
-- The escrow PROVIDER is the source of truth for funds; these columns only
-- mirror its state — no bespoke ledger beyond them (spec §13). Once escrow is
-- live:
--   • orders.status='paid' means "funds secured in escrow".
--   • The actual payout to the seller is the ESCROW RELEASE event, tracked by
--     escrow_status + escrow_released_at — never inferred from orders.status.
--
-- escrow_id is UNIQUE: it is the idempotency key for the funded webhook (a
-- provider retry must not double-create orders — spec §11). A nullable unique
-- column is fine in Postgres (all existing PayFast-era rows stay null).
--
-- GRANTS/RLS unchanged: written server-side only (service-role client).
-- ============================================================================
alter table public.orders
  add column escrow_provider    text,
  add column escrow_id          text unique,
  add column escrow_status      text
               check (escrow_status in
                 ('created', 'funded', 'released',
                  'refunded', 'disputed', 'cancelled')),
  add column escrow_funded_at   timestamptz,
  add column escrow_released_at timestamptz;

comment on column public.orders.escrow_status is
  'Mirror of the escrow provider''s transaction state. ''released'' (+ escrow_released_at) is the seller-payout event; do not infer payout from orders.status.';
