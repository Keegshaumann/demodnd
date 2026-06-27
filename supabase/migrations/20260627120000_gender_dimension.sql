-- ============================================================================
-- Gender dimension (2026-06-27) — Women / Men / Unisex shopping context, à la
-- Vestiaire. The site gates shoppers into a gender on open and filters the
-- catalogue by it (selected gender OR unisex). Additive only: one NOT-NULL
-- text column with a constant default (fast, metadata-only backfill) + a CHECK
-- + a partial index matching the status/featured index convention. No existing
-- column, policy, or grant is altered.
--
-- Filter semantics (lib/marketplace/listings.ts): a chosen gender matches that
-- gender OR 'unisex', so untagged / genuinely-unisex pieces (watches, some
-- jewellery, sneakers) surface in BOTH the Women and Men views and nothing is
-- ever hidden from everyone.
-- ============================================================================

alter table public.listings
  add column if not exists gender text not null default 'unisex'
    check (gender in ('women', 'men', 'unisex'));

comment on column public.listings.gender is
  'Shopping gender: women | men | unisex. Filtered as (selected OR unisex). Default unisex so untagged pieces surface in both views.';

-- Active-by-gender filter path (mirrors listings_active_* partial indexes).
create index if not exists listings_active_gender_idx
  on public.listings (gender)
  where status = 'active';

-- ----------------------------------------------------------------------------
-- Demo backfill — assign the existing seeded catalogue so both views are rich.
-- Fresh DBs run this before listings exist (no-op); scripts/seed-demo-listings
-- sets gender at insert. Idempotent: re-running just re-asserts the same values.
-- ----------------------------------------------------------------------------
update public.listings set gender = 'women'
  where category = 'bags' or title = 'Chanel Slingback Two-Tone';

update public.listings set gender = 'men'
  where title in (
    'Prada Monolith Loafer',
    'Gucci Horsebit 1953 Loafer',
    'Patek Philippe Aquanaut',
    'Audemars Piguet Royal Oak 15500ST',
    'Rolex Cosmograph Daytona',
    'Rolex GMT-Master II Pepsi',
    'Patek Philippe Nautilus'
  );
-- Everything else (jewellery, Dior B23 High-Top, Rolex Submariner, Cartier
-- Santos) keeps the 'unisex' default.
