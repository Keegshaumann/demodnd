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
