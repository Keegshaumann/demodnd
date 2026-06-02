import { test, expect } from "@playwright/test";

test("verified seller reaches the dashboard", async ({ page }) => {
  await page.goto("/seller");
  await expect(page).toHaveURL(/\/seller/);
});

test("verified seller can open the submission wizard at /sell", async ({
  page,
}) => {
  await page.goto("/sell");
  // canList → the wizard renders; it must NOT show the pending-verification gate.
  await expect(page.locator("body")).not.toContainText(/Verification in progress/i);
  await expect(page.locator("body")).toContainText(/Brand|Submit|Authenticat/i);
});

test.describe("pending (un-verified) seller", () => {
  test.use({ storageState: "tests/e2e/.auth/pending-seller.json" });

  test("is blocked from listing with a verification notice (SELL-1 gate)", async ({
    page,
  }) => {
    await page.goto("/sell");
    await expect(page.locator("body")).toContainText(/[Vv]erification/);
  });
});
