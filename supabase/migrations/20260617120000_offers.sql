-- ============================================================================
-- offers (2026-06-17) — structured (Vestiaire-style) buyer offers
-- ============================================================================
-- Buyers make a structured offer on an active listing; sellers accept, counter,
-- or decline. ONE open offer per (listing, buyer) — enforced by a partial unique
-- index over the states a buyer can still act on (pending/countered/accepted).
--
-- Conventions (match the rest of the schema):
--   • Money is integer ZAR cents (matches listings.price_cents). Never floats.
--   • All timestamps are timestamptz.
--   • RLS is ON. Buyers/sellers READ their own rows via the Data API; ALL writes
--     go through the service-role client in 'use server' actions (after
--     requireUser + zod + guards), exactly like orders / checkout_intents.
--     RLS-on + no write policy = authenticated cannot tamper with amounts/state
--     directly via the Data API.
--
-- State machine (enforced in lib/offers actions, not in SQL):
--   pending   → accepted | countered | declined | expired | withdrawn
--   countered → accepted | declined | expired | withdrawn
--   accepted is terminal for the offer lifecycle (the 24h pay window governs
--   checkout, not further offer transitions); declined/expired/withdrawn terminal.
-- ============================================================================
create table public.offers (
  id                   uuid primary key default gen_random_uuid(),
  listing_id           uuid not null references public.listings (id) on delete cascade,
  buyer_id             uuid not null references public.users (id)    on delete cascade,
  seller_id            uuid not null references public.users (id),               -- denormalised from listing at insert; drives seller-dashboard RLS + reads
  amount_cents         integer not null check (amount_cents > 0),                -- buyer's offered price
  counter_amount_cents integer check (counter_amount_cents is null or counter_amount_cents > 0), -- seller counter; null unless state='countered'
  agreed_amount_cents  integer check (agreed_amount_cents is null or agreed_amount_cents > 0),   -- frozen price the buyer may pay; set on ACCEPT only
  state                text not null default 'pending'
                         check (state in ('pending','countered','accepted','declined','expired','withdrawn')),
  expires_at           timestamptz not null,                                     -- 48h response deadline (pending/countered); recomputed on counter
  pay_deadline_at      timestamptz,                                              -- 24h pay window; set on ACCEPT only
  created_at           timestamptz not null default now(),
  countered_at         timestamptz,
  decided_at           timestamptz                                              -- when it reached a terminal state (accepted/declined/expired/withdrawn)
);

-- ONE open offer per (listing, buyer): only states the buyer can still act on.
-- A lazy expiry sweep (lib/offers/queries.ts) flips stale pending/countered rows
-- to 'expired', freeing this slot so a buyer whose 48h lapsed can offer again.
create unique index offers_one_open_per_buyer_listing
  on public.offers (listing_id, buyer_id)
  where state in ('pending','countered','accepted');

create index offers_listing_idx on public.offers (listing_id);
create index offers_buyer_idx   on public.offers (buyer_id);
create index offers_seller_idx  on public.offers (seller_id);
create index offers_state_idx   on public.offers (state);
create index offers_expires_idx on public.offers (expires_at);

-- RLS ----------------------------------------------------------------------
alter table public.offers enable row level security;

-- buyer reads own; seller reads offers on own listings; admin all.
create policy "offers: buyer, seller, or admin read"
  on public.offers for select to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_id
    or public.is_admin()
  );
-- Intentionally NO insert/update/delete policies for authenticated: ALL writes
-- go through the service-role client in 'use server' actions (after requireUser
-- + zod + guards), exactly like orders / checkout_intents. RLS-on + no write
-- policy = authenticated cannot tamper with amounts/state via the Data API.

-- GRANTS -------------------------------------------------------------------
-- Data API: authenticated may SELECT (RLS scopes rows); writes are service-role.
grant select on public.offers to authenticated;
-- service_role already holds table-level ALL via 20260603130000 default
-- privileges; grant explicitly for clarity (mirrors checkout_intents migration).
grant select, insert, update, delete on public.offers to service_role;
