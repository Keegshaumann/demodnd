-- ============================================================================
-- Retail / resale-value anchor (2026-06-23) — optional original-retail (MSRP)
-- price per item. When a listing's retail price is HIGHER than the asking price,
-- the UI struck-through the retail and shows an "X% below retail" deal tag; when
-- absent (or not higher than asking) nothing extra renders. Additive only: two
-- new nullable integer columns + one seller column-UPDATE grant re-issue that is
-- a strict superset of the prior one. No existing column/policy is altered.
--
-- Conventions (match the rest of the schema):
--   • Money is integer ZAR cents (matches listings.price_cents /
--     auth_submissions.asking_price_cents). Never floats.
--   • retail_price_cents is NULLABLE (the field is optional). The CHECK allows
--     null OR a strictly-positive amount, mirroring the offers amount checks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (A) SUBMISSIONS — captured in the sell wizard (SubmissionWizard.tsx →
--     createSubmissionAction). The seller may optionally state the item's
--     original retail price alongside their asking price.
-- ----------------------------------------------------------------------------
alter table public.auth_submissions
  add column retail_price_cents integer
    check (retail_price_cents is null or retail_price_cents > 0);

comment on column public.auth_submissions.retail_price_cents is
  'Optional original retail (MSRP) price in ZAR cents. Null = not stated. When > asking_price_cents it carries through to the listing as a resale-value anchor.';

-- GRANTS (auth_submissions):
--   • INSERT is TABLE-LEVEL for authenticated (init.sql), so it already covers
--     the new column — createSubmissionAction inserts via the seller's SESSION
--     client (createClient, the `authenticated` role), so the new column is
--     writable on insert with no grant change.
--   • UPDATE is column-scoped (init.sql) and must be re-issued to include the
--     new column so sellers can edit retail on their OWN submissions. Re-grant
--     the full set (strict superset of init.sql's list + retail_price_cents):
grant update (brand, category, title, model, description, condition,
              asking_price_cents, retail_price_cents, year, method, photo_paths)
  on public.auth_submissions to authenticated;

-- ----------------------------------------------------------------------------
-- (B) LISTINGS — carried through on approval (approveSubmissionAction creates
--     the listing FROM the submission via the service-role client) and
--     admin-editable (setListingPriceAction). Sellers must also be able to set
--     it on their OWN listings.
-- ----------------------------------------------------------------------------
alter table public.listings
  add column retail_price_cents integer
    check (retail_price_cents is null or retail_price_cents > 0);

comment on column public.listings.retail_price_cents is
  'Optional original retail (MSRP) price in ZAR cents. Null = not stated. Rendered as a struck-through anchor + "X% below retail" tag ONLY when present AND > price_cents.';

-- GRANTS (listings):
--   • SELECT on listings is TABLE-LEVEL for anon/authenticated (init.sql), so it
--     already covers the new column — cards/PDP read retail with no new grant.
--   • UPDATE for authenticated is column-scoped (init.sql → SELL-1 → stage-1
--     20260616120000) and must be re-issued to include retail_price_cents so a
--     seller can set it on their OWN listing (the "listings: owner or admin
--     update" row policy already scopes to the owner). Re-grant the full set,
--     a strict superset of the prior re-issue + retail_price_cents:
grant update (title, description, condition, model, year, price_cents, status,
              condition_notes, measurements, inclusions, retail_price_cents)
  on public.listings to authenticated;
-- NOTE: `featured` and fee_rate_bps/seller_id/auth_method/view_count remain
-- OMITTED (still admin/RPC-only). service_role already holds table-level ALL
-- (20260603130000), so approval/admin writes need no further grant.
