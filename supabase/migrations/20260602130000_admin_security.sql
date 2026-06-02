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
