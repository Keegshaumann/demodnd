import { test, expect } from "@playwright/test";

test("admin overview loads (authenticated as admin)", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/); // not bounced to /signin
});

test("submissions queue shows the seeded pending items", async ({ page }) => {
  await page.goto("/admin/submissions");
  await expect(page.getByText(/Royal Oak|Audemars Piguet/).first()).toBeVisible();
});

test("user search finds the verified seller with an ID-verified pill", async ({
  page,
}) => {
  await page.goto("/admin/users?q=seller-verified");
  await expect(
    page.getByText("seller-verified@dndluxury.co.za"),
  ).toBeVisible();
  await expect(page.getByText("ID verified").first()).toBeVisible();
});

test("a searched buyer shows no verification pill (ADM-2)", async ({ page }) => {
  await page.goto("/admin/users?q=buyer@dndluxury.co.za");
  await expect(page.getByText("buyer@dndluxury.co.za")).toBeVisible();
  await expect(page.getByText("ID verified")).toHaveCount(0);
  await expect(page.getByText("Pending verification")).toHaveCount(0);
});

test("orders and tiers panels load", async ({ page }) => {
  for (const path of ["/admin/orders", "/admin/tiers"]) {
    const resp = await page.goto(path);
    expect(resp?.status(), path).toBeLessThan(400);
  }
});

test("listings moderation shows the catalogue", async ({ page }) => {
  await page.goto("/admin/listings");
  await expect(page.getByText("Rolex Submariner Date").first()).toBeVisible();
});

test("disputes page shows the open dispute with its order context", async ({
  page,
}) => {
  await page.goto("/admin/disputes");
  await expect(page.getByText(/Open \(1\)/i)).toBeVisible();
  await expect(page.getByText(/scuff on the heel/i)).toBeVisible();
});

test("reviews moderation shows the seeded review", async ({ page }) => {
  await page.goto("/admin/reviews");
  await expect(page.getByText(/Beautifully packaged/i)).toBeVisible();
});

test("order detail opens from the ledger with status actions", async ({
  page,
}) => {
  await page.goto("/admin/orders");
  await page.getByRole("link", { name: /Manage/i }).first().click();
  await expect(page).toHaveURL(/\/admin\/orders\/.+/);
  await expect(page.getByText(/Seller payout \(EFT\)/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Mark delivered/i }),
  ).toBeVisible();
});
