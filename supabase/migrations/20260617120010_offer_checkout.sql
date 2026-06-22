-- ============================================================================
-- offer_checkout (2026-06-17) — bind a checkout intent to an accepted offer
-- ============================================================================
-- An accepted offer is paid through the EXACT existing PayFast flow, charging the
-- frozen agreed amount instead of the listing price. To do that idempotently and
-- with anti-tamper validation in fulfilment, the checkout intent must carry:
--
--   • offer_id     — the accepted offer this payment is bound to (null = full price)
--   • amount_cents — the price this intent must charge (null = full listing price;
--                    when set it is the AUTHORITATIVE charged/agreed amount the ITN
--                    handler re-validates under the listing+offer row lock).
--
-- Both columns are NULLABLE, so existing full-price intents are unaffected: the
-- checkout action leaves offer_id null and the flow behaves exactly as before.
--
-- GRANTS/RLS unchanged: checkout_intents stays RLS-on with NO policies and NO Data
-- API grants — only the service-role client (server) reads/writes it. The new
-- offer link + frozen amount never reach the Data API.
-- ============================================================================
alter table public.checkout_intents
  add column offer_id     uuid references public.offers (id) on delete set null,
  add column amount_cents integer;
