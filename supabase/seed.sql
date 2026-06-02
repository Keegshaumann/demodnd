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
