import { test, expect } from "@playwright/test";

test("buyer reaches the dashboard", async ({ page }) => {
  await page.goto("/buyer");
  await expect(page).toHaveURL(/\/buyer/);
});

test("buyer wishlist shows the seeded entries", async ({ page }) => {
  await page.goto("/buyer/wishlist");
  await expect(page.locator("body")).toContainText(/Rolex|Submariner|Birkin/i);
});

test("buyer orders page loads", async ({ page }) => {
  const resp = await page.goto("/buyer/orders");
  expect(resp?.status()).toBeLessThan(400);
});
