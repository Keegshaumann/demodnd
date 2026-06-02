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
