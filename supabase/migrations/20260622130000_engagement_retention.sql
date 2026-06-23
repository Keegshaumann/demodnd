-- ============================================================================
-- Engagement & retention (2026-06-22) — one additive, schema-owning migration
-- for the whole batch of engagement/retention features. Mirrors the conventions
-- in 20260616120000_stage1_favourites_richer_search.sql exactly: owner-scoped
-- RLS, explicit grants to authenticated + service_role, and (where public reads
-- are needed) anon. NOTHING here alters an existing table's existing columns or
-- policies except ONE additive listings column. notifications needs NO change
-- (confirmed: it already has owner SELECT/UPDATE/DELETE policies + service_role
-- INSERT grant, and `type` is free-text — 'price_drop'/'brand_follow' are just
-- new string values).
--   (1) FOLLOW A DESIGNER  — followed_brands (mirrors saved_listings RLS/grants)
--   (5) NEWSLETTER         — newsletter_subscribers (insert-only capture)
--   (7) VIEW COUNTS        — listings.view_count column + increment RPC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (1) FOLLOW A DESIGNER — followed_brands (mirrors saved_listings/wishlists RLS)
-- ----------------------------------------------------------------------------
create table public.followed_brands (
  buyer_id   uuid not null references public.users (id) on delete cascade,
  brand      text not null,
  created_at timestamptz not null default now(),
  primary key (buyer_id, brand)
);
create index followed_brands_buyer_idx on public.followed_brands (buyer_id, created_at desc);
-- Brand fan-out on approval reads "who follows THIS brand" — index the brand col:
create index followed_brands_brand_idx on public.followed_brands (brand);
alter table public.followed_brands enable row level security;

create policy "followed_brands: owner or admin read"
  on public.followed_brands for select to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());
create policy "followed_brands: owner insert"
  on public.followed_brands for insert to authenticated
  with check ((select auth.uid()) = buyer_id);
create policy "followed_brands: owner or admin delete"
  on public.followed_brands for delete to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());
-- (no UPDATE policy/grant — a follow is insert/delete only, like saved_listings)

grant select, insert, delete on public.followed_brands to authenticated;
grant select, insert, update, delete on public.followed_brands to service_role;
-- NOTE: NO grant to anon. A guest cannot follow; the FollowBrandButton routes
-- guests to /signin (mirrors FavouriteButton). The approval fan-out reads
-- followers via the SERVICE-ROLE client (createAdminClient, bypasses RLS),
-- exactly like notifyWishlistMatches reads all wishlists.

-- ----------------------------------------------------------------------------
-- (5) NEWSLETTER — newsletter_subscribers (email unique; insert-only capture)
-- ----------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);
-- citext is not enabled in this project; the subscribe action lowercases+trims
-- the email before insert so the UNIQUE(email) constraint catches dups. The
-- action distinguishes "already subscribed" by inspecting the unique-violation
-- (Postgres code 23505) rather than racing a pre-SELECT.
alter table public.newsletter_subscribers enable row level security;
-- No public RLS policies: capture happens ONLY through the subscribe Server
-- Action using the SERVICE-ROLE client (createAdminClient). There is no
-- buyer/owner concept and we never want anon to read the subscriber list, so we
-- grant nothing to anon/authenticated and leave RLS on with no policy
-- (deny-all to those roles). service_role bypasses RLS:
grant select, insert on public.newsletter_subscribers to service_role;

-- ----------------------------------------------------------------------------
-- (7) VIEW COUNTS — listings.view_count column + increment RPC
-- ----------------------------------------------------------------------------
alter table public.listings
  add column view_count integer not null default 0;
-- SELECT on listings is table-level (init.sql) so it already covers the new
-- column — cards/PDP can read view_count with no new grant. We deliberately do
-- NOT add view_count to the seller column-UPDATE grant: views are bumped ONLY
-- through the security-definer RPC below, never by a seller's own UPDATE.

-- Atomic increment. SECURITY DEFINER so an anonymous PDP visitor (who has no
-- UPDATE grant on listings) can still bump the counter WITHOUT opening a general
-- UPDATE path. Hard-scoped: only ever +1 on the single row id, only when
-- active/sold (never resurrects a delisted/pending counter), returns nothing.
-- search_path pinned (mirrors 20260602140000_harden_functions).
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
     set view_count = view_count + 1
   where id = p_listing_id
     and status in ('active','sold');
$$;
revoke all on function public.increment_listing_view(uuid) from public;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
