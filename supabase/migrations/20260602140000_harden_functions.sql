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
