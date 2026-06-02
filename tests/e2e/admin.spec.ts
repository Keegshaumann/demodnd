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
