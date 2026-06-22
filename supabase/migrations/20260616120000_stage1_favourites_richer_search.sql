-- ============================================================================
-- Stage 1 (2026-06-16) — buyer favourites, richer listing detail fields, and
-- fuzzy/trigram search. Single schema-owning migration for the whole stage:
--   (A) saved_listings join table + owner-scoped RLS + grants (mirrors wishlists)
--   (B) richer nullable listings columns + an EXTENDED seller column-grant
--   (D) pg_trgm extension + trigram indexes + closest-match search RPCs
-- All additive: a new table, new nullable columns, a new extension/indexes/
-- functions, and one GRANT re-issue that is a strict superset of the prior one.
-- ============================================================================

-- ============================================================================
-- (A) FAVOURITES — saved_listings (mirrors wishlists owner-scoped RLS/grants)
-- ============================================================================
create table public.saved_listings (
  buyer_id    uuid not null references public.users (id) on delete cascade,
  listing_id  uuid not null references public.listings (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);
create index saved_listings_buyer_idx on public.saved_listings (buyer_id, created_at desc);
alter table public.saved_listings enable row level security;

create policy "saved_listings: owner or admin read"
  on public.saved_listings for select to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());
create policy "saved_listings: owner insert"
  on public.saved_listings for insert to authenticated
  with check ((select auth.uid()) = buyer_id);
create policy "saved_listings: owner or admin delete"
  on public.saved_listings for delete to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());
-- (no UPDATE policy/grant — a save is insert/delete only, like a join row)

grant select, insert, delete on public.saved_listings to authenticated;
-- service_role already holds table-level ALL via 20260603130000 pattern; add explicitly for parity:
grant select, insert, update, delete on public.saved_listings to service_role;

-- ============================================================================
-- (B) RICHER LISTINGS — nullable detail columns + SELLER column-grant extension
-- ============================================================================
alter table public.listings
  add column condition_notes text,
  add column measurements   text,
  add column inclusions      text[];
-- Sellers must edit these on their OWN listings only. The row policy
-- "listings: owner or admin update" (init.sql) already scopes to the owner;
-- the column-scoped UPDATE grant must be re-issued to include the new columns
-- (mirrors how price_cents is seller-editable). Re-grant the full set:
grant update (title, description, condition, model, year, price_cents, status,
              condition_notes, measurements, inclusions)
  on public.listings to authenticated;
-- NOTE: `featured` and fee_rate_bps/seller_id/auth_method remain OMITTED (still admin-only).
-- SELECT on listings is table-level (init) so it already covers the new columns.

-- ============================================================================
-- (D) FUZZY SEARCH — pg_trgm + indexes + closest-match RPC
-- ============================================================================
create extension if not exists pg_trgm;
create index listings_title_trgm_idx on public.listings using gin (title gin_trgm_ops);
create index listings_brand_trgm_idx on public.listings using gin (brand gin_trgm_ops);
create index listings_model_trgm_idx on public.listings using gin (model gin_trgm_ops);

-- Trigram fuzzy search over active listings, applying the SAME structured
-- filters as the browse grid, ordered by similarity. SECURITY INVOKER so RLS
-- (public reads active) still governs. Returns full listing rows so the caller
-- maps them exactly like getActiveListingsPage.
create or replace function public.search_listings_fuzzy(
  p_q          text,
  p_threshold  real    default 0.18,
  p_categories text[]  default null,
  p_brands     text[]  default null,
  p_conditions text[]  default null,
  p_methods    text[]  default null,
  p_min_cents  integer default null,
  p_max_cents  integer default null,
  p_seller_id  uuid    default null,
  p_limit      integer default 24,
  p_offset     integer default 0
) returns setof public.listings
language sql stable security invoker
set search_path = public
as $$
  select l.*
  from public.listings l
  where l.status = 'active'
    and (p_seller_id  is null or l.seller_id = p_seller_id)
    and (p_categories is null or l.category = any(p_categories))
    and (p_brands     is null or l.brand    = any(p_brands))
    and (p_conditions is null or l.condition = any(p_conditions))
    and (p_methods    is null or l.auth_method = any(p_methods))
    and (p_min_cents  is null or l.price_cents >= p_min_cents)
    and (p_max_cents  is null or l.price_cents <= p_max_cents)
    and (
      l.title ilike '%'||p_q||'%' or l.brand ilike '%'||p_q||'%' or l.model ilike '%'||p_q||'%'
      or greatest(
           similarity(l.title, p_q),
           similarity(l.brand, p_q),
           similarity(coalesce(l.model,''), p_q)
         ) >= p_threshold
    )
  order by
    greatest(
      similarity(l.title, p_q),
      similarity(l.brand, p_q),
      similarity(coalesce(l.model,''), p_q)
    ) desc,
    l.featured desc,
    l.created_at desc
  limit greatest(p_limit,1) offset greatest(p_offset,0);
$$;

-- A second RPC returning the total fuzzy count (for pagination), same WHERE:
create or replace function public.search_listings_fuzzy_count(
  p_q text, p_threshold real default 0.18,
  p_categories text[] default null, p_brands text[] default null,
  p_conditions text[] default null, p_methods text[] default null,
  p_min_cents integer default null, p_max_cents integer default null,
  p_seller_id uuid default null
) returns integer language sql stable security invoker set search_path = public as $$
  select count(*)::int from public.listings l
  where l.status='active'
    and (p_seller_id is null or l.seller_id=p_seller_id)
    and (p_categories is null or l.category=any(p_categories))
    and (p_brands is null or l.brand=any(p_brands))
    and (p_conditions is null or l.condition=any(p_conditions))
    and (p_methods is null or l.auth_method=any(p_methods))
    and (p_min_cents is null or l.price_cents>=p_min_cents)
    and (p_max_cents is null or l.price_cents<=p_max_cents)
    and ( l.title ilike '%'||p_q||'%' or l.brand ilike '%'||p_q||'%' or l.model ilike '%'||p_q||'%'
          or greatest(similarity(l.title,p_q),similarity(l.brand,p_q),similarity(coalesce(l.model,''),p_q)) >= p_threshold );
$$;

grant execute on function public.search_listings_fuzzy(text,real,text[],text[],text[],text[],integer,integer,uuid,integer,integer) to anon, authenticated;
grant execute on function public.search_listings_fuzzy_count(text,real,text[],text[],text[],text[],integer,integer,uuid) to anon, authenticated;
