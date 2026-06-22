-- ============================================================================
-- Featured listings (2026-06-12) — admin-curated highlighting (PROJECT.md
-- "Featured listings management"). Surfacing is silent: the browse "Featured"
-- sort and the homepage grid order featured pieces first; no public badge.
-- ============================================================================
alter table public.listings
  add column featured boolean not null default false;

comment on column public.listings.featured is
  'Admin-curated highlight, surfaced first on browse/homepage. Admin-only writable: the column-scoped UPDATE grant for authenticated (init + SELL-1) deliberately omits it; admins write it via the service-role client.';

-- Serves the default browse/homepage query exactly:
--   where status = 'active' order by featured desc, created_at desc
create index listings_active_featured_idx
  on public.listings (featured desc, created_at desc)
  where status = 'active';

-- GRANTS: intentionally NONE.
--   • SELECT on listings is table-level for anon/authenticated (init) — it
--     covers the new column, so the public client can order by it.
--   • UPDATE for authenticated is column-scoped (init.sql) and does NOT list
--     `featured`, so sellers cannot self-feature via updateListingPriceAction /
--     setListingStatusAction or a crafted supabase-js call, even though the
--     "listings: owner or admin update" row policy matches their rows.
--   • service_role already holds table-level ALL (20260603130000), so the
--     admin client writes `featured` with no further grants.
