-- ============================================================================
-- Seasonal dimension (2026-06-27) — optional per-item season tag. Sellers may
-- pick the season a piece belongs to at submission; the default 'all' means it
-- shows in every season's edit. The homepage "The {Season} Edit" rail filters
-- to (current season OR 'all'). Southern-Hemisphere seasons (D&D is SA-based).
--
-- Additive only: NOT-NULL text columns with a constant default (fast backfill)
-- + CHECK + a partial index, on both listings and auth_submissions. Mirrors the
-- gender dimension. Filter semantics live in lib/marketplace/listings.ts.
-- ============================================================================

alter table public.listings
  add column if not exists season text not null default 'all'
    check (season in ('spring', 'summer', 'autumn', 'winter', 'all'));

comment on column public.listings.season is
  'Optional season tag: spring|summer|autumn|winter|all. Filtered as (current season OR all). Default all = shows in every season edit.';

create index if not exists listings_active_season_idx
  on public.listings (season) where status = 'active';

alter table public.auth_submissions
  add column if not exists season text not null default 'all'
    check (season in ('spring', 'summer', 'autumn', 'winter', 'all'));

comment on column public.auth_submissions.season is
  'Optional season the seller assigns at submission; carried to the listing on approval. Default all.';

-- Demo backfill: tag a few warm-weather pieces to summer so the current (winter)
-- edit is visibly distinct; everything else keeps the 'all' default.
update public.listings set season = 'summer'
  where title in (
    'Chanel Slingback Two-Tone',
    'Gucci Jackie 1961 Small',
    'Bottega Veneta Jodie Mini',
    'Louis Vuitton Capucines MM'
  );
