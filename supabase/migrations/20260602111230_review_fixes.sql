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
