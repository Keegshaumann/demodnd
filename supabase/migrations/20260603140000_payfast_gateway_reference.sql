-- ============================================================================
-- Switch the payment gateway from Stripe to PayFast (2026-06-03).
-- The order/commission/fulfilment logic is gateway-agnostic; only the payment
-- reference column is renamed to a generic name. The UNIQUE constraint (which
-- enforces idempotent, one-order-per-payment fulfilment) follows the rename.
-- For PayFast this stores the m_payment_id (our generated reference).
-- ============================================================================
alter table public.orders
  rename column stripe_payment_intent_id to gateway_reference;
