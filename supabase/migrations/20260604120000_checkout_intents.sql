-- ============================================================================
-- checkout_intents (2026-06-04) — capture the buyer's delivery address
-- ============================================================================
-- PayFast's hosted-redirect flow does NOT collect a shipping address, so the
-- order was being created with shipping_address = null. A marketplace that ships
-- physical goods must have a delivery address.
--
-- We capture the address IN-APP at checkout (before redirecting to PayFast),
-- key it by m_payment_id, and the ITN handler copies it onto the order it
-- creates. This row is written by the checkout server action and read by the ITN
-- handler — both run as the TRUSTED service-role client (server-only).
--
-- RLS is ON with NO policies and NO Data API grants, so anon/authenticated have
-- zero access: buyers' delivery addresses are never exposed through the Data API.
-- ============================================================================
create table public.checkout_intents (
  m_payment_id     uuid primary key,
  listing_id       uuid not null references public.listings (id) on delete cascade,
  buyer_id         uuid not null references public.users (id) on delete cascade,
  shipping_name    text not null,
  shipping_address text not null,
  created_at       timestamptz not null default now()
);

create index checkout_intents_buyer_idx on public.checkout_intents (buyer_id);
create index checkout_intents_created_idx on public.checkout_intents (created_at);

alter table public.checkout_intents enable row level security;
-- Intentionally NO policies: the Data API (anon/authenticated) gets zero access.
-- Only the service-role client (server) reads/writes, and it bypasses RLS.

-- service_role bypasses RLS but still needs table GRANTs (see migration
-- 20260603130000). The default privileges set there cover new tables, but grant
-- explicitly for clarity.
grant select, insert, delete on public.checkout_intents to service_role;
