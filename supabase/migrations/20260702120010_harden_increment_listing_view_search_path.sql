-- ============================================================================
-- Hardening — pin increment_listing_view to an EMPTY search_path
-- ============================================================================
-- The function was created (20260622130000_engagement_retention.sql) with
-- `set search_path = public`, unlike every other SECURITY DEFINER function in
-- this schema which pins `''`. The body already fully-qualifies public.listings
-- and calls no extension functions, so an empty search_path is safe and removes
-- any dependence on the caller/session search_path for a definer-privileged fn.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings
     set view_count = view_count + 1
   where id = p_listing_id
     and status in ('active','sold');
$$;
revoke all on function public.increment_listing_view(uuid) from public;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
