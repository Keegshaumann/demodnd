-- ============================================================================
-- listing parcel dimensions (2026-07-16) — Phase 0 of the escrow + courier
-- build (ESCROW-COURIER-SPEC.md §6.4): structured weight/dims for quoting.
-- ============================================================================
-- Parcel Perfect's requestQuote takes contents with actmass (kg) and
-- dim1/dim2/dim3 (cm), and at least one item must have actmass > 0 or no rate
-- is returned. Store metric INTEGERS (grams / millimetres) — integers only,
-- like money — and convert at the API boundary.
--
-- All NULLABLE: weight/dims are measured at the DEPOT by admin at
-- authentication/intake (the hub holds the item), never by the seller. When
-- null, quoting falls back to a category default parcel
-- (lib/courier/jkj/parcels.ts, later phase). The CHECKs allow null-or-positive
-- only: a zero actmass silently returns no rates from Parcel Perfect, so
-- reject it at the DB.
--
-- GRANTS: the seller column-scoped UPDATE grant on listings is deliberately
-- NOT extended to these columns — capture is admin-only via the service-role
-- client (which already holds full access), so `authenticated` sellers cannot
-- write them. SELECT on listings is table-level (init.sql), so the new
-- columns are readable wherever the listing row already is.
-- ============================================================================
alter table public.listings
  add column weight_grams integer check (weight_grams > 0),
  add column length_mm    integer check (length_mm > 0),
  add column width_mm     integer check (width_mm > 0),
  add column height_mm    integer check (height_mm > 0);
