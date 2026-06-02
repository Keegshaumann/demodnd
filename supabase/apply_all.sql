-- ============================================================================
-- AUTO-GENERATED — concatenation of migrations/*.sql (in order) + seed.sql.
-- Apply to a fresh database in one shot. Do not hand-edit; regenerate from
-- the migration files instead.
-- ============================================================================

-- >>> migrations/20260602111210_init.sql
-- ============================================================================
-- D&D Luxury Marketplace — initial schema
-- ============================================================================
-- Conventions:
--   • All money is integer ZAR cents (*_cents). Never floats.
--   • All fee rates are integer basis points (*_bps); rate = bps / 10000.
--   • RLS is enabled on every table. Authorization reads the `users.role`
--     column (source of truth) via is_admin(), NEVER user_metadata (which is
--     user-editable and unsafe for authz — see Supabase security guidance).
--   • Critical immutable columns (users.role/status, listings.fee_rate_bps) are
--     locked against WRITES at the DB level with column-level GRANTs, so even a
--     compromised authenticated session cannot tamper with them via the API.
--     (orders are written only server-side via the service-role client.)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- users — mirror of auth.users with role + status (source of truth for authz)
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  full_name   text,
  phone       text,
  status      text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  created_at  timestamptz not null default now()
);
comment on table public.users is 'Application users mirrored from auth.users. role/status are authz-critical and locked via column grants.';

-- seller_profiles — public-facing reputation + PRIVATE banking details
create table public.seller_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references public.users (id) on delete cascade,
  username             text not null,
  display_name         text,
  bio                  text,
  bank_name            text,
  bank_account_number  text,
  bank_branch_code     text,
  bank_account_holder  text,
  reputation_score     numeric(3, 2) not null default 0,
  created_at           timestamptz not null default now()
);
comment on table public.seller_profiles is 'Banking columns are sensitive: base table is owner/admin-only. Public info is exposed via the seller_public_profiles view.';
create unique index seller_profiles_username_lower_idx on public.seller_profiles (lower(username));

-- subscription_tiers — configurable by D&D admin
create table public.subscription_tiers (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  monthly_fee_cents    integer not null default 0 check (monthly_fee_cents >= 0),
  per_item_fee_cents   integer not null default 0 check (per_item_fee_cents >= 0),
  max_listings         integer check (max_listings is null or max_listings >= 0), -- null = unlimited
  transaction_fee_bps  integer not null check (transaction_fee_bps between 0 and 10000),
  auth_included        text,
  courier_credits      integer not null default 0 check (courier_credits >= 0),
  sort_order           integer not null default 0,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);
comment on table public.subscription_tiers is 'Tier pricing (TBC values) is configured by D&D in the admin panel. Fee rate is basis points.';

-- seller_subscriptions
create table public.seller_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  tier_id             uuid not null references public.subscription_tiers (id),
  status              text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  current_period_end  timestamptz,
  created_at          timestamptz not null default now()
);
create index seller_subscriptions_user_idx on public.seller_subscriptions (user_id);

-- auth_submissions — seller submits an item for authentication
create table public.auth_submissions (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.users (id) on delete cascade,
  method              text not null check (method in ('photo', 'courier', 'dropoff')),
  status              text not null default 'pending' check (status in ('pending', 'more_info', 'approved', 'declined')),
  brand               text not null,
  category            text not null,
  title               text not null,
  model               text,
  description         text,
  condition           text not null,
  asking_price_cents  integer not null check (asking_price_cents >= 0),
  year                integer,
  photo_paths         text[] not null default '{}',
  admin_notes         text,
  reviewed_by         uuid references public.users (id),
  reviewed_at         timestamptz,
  submitted_at        timestamptz not null default now()
);
create index auth_submissions_seller_idx on public.auth_submissions (seller_id);
create index auth_submissions_status_idx on public.auth_submissions (status);
create index auth_submissions_brand_idx on public.auth_submissions (brand);

-- listings — an authenticated item for sale
create table public.listings (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.users (id) on delete cascade,
  auth_submission_id  uuid references public.auth_submissions (id) on delete set null,
  title               text not null,
  brand               text not null,
  category            text not null,
  model               text,
  description         text,
  condition           text not null,
  price_cents         integer not null check (price_cents >= 0),
  year                integer,
  status              text not null default 'active' check (status in ('pending', 'active', 'sold', 'delisted')),
  fee_rate_bps        integer not null check (fee_rate_bps between 0 and 10000), -- LOCKED at creation
  auth_method         text not null check (auth_method in ('photo', 'courier', 'dropoff')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on column public.listings.fee_rate_bps is 'Commission rate locked at listing creation. Immutable by sellers (column grant); never recalculated.';
create index listings_status_idx on public.listings (status);
create index listings_brand_idx on public.listings (brand);
create index listings_category_idx on public.listings (category);
create index listings_seller_idx on public.listings (seller_id);
create index listings_price_idx on public.listings (price_cents);

-- listing_images
create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id);

-- wishlists — buyer wants (brand/category/keywords), matched on listing approval
create table public.wishlists (
  id               uuid primary key default gen_random_uuid(),
  buyer_id         uuid not null references public.users (id) on delete cascade,
  brand            text,
  category         text,
  keywords         text,
  max_price_cents  integer check (max_price_cents is null or max_price_cents >= 0),
  created_at       timestamptz not null default now()
);
create index wishlists_buyer_idx on public.wishlists (buyer_id);
create index wishlists_brand_idx on public.wishlists (brand);
create index wishlists_category_idx on public.wishlists (category);

-- orders — records a sale. Stripe is a STANDARD account (D&D collects). The
-- payout columns are reference-only for D&D's offline EFT. No escrow/held funds.
create table public.orders (
  id                          uuid primary key default gen_random_uuid(),
  buyer_id                    uuid not null references public.users (id),
  listing_id                  uuid not null references public.listings (id),
  seller_id                   uuid not null references public.users (id), -- denormalized for ledger/seller view
  stripe_payment_intent_id    text unique,
  gross_amount_cents          integer not null check (gross_amount_cents >= 0),
  commission_amount_cents     integer not null check (commission_amount_cents >= 0),
  seller_payout_amount_cents  integer not null check (seller_payout_amount_cents >= 0),
  fee_rate_bps                integer not null,
  status                      text not null default 'pending' check (status in ('pending', 'paid', 'delivered', 'refunded', 'disputed')),
  shipping_name               text,
  shipping_address            text,
  created_at                  timestamptz not null default now(),
  paid_at                     timestamptz,
  delivered_at                timestamptz
);
create index orders_buyer_idx on public.orders (buyer_id);
create index orders_seller_idx on public.orders (seller_id);
create index orders_listing_idx on public.orders (listing_id);
create index orders_status_idx on public.orders (status);

-- disputes — handled by D&D directly (refund via Stripe if needed)
create table public.disputes (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  raised_by    uuid not null references public.users (id),
  reason       text not null,
  status       text not null default 'open' check (status in ('open', 'resolved')),
  resolution   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index disputes_order_idx on public.disputes (order_id);

-- reviews — buyer rates the seller after an order (drives reputation)
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders (id) on delete cascade,
  reviewer_id  uuid not null references public.users (id),
  seller_id    uuid not null references public.users (id),
  rating       integer not null check (rating between 1 and 5),
  body         text,
  created_at   timestamptz not null default now()
);
create index reviews_seller_idx on public.reviews (seller_id);

-- notifications — in-platform alerts (e.g. wishlist matches)
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read);

-- ============================================================================
-- VIEW: public seller profile (safe columns only — never exposes banking).
-- Deliberately a definer view so anyone can read public reputation info while
-- the base seller_profiles table stays owner/admin-only.
-- ============================================================================
create view public.seller_public_profiles
with (security_invoker = false) as
  select
    sp.user_id,
    sp.username,
    sp.display_name,
    sp.bio,
    sp.reputation_score,
    sp.created_at
  from public.seller_profiles sp;

comment on view public.seller_public_profiles is
  'Public, safe subset of seller_profiles (no banking columns). Definer view by design.';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Mirror new auth users into public.users. Role comes from signup metadata but
-- is coerced to buyer/seller only — admin can NEVER be self-assigned at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    case
      when coalesce(new.raw_user_meta_data ->> 'role', 'buyer') = 'seller' then 'seller'
      else 'buyer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep listings.updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- Recompute a seller's reputation (avg rating) whenever reviews change.
create or replace function public.recompute_seller_reputation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_seller uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.seller_profiles sp
  set reputation_score = coalesce((
    select round(avg(r.rating)::numeric, 2)
    from public.reviews r
    where r.seller_id = target_seller
  ), 0)
  where sp.user_id = target_seller;
  return null;
end;
$$;

create trigger reviews_recompute_reputation
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_seller_reputation();

-- ============================================================================
-- Helper: is_admin()  — SECURITY DEFINER so it bypasses RLS on public.users
-- and cannot cause policy recursion. Only ever reports on the *calling* user.
-- Defined after public.users exists so SQL-body validation passes.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True if the current authenticated user has role=admin. SECURITY DEFINER to avoid RLS recursion; only inspects the calling user.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users               enable row level security;
alter table public.seller_profiles     enable row level security;
alter table public.subscription_tiers  enable row level security;
alter table public.seller_subscriptions enable row level security;
alter table public.auth_submissions    enable row level security;
alter table public.listings            enable row level security;
alter table public.listing_images      enable row level security;
alter table public.wishlists           enable row level security;
alter table public.orders              enable row level security;
alter table public.disputes            enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;

-- ---- users -----------------------------------------------------------------
create policy "users: self or admin can read"
  on public.users for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create policy "users: self can update"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "users: admin can update any"
  on public.users for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- seller_profiles (base table: owner/admin only) ------------------------
create policy "seller_profiles: owner or admin read"
  on public.seller_profiles for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "seller_profiles: owner insert"
  on public.seller_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "seller_profiles: owner or admin update"
  on public.seller_profiles for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

-- ---- subscription_tiers ----------------------------------------------------
create policy "tiers: public reads active"
  on public.subscription_tiers for select to anon, authenticated
  using (active = true or public.is_admin());

create policy "tiers: admin writes"
  on public.subscription_tiers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- seller_subscriptions --------------------------------------------------
create policy "subs: owner or admin read"
  on public.seller_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "subs: owner insert"
  on public.seller_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "subs: owner or admin update"
  on public.seller_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

-- ---- auth_submissions ------------------------------------------------------
create policy "submissions: owner or admin read"
  on public.auth_submissions for select to authenticated
  using ((select auth.uid()) = seller_id or public.is_admin());

create policy "submissions: owner insert"
  on public.auth_submissions for insert to authenticated
  with check ((select auth.uid()) = seller_id);

create policy "submissions: owner or admin update"
  on public.auth_submissions for update to authenticated
  using ((select auth.uid()) = seller_id or public.is_admin())
  with check ((select auth.uid()) = seller_id or public.is_admin());

create policy "submissions: owner delete"
  on public.auth_submissions for delete to authenticated
  using ((select auth.uid()) = seller_id or public.is_admin());

-- ---- listings --------------------------------------------------------------
create policy "listings: public reads active; owner/admin read all"
  on public.listings for select to anon, authenticated
  using (
    status = 'active'
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

create policy "listings: admin insert"
  on public.listings for insert to authenticated
  with check (public.is_admin());

create policy "listings: owner or admin update"
  on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id or public.is_admin())
  with check ((select auth.uid()) = seller_id or public.is_admin());

create policy "listings: admin delete"
  on public.listings for delete to authenticated
  using (public.is_admin());

-- ---- listing_images --------------------------------------------------------
create policy "listing_images: visible with parent listing"
  on public.listing_images for select to anon, authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'active' or l.seller_id = (select auth.uid()) or public.is_admin())
  ));

create policy "listing_images: owner or admin write"
  on public.listing_images for all to authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.seller_id = (select auth.uid()) or public.is_admin())
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.seller_id = (select auth.uid()) or public.is_admin())
  ));

-- ---- wishlists -------------------------------------------------------------
create policy "wishlists: owner or admin read"
  on public.wishlists for select to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());

create policy "wishlists: owner insert"
  on public.wishlists for insert to authenticated
  with check ((select auth.uid()) = buyer_id);

create policy "wishlists: owner update"
  on public.wishlists for update to authenticated
  using ((select auth.uid()) = buyer_id)
  with check ((select auth.uid()) = buyer_id);

create policy "wishlists: owner or admin delete"
  on public.wishlists for delete to authenticated
  using ((select auth.uid()) = buyer_id or public.is_admin());

-- ---- orders (buyer + seller + admin can read; writes are server-side) ------
create policy "orders: buyer, seller, or admin read"
  on public.orders for select to authenticated
  using (
    (select auth.uid()) = buyer_id
    or (select auth.uid()) = seller_id
    or public.is_admin()
  );

create policy "orders: admin update"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- disputes --------------------------------------------------------------
create policy "disputes: raiser or admin read"
  on public.disputes for select to authenticated
  using ((select auth.uid()) = raised_by or public.is_admin());

create policy "disputes: order party can raise"
  on public.disputes for insert to authenticated
  with check (
    (select auth.uid()) = raised_by
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and ((select auth.uid()) = o.buyer_id or (select auth.uid()) = o.seller_id)
    )
  );

create policy "disputes: admin update"
  on public.disputes for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- reviews (public read; buyer writes own) -------------------------------
create policy "reviews: public read"
  on public.reviews for select to anon, authenticated
  using (true);

create policy "reviews: buyer of the order can insert"
  on public.reviews for insert to authenticated
  with check (
    (select auth.uid()) = reviewer_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = (select auth.uid())
    )
  );

create policy "reviews: author or admin update"
  on public.reviews for update to authenticated
  using ((select auth.uid()) = reviewer_id or public.is_admin())
  with check ((select auth.uid()) = reviewer_id or public.is_admin());

create policy "reviews: author or admin delete"
  on public.reviews for delete to authenticated
  using ((select auth.uid()) = reviewer_id or public.is_admin());

-- ---- notifications ---------------------------------------------------------
create policy "notifications: owner or admin read"
  on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "notifications: owner update"
  on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notifications: owner or admin delete"
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- ============================================================================
-- GRANTS — Data API exposure + DB-level column locks
-- ============================================================================
-- Base grants for the Data API (RLS still governs row access).
grant usage on schema public to anon, authenticated;

grant select on public.subscription_tiers to anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select on public.listing_images to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.seller_public_profiles to anon, authenticated;

grant select, insert, update, delete on public.seller_profiles to authenticated;
grant select, insert, update, delete on public.seller_subscriptions to authenticated;
grant select, insert, update, delete on public.wishlists to authenticated;
grant select, insert, update, delete on public.disputes to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.listing_images to authenticated;
grant select, insert, update, delete on public.subscription_tiers to authenticated;
grant select on public.orders to authenticated;
grant select, update on public.notifications to authenticated;

-- users: lock role/status — authenticated may only update profile fields.
grant select on public.users to authenticated;
grant update (full_name, phone) on public.users to authenticated;

-- listings: lock fee_rate_bps/seller_id/auth_method — sellers edit only the
-- listing content + status (delist/relist). INSERT is admin-only (via policy).
grant insert on public.listings to authenticated;
grant update (title, description, condition, model, year, price_cents, status)
  on public.listings to authenticated;

-- auth_submissions: sellers edit item details + photos only; status/admin_notes
-- /reviewed_* are admin-only (set via the service-role client on review).
grant select, insert, delete on public.auth_submissions to authenticated;
grant update (brand, category, title, model, description, condition,
              asking_price_cents, year, method, photo_paths)
  on public.auth_submissions to authenticated;

grant execute on function public.is_admin() to anon, authenticated;

-- >>> migrations/20260602111220_storage.sql
-- ============================================================================
-- Storage buckets for item photos and authentication certificates.
-- ============================================================================
-- item-photos:  uploaded by sellers during submission, reused on the live
--               listing. Public read (items become public on approval); writes
--               are scoped to the owner via the first path segment = auth.uid().
-- certificates: D&D authentication certificates shown on listings. Public read;
--               admin-only writes.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('item-photos', 'item-photos', true),
  ('certificates', 'certificates', true)
on conflict (id) do nothing;

-- ---- item-photos -----------------------------------------------------------
create policy "item-photos: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-photos');

create policy "item-photos: owner upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "item-photos: owner or admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  )
  with check (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

create policy "item-photos: owner or admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- ---- certificates ----------------------------------------------------------
create policy "certificates: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'certificates');

create policy "certificates: admin write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "certificates: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificates' and public.is_admin())
  with check (bucket_id = 'certificates' and public.is_admin());

create policy "certificates: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

-- >>> migrations/20260602111230_review_fixes.sql
-- ============================================================================
-- Review fixes (post Step 10 adversarial review):
--  1. Buyer-discretion: sellers must NOT be able to read buyer identity /
--     shipping address from `orders` via the Data API. Remove the seller branch
--     from the orders SELECT policy. Seller-facing sale data is served
--     server-side with the service-role client (non-PII columns only).
--  2. Double-sale guard: a one-of-a-kind listing must never produce two paid
--     orders. Add a partial unique index as a hard backstop (the webhook also
--     atomically claims the listing active -> sold before inserting an order).
-- ============================================================================

-- 1. Orders SELECT: buyers read their own, admins read all. Sellers no longer
--    read raw order rows (their dashboard uses a server-side, non-PII query).
drop policy if exists "orders: buyer, seller, or admin read" on public.orders;

create policy "orders: buyer or admin read"
  on public.orders for select to authenticated
  using (
    (select auth.uid()) = buyer_id
    or public.is_admin()
  );

-- 2. At most one fulfilled order per listing.
create unique index if not exists orders_one_per_listing
  on public.orders (listing_id)
  where status in ('paid', 'delivered');

-- >>> migrations/20260602111240_wishlist_criteria_check.sql
-- ============================================================================
-- Review fix: enforce the "a wishlist must have at least one matcher" invariant
-- at the DB level too, so no all-null wishlist (which would match every listing
-- and spam the buyer) can ever exist regardless of the calling code.
-- ============================================================================
alter table public.wishlists
  add constraint wishlists_has_criteria
  check (brand is not null or category is not null or keywords is not null);

-- >>> migrations/20260602130000_admin_security.sql
-- ============================================================================
-- Admin + security additions:
--  1. Seller ID-verification ("limbo"): a seller can't list/sell until D&D has
--     verified their identity. seller_profiles.verified gates the sell flow.
--  2. Rate limiting: a small DB-backed counter (works across serverless
--     instances) used by public actions (concierge, signup, submission).
-- ============================================================================

-- 1. Verification flag -------------------------------------------------------
alter table public.seller_profiles
  add column if not exists verified boolean not null default false;

comment on column public.seller_profiles.verified is
  'D&D has verified the seller''s identity (ID check). Gates the ability to list/sell. Set by admins only.';

-- 2. Rate limiting -----------------------------------------------------------
create table if not exists public.rate_limits (
  key     text   not null,
  bucket  bigint not null,
  count   int    not null default 0,
  primary key (key, bucket)
);
-- RLS on with NO policies → only the service-role client / SECURITY DEFINER
-- function can touch it; anon/authenticated have no access.
alter table public.rate_limits enable row level security;

-- Atomic increment for the current time bucket; returns TRUE if still allowed.
create or replace function public.rate_limit_hit(
  p_key text,
  p_max int,
  p_window int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  b bigint := floor(extract(epoch from now()) / p_window);
  c int;
begin
  insert into public.rate_limits (key, bucket, count)
  values (p_key, b, 1)
  on conflict (key, bucket)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  -- Opportunistic cleanup of old buckets for this key.
  delete from public.rate_limits where key = p_key and bucket < b - 3;

  return c <= p_max;
end;
$$;

-- Only the service role calls this (via the admin client). Lock down PUBLIC.
revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- >>> migrations/20260602140000_harden_functions.sql
-- ============================================================================
-- Hardening: SECURITY DEFINER trigger functions live in `public`, where Postgres
-- grants EXECUTE to PUBLIC by default. They can only run as triggers (Postgres
-- blocks direct calls), but we revoke PUBLIC execute anyway as defense in depth
-- and to satisfy security advisors. is_admin() stays callable (self-only check);
-- rate_limit_hit() is already locked to service_role.
-- ============================================================================
revoke all on function public.handle_new_user() from public;
revoke all on function public.recompute_seller_reputation() from public;
revoke all on function public.touch_updated_at() from public;

-- >>> migrations/20260603120000_audit_fixes.sql
-- ============================================================================
-- Audit fixes (2026-06-03) — closes findings from the pre-go-live audit.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SELL-1 (CRITICAL): lock seller_profiles.verified + reputation_score.
-- The table-wide `grant ... insert, update ... to authenticated` let any seller
-- self-set verified=true (and forge reputation_score) via a direct supabase-js
-- call, defeating the entire ID-verification gate. Re-grant column-scoped
-- INSERT/UPDATE that OMITS `verified` and `reputation_score`. Admins still set
-- those via the service-role client, which bypasses column grants. This mirrors
-- the column-lock pattern already used for users.role and listings.fee_rate_bps.
-- (ensureSellerProfile inserts user_id+username; updateSellerProfileAction
--  updates display_name/bio/bank_* — all still permitted below.)
-- ---------------------------------------------------------------------------
revoke insert, update on public.seller_profiles from authenticated;

grant insert (user_id, username, display_name, bio,
              bank_name, bank_account_number, bank_branch_code, bank_account_holder)
  on public.seller_profiles to authenticated;

grant update (username, display_name, bio,
              bank_name, bank_account_number, bank_branch_code, bank_account_holder)
  on public.seller_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- SELL-2: enforce ID-verification at the data layer for new submissions.
-- createSubmissionAction already blocks unverified sellers, but the INSERT
-- policy trusted only auth.uid()=seller_id, so a crafted supabase-js insert
-- bypassed the gate (and the 4-photo minimum / path checks). Require a verified
-- profile in the policy itself (defense in depth). Pairs with SELL-1 so
-- `verified` can no longer be self-set.
-- ---------------------------------------------------------------------------
drop policy if exists "submissions: owner insert" on public.auth_submissions;
create policy "submissions: verified owner insert"
  on public.auth_submissions for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and exists (
      select 1 from public.seller_profiles sp
      where sp.user_id = (select auth.uid()) and sp.verified
    )
  );

-- ---------------------------------------------------------------------------
-- PUB-1: a sold listing should render its public "Sold" state, not hard-404.
-- The detail page intends to show sold pieces (Sold badge + disabled button)
-- and the buyer's order-confirmation links straight to /listing/{id}, but the
-- RLS SELECT policy only exposed status='active', so the page 404'd for the
-- public (and the buyer who just purchased). Expose 'sold' too. Browse only
-- queries status='active', so sold items still don't appear in listings —
-- only their direct detail page becomes reachable, matching the UI.
-- ---------------------------------------------------------------------------
drop policy if exists "listings: public reads active; owner/admin read all" on public.listings;
create policy "listings: public reads active or sold; owner/admin read all"
  on public.listings for select to anon, authenticated
  using (
    status in ('active', 'sold')
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

drop policy if exists "listing_images: visible with parent listing" on public.listing_images;
create policy "listing_images: visible with parent listing"
  on public.listing_images for select to anon, authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status in ('active', 'sold') or l.seller_id = (select auth.uid()) or public.is_admin())
  ));

-- ---------------------------------------------------------------------------
-- ADM-1: hard DB backstop against duplicate listings from a concurrent/repeated
-- approve. One live listing per authenticated submission. Pairs with the atomic
-- claim-then-act now used in approveSubmissionAction. (Mirrors the existing
-- orders_one_per_listing partial unique index.)
-- ---------------------------------------------------------------------------
create unique index if not exists listings_one_per_submission
  on public.listings (auth_submission_id)
  where auth_submission_id is not null;

-- >>> migrations/20260603130000_service_role_grants.sql
-- ============================================================================
-- service_role privileges (2026-06-03)
-- ============================================================================
-- The service-role key is the TRUSTED server-side client (createAdminClient).
-- It bypasses RLS, but Postgres table GRANTs still apply — and this project's
-- init migration granted privileges only to `anon`/`authenticated`, never to
-- `service_role` (and the project lacks Supabase's default service_role grants).
--
-- Result: every createAdminClient call failed with "permission denied for
-- table ..." — admin user search, the seller verification badge
-- (getSellerReputation), platform analytics, the orders ledger, order
-- fulfilment / confirm-receipt, wishlist-match notifications, and submission
-- approval. Caught by the E2E suite (admin search + verified badge).
--
-- Grant the trusted role full access. This does NOT weaken the SELL-1 fix: the
-- column-level locks on `verified`/`reputation_score`/`role`/`fee_rate_bps`
-- apply to the untrusted `authenticated` role; `service_role` is server-only
-- (the key never reaches the browser) and is meant to have full access.
-- ============================================================================
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Keep future tables covered too (matches Supabase's default posture).
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

-- >>> seed.sql
-- ============================================================================
-- Seed: subscription tiers (from PROJECT.md).
-- max_listings, transaction_fee_bps and auth_included are authoritative.
-- monthly_fee_cents for paid tiers is TBC — placeholder values D&D adjusts in
-- the admin panel. Free tier is genuinely R0.
-- Only seeds when the table is empty (idempotent).
-- ============================================================================
insert into public.subscription_tiers
  (name, monthly_fee_cents, per_item_fee_cents, max_listings, transaction_fee_bps, auth_included, courier_credits, sort_order, active)
select * from (values
  ('Free',          0,       0, 1,    1200, 'Photo review',                      0, 1, true),
  ('Starter',       14900,   0, 5,     800, 'Photo + 1 courier / month',         1, 2, true),
  ('Professional',  39900,   0, 20,    500, 'Unlimited photo + 2 courier / month', 2, 3, true),
  ('Elite',         99900,   0, null,  300, 'All methods + priority review',     12, 4, true)
) as t(name, monthly_fee_cents, per_item_fee_cents, max_listings, transaction_fee_bps, auth_included, courier_credits, sort_order, active)
where not exists (select 1 from public.subscription_tiers);
