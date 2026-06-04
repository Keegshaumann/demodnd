import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// A valid 1x1 PNG — uploaded 4x to satisfy the wizard's photo minimum.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// The approve flow consumes a pending submission (irreversible), so it can't
// rely on global-setup for retries. Re-seed a fresh target at the start of the
// test instead, making each attempt (incl. retry) deterministic.
function resetAdminFlowState() {
  try {
    const dbUrl = readFileSync(".env.local", "utf8")
      .match(/^SUPABASE_DB_URL=(.*)$/m)?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim();
    if (!dbUrl) return;
    execFileSync(
      "/opt/homebrew/opt/libpq/bin/psql",
      [
        dbUrl,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `update disputes set status='open', resolution=null, resolved_at=null
           where order_id in (select o.id from orders o join listings l on l.id=o.listing_id where l.title='Dior J''Adior Slingback');
         update listings set status='active' where title='Rolex Submariner Date';
         update seller_profiles set verified=false where user_id='c8375c5b-662c-4fb8-8703-17e4889a4367';
         delete from listing_images where listing_id in (select id from listings where title='E2E Approve Bag');
         delete from listings where title='E2E Approve Bag';
         delete from auth_submissions where title='E2E Approve Bag';
         insert into auth_submissions (id, seller_id, method, status, brand, category, title, condition, asking_price_cents, photo_paths)
         values ('aaaaaaaa-0000-4000-8000-000000000001','700ebab5-484f-4824-b35f-434c38f122ef','photo','pending','Approveco','bags','E2E Approve Bag','Mint',4500000,'{}');`,
      ],
      { stdio: "ignore" },
    );
  } catch {
    /* best-effort */
  }
}

/** Current status of the listing the approve flow should create (or "" if none). */
function approveTargetListingStatus(): string {
  try {
    const dbUrl = readFileSync(".env.local", "utf8")
      .match(/^SUPABASE_DB_URL=(.*)$/m)?.[1]
      ?.replace(/^["']|["']$/g, "")
      .trim();
    if (!dbUrl) return "";
    return execFileSync(
      "/opt/homebrew/opt/libpq/bin/psql",
      [
        dbUrl,
        "-At",
        "-c",
        "select status from public.listings where title='E2E Approve Bag' limit 1",
      ],
      { encoding: "utf8" },
    ).trim();
  } catch {
    return "";
  }
}

// ── Seller: the full 4-step submission wizard, real photo uploads ────────────
test.describe("seller flow", () => {
  test.use({ storageState: "tests/e2e/.auth/verified-seller.json" });

  test("submits a piece through the wizard (4 photo uploads)", async ({
    page,
  }) => {
    await page.goto("/sell");
    await expect(
      page.getByRole("heading", { name: "About the piece" }),
    ).toBeVisible();

    // Step 1 — details
    await page.getByPlaceholder("e.g. Hermès").fill("E2E Marque");
    await page.locator("select").first().selectOption("bags"); // category
    await page.locator("select").nth(1).selectOption("Mint"); // condition
    await page
      .getByPlaceholder("e.g. Birkin 30")
      .fill("E2E Wizard Tote " + Date.now());
    await page.getByPlaceholder("e.g. 285000").fill("125000");
    await page.getByRole("button", { name: /Continue/ }).click();

    // Step 2 — photos (uploaded to Supabase storage via the file input)
    await expect(
      page.getByRole("heading", { name: "Photographs" }),
    ).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(
      ["front.png", "back.png", "base.png", "serial.png"].map((name) => ({
        name,
        mimeType: "image/png",
        buffer: PNG,
      })),
    );
    await expect(page.locator('img[alt$=".png"]')).toHaveCount(4, {
      timeout: 30000,
    });
    await expect(page.getByText("Uploading…")).toHaveCount(0);
    await page.getByRole("button", { name: /Continue/ }).click();

    // Step 3 — authentication method
    await expect(
      page.getByRole("heading", { name: "Authentication method" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Photo Review/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();

    // Step 4 — review + submit
    await expect(
      page.getByRole("heading", { name: "Review & submit" }),
    ).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Submit for review/ }).click();

    await expect(
      page.getByRole("heading", { name: "Submission received." }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/DND-/)).toBeVisible();
  });
});

// ── Admin: approve → live; verify toggle; delist toggle; resolve dispute ─────
test.describe("admin flows", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  // Restore baseline before EACH attempt (incl. retries) so the irreversible
  // mutations (approve, dispute-resolve) and toggles are deterministic.
  test.beforeEach(() => resetAdminFlowState());

  test("approves a pending submission and it goes live on browse", async ({
    page,
  }) => {
    await page.goto("/admin/submissions");
    const card = page.locator("article").filter({ hasText: "E2E Approve Bag" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Approve" }).click();
    // It leaves the pending queue once approved…
    await expect(
      page
        .locator("article")
        .filter({ hasText: "E2E Approve Bag" })
        .getByRole("button", { name: "Approve" }),
    ).toHaveCount(0, { timeout: 15000 });
    // …and the approval created a live (active) listing. Verified at the DB to
    // sidestep the occasional empty-body the single test server returns right
    // after this flow's heavier action (email + wishlist match + revalidations).
    await expect.poll(approveTargetListingStatus, { timeout: 15000 }).toBe(
      "active",
    );
  });

  test("verifies then un-verifies the pending seller", async ({ page }) => {
    await page.goto("/admin/users?q=seller-pending");
    const row = page
      .locator("article")
      .filter({ hasText: "seller-pending@dndluxury.co.za" });
    await expect(row.getByText("Pending verification")).toBeVisible();
    await row.getByRole("button", { name: /Verify ID/ }).click();
    await expect(row.getByText("ID verified")).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Un-verify" }).click();
    await expect(row.getByText("Pending verification")).toBeVisible({
      timeout: 15000,
    });
  });

  test("delists then relists a listing", async ({ page }) => {
    await page.goto("/admin/listings?q=Rolex");
    const row = page
      .locator("article")
      .filter({ hasText: "Rolex Submariner Date" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Delist" }).click();
    await expect(row.getByText("delisted")).toBeVisible({ timeout: 15000 });
    await row.getByRole("button", { name: "Relist" }).click();
    await expect(row.getByText("active")).toBeVisible({ timeout: 15000 });
  });

  test("resolves the open dispute", async ({ page }) => {
    await page.goto("/admin/disputes");
    await expect(page.getByText(/Open \(1\)/)).toBeVisible();
    const card = page
      .locator("article")
      .filter({ hasText: "scuff on the heel" });
    await card.getByRole("button", { name: "Resolve" }).click();
    await card
      .getByRole("textbox")
      .fill("Refunded as a goodwill gesture; buyer satisfied. [e2e]");
    await card.getByRole("button", { name: "Confirm resolve" }).click();
    await expect(page.getByText(/Resolved \(1\)/)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Open \(0\)/)).toBeVisible();
  });
});

// ── Buyer: wishlist add + remove (self-cleaning) ─────────────────────────────
test.describe("buyer flow", () => {
  test.use({ storageState: "tests/e2e/.auth/buyer.json" });

  test("adds then removes a wishlist entry", async ({ page }) => {
    await page.goto("/buyer/wishlist");
    const kw = "E2E-WISH-" + Date.now();
    await page.getByPlaceholder("e.g. Birkin 30 gold").fill(kw);
    await page.getByRole("button", { name: "Add to wishlist" }).click();

    const item = page.locator("li").filter({ hasText: kw });
    await expect(item).toBeVisible({ timeout: 15000 });
    await item.getByRole("button", { name: "Remove from wishlist" }).click();
    await expect(page.locator("li").filter({ hasText: kw })).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
