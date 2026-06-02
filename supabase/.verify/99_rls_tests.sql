-- RLS behaviour tests. Each block sets a JWT context and asserts access.
-- Uses raise exception on failure so a non-zero psql exit signals a problem.

\set ON_ERROR_STOP on

-- Seed two sellers, one buyer, one admin (as service_role / postgres).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'seller1@test.io', '{"role":"seller"}'),
  ('22222222-2222-2222-2222-222222222222', 'seller2@test.io', '{"role":"seller"}'),
  ('33333333-3333-3333-3333-333333333333', 'buyer@test.io',   '{"role":"buyer"}'),
  ('44444444-4444-4444-4444-444444444444', 'admin@test.io',   '{"role":"buyer"}');

-- handle_new_user trigger should have mirrored these into public.users.
do $$
begin
  if (select count(*) from public.users) <> 4 then
    raise exception 'handle_new_user trigger failed: expected 4 users, got %', (select count(*) from public.users);
  end if;
  if (select role from public.users where email = 'seller1@test.io') <> 'seller' then
    raise exception 'role not mirrored as seller';
  end if;
  -- admin must NOT be self-assignable: this user signed up as buyer
  if (select role from public.users where email = 'admin@test.io') <> 'buyer' then
    raise exception 'admin user should have started as buyer';
  end if;
end $$;

-- Promote admin (manual assignment, as service role / postgres).
update public.users set role = 'admin' where email = 'admin@test.io';

-- seller_profiles + a listing pipeline (as postgres/service-role for setup)
insert into public.seller_profiles (user_id, username, display_name, bank_account_number)
values ('11111111-1111-1111-1111-111111111111', 'seller_one', 'Seller One', 'SECRET-BANK-123');

insert into public.auth_submissions (id, seller_id, method, brand, category, title, condition, asking_price_cents)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
        'photo', 'Hermès', 'bags', 'Birkin 30', 'Pristine', 28500000);

insert into public.listings (id, seller_id, auth_submission_id, title, brand, category, condition, price_cents, fee_rate_bps, auth_method, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Birkin 30', 'Hermès', 'bags', 'Pristine', 28500000, 1200, 'photo', 'active');

insert into public.listings (id, seller_id, title, brand, category, condition, price_cents, fee_rate_bps, auth_method, status)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
        'Pending Piece', 'Chanel', 'bags', 'Mint', 9500000, 1200, 'photo', 'pending');

-- ============================================================================
-- TEST 1: anon can read active listings only
-- ============================================================================
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  if (select count(*) from public.listings) <> 1 then
    raise exception 'TEST1 FAIL: anon should see exactly 1 active listing, saw %', (select count(*) from public.listings);
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 2: seller2 cannot see seller1's pending listing; seller1 can
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
do $$
begin
  if (select count(*) from public.listings) <> 1 then
    raise exception 'TEST2 FAIL: seller2 should see only the 1 active listing, saw %', (select count(*) from public.listings);
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$
begin
  if (select count(*) from public.listings) <> 2 then
    raise exception 'TEST2b FAIL: seller1 should see both their listings, saw %', (select count(*) from public.listings);
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 3: banking details are NOT exposed to other users via base table,
--         but the public view exposes safe columns.
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
do $$
begin
  -- seller2 cannot read seller1's profile row (owner/admin only)
  if (select count(*) from public.seller_profiles) <> 0 then
    raise exception 'TEST3 FAIL: seller2 must not read seller1 profile base row';
  end if;
  -- but the public view shows seller1's safe info
  if (select count(*) from public.seller_public_profiles where username = 'seller_one') <> 1 then
    raise exception 'TEST3b FAIL: public view should expose seller_one';
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 4: fee_rate_bps is immutable by the seller (column grant lock)
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$
declare
  ok boolean := false;
begin
  begin
    update public.listings set fee_rate_bps = 100 where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  exception when insufficient_privilege then
    ok := true;
  end;
  if not ok then
    raise exception 'TEST4 FAIL: seller was able to change locked fee_rate_bps';
  end if;
  -- seller CAN change price (allowed column)
  update public.listings set price_cents = 28000000 where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
end $$;
reset role;

-- ============================================================================
-- TEST 5: a user cannot self-promote to admin (role column not granted)
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
do $$
declare ok boolean := false;
begin
  begin
    update public.users set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';
  exception when insufficient_privilege then ok := true;
  end;
  if not ok then
    raise exception 'TEST5 FAIL: buyer was able to self-promote to admin';
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 6: admin (via is_admin) can read everything
-- ============================================================================
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
do $$
begin
  if (select count(*) from public.listings) <> 2 then
    raise exception 'TEST6 FAIL: admin should see all listings, saw %', (select count(*) from public.listings);
  end if;
  if (select count(*) from public.seller_profiles) <> 1 then
    raise exception 'TEST6b FAIL: admin should read seller profiles';
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 7: tiers seeded and publicly readable
-- ============================================================================
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  if (select count(*) from public.subscription_tiers) <> 4 then
    raise exception 'TEST7 FAIL: expected 4 seeded tiers, saw %', (select count(*) from public.subscription_tiers);
  end if;
  if (select transaction_fee_bps from public.subscription_tiers where name = 'Free') <> 1200 then
    raise exception 'TEST7b FAIL: Free tier fee should be 1200 bps';
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 8: orders — sellers CANNOT read buyer identity/shipping (discretion);
--         buyers CAN read their own order. (seller branch removed from policy)
-- ============================================================================
insert into public.orders
  (id, buyer_id, listing_id, seller_id, stripe_payment_intent_id,
   gross_amount_cents, commission_amount_cents, seller_payout_amount_cents,
   fee_rate_bps, status, shipping_name, shipping_address, paid_at)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '33333333-3333-3333-3333-333333333333',   -- buyer
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',   -- seller1's active listing
   '11111111-1111-1111-1111-111111111111',   -- seller1
   'pi_test_123', 28500000, 3420000, 25080000, 1200, 'paid',
   'Jane Buyer', '1 Secret Road, Cape Town', now());

-- seller1 must NOT see the order (no seller read branch)
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
do $$
begin
  if (select count(*) from public.orders) <> 0 then
    raise exception 'TEST8 FAIL: seller can read orders (buyer PII leak), saw %', (select count(*) from public.orders);
  end if;
end $$;
reset role;

-- buyer MUST see their own order
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', false);
do $$
begin
  if (select count(*) from public.orders) <> 1 then
    raise exception 'TEST8b FAIL: buyer should read their own order, saw %', (select count(*) from public.orders);
  end if;
end $$;
reset role;

-- ============================================================================
-- TEST 9: double-sale guard — a second paid order for the same listing fails
-- ============================================================================
do $$
declare ok boolean := false;
begin
  begin
    insert into public.orders
      (buyer_id, listing_id, seller_id, stripe_payment_intent_id,
       gross_amount_cents, commission_amount_cents, seller_payout_amount_cents,
       fee_rate_bps, status, paid_at)
    values
      ('22222222-2222-2222-2222-222222222222',
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       '11111111-1111-1111-1111-111111111111',
       'pi_test_456', 28500000, 3420000, 25080000, 1200, 'paid', now());
  exception when unique_violation then ok := true;
  end;
  if not ok then
    raise exception 'TEST9 FAIL: a second paid order for the same listing was allowed';
  end if;
end $$;

select 'ALL RLS TESTS PASSED' as result;
