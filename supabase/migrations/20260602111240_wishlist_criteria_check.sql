-- ============================================================================
-- Review fix: enforce the "a wishlist must have at least one matcher" invariant
-- at the DB level too, so no all-null wishlist (which would match every listing
-- and spam the buyer) can ever exist regardless of the calling code.
-- ============================================================================
alter table public.wishlists
  add constraint wishlists_has_criteria
  check (brand is not null or category is not null or keywords is not null);
