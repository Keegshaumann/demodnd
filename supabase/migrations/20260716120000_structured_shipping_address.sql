-- ============================================================================
-- structured shipping address (2026-07-16) — Phase 0 of the escrow + courier
-- build (ESCROW-COURIER-SPEC.md §6.1): discrete destination fields.
-- ============================================================================
-- The courier "to" address and the escrow record must not depend on parsing
-- the single free-text blob built by formatShippingAddress. Capture the
-- discrete fields the checkout address form already validates (addressSchema)
-- on BOTH the checkout intent (written pre-payment) and the order (copied at
-- fulfilment), mirroring how the blob flows today.
--
-- All columns are NULLABLE and nothing populates them yet — this migration is
-- schema foundation only (no behaviour change). The existing shipping_name /
-- shipping_address blob stays for display + backward compatibility; later
-- phases populate both.
--
-- GRANTS/RLS unchanged:
--   • checkout_intents stays RLS-on with NO policies and NO Data API grants —
--     only the service-role client (server) reads/writes it, so buyer
--     addresses still never reach the Data API.
--   • orders SELECT is table-level (init.sql), so the buyer/seller/admin who
--     can already read an order's shipping_address blob can read the discrete
--     fields of the SAME row — no new exposure. There is still no
--     INSERT/UPDATE grant to `authenticated`; orders are written server-side.
-- ============================================================================
alter table public.checkout_intents
  add column ship_recipient   text,
  add column ship_line1       text,
  add column ship_line2       text,
  add column ship_suburb      text,
  add column ship_city        text,
  add column ship_province    text,
  add column ship_postal_code text,
  add column ship_phone       text;

alter table public.orders
  add column ship_recipient   text,
  add column ship_line1       text,
  add column ship_line2       text,
  add column ship_suburb      text,
  add column ship_city        text,
  add column ship_province    text,
  add column ship_postal_code text,
  add column ship_phone       text;
