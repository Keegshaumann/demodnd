import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// One psql block that returns the DB to a known baseline before each run, so the
// mutation flows in flows.spec.ts are deterministic and re-runnable. Keyed on
// stable titles / known account ids (not fragile per-row UUIDs).
const RESET_SQL = `
-- so the auth.setup logins don't trip the fail-closed sign-in limiter
truncate table rate_limits;

-- re-open the seeded dispute (ADM-DISPUTE-RESOLVE + admin.spec 'Open (1)')
update disputes set status='open', resolution=null, resolved_at=null
  where order_id in (
    select o.id from orders o join listings l on l.id = o.listing_id
    where l.title = 'Dior J''Adior Slingback'
  );

-- force the toggled listing back to active (ADM-DELIST + keeps Rolex on /browse)
update listings set status='active' where title='Rolex Submariner Date';

-- force the pending seller un-verified (ADM-VERIFY + SELL-3 'Pending verification')
update seller_profiles set verified=false
  where user_id='c8375c5b-662c-4fb8-8703-17e4889a4367';

-- clean wizard-created submissions (keeps the admin queue deterministic)
delete from auth_submissions
  where seller_id='700ebab5-484f-4824-b35f-434c38f122ef'
    and title like 'E2E Wizard Tote%';

-- clean any leftover E2E wishlist (mid-test crash safety net)
delete from wishlists
  where buyer_id='f0d297a6-f916-4f9b-8b96-2b917cb69ce6'
    and keywords like 'E2E-WISH-%';

-- deterministic approve target: drop last run's listing+submission, re-insert fresh
delete from listing_images where listing_id in (select id from listings where title='E2E Approve Bag');
delete from listings where title='E2E Approve Bag';
delete from auth_submissions where title='E2E Approve Bag';
insert into auth_submissions
  (id, seller_id, method, status, brand, category, title, condition, asking_price_cents, photo_paths)
  values ('aaaaaaaa-0000-4000-8000-000000000001',
          '700ebab5-484f-4824-b35f-434c38f122ef',
          'photo', 'pending', 'Approveco', 'bags', 'E2E Approve Bag', 'Mint', 4500000, '{}');
`;

export default async function globalSetup() {
  try {
    const env = readFileSync(".env.local", "utf8");
    const dbUrl = env
      .match(/^SUPABASE_DB_URL=(.*)$/m)?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim();
    if (!dbUrl) return;
    execFileSync(
      "/opt/homebrew/opt/libpq/bin/psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-c", RESET_SQL],
      { stdio: "ignore" },
    );
  } catch (err) {
    console.warn("[e2e globalSetup] reset failed:", String(err));
  }
}
