import { test, expect } from "@playwright/test";

test("home page loads", async ({ page }) => {
  const resp = await page.goto("/");
  expect(resp?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/D&D|Luxury/i);
});

test("browse shows the seeded listings", async ({ page }) => {
  await page.goto("/browse");
  await expect(page.getByText("Rolex Submariner Date")).toBeVisible();
  await expect(page.getByText("Hermes Birkin 30")).toBeVisible();
  await expect(page.getByText("Chanel Classic Flap Medium")).toBeVisible();
});

test("a listing detail page opens from browse", async ({ page }) => {
  await page.goto("/browse");
  await page.getByText("Rolex Submariner Date").first().click();
  await expect(page).toHaveURL(/\/listing\//);
  await expect(page.getByText(/Submariner/).first()).toBeVisible();
  await expect(page.getByText(/R\s?185\s?000/).first()).toBeVisible();
});

test("a junk listing id renders the not-found page (not a 500/crash)", async ({
  page,
}) => {
  await page.goto("/listing/not-a-real-listing-id");
  // Graceful not-found UI, never the error boundary (PUB-2 UUID guard).
  await expect(
    page.getByRole("heading", { name: /retired/i }),
  ).toBeVisible();
});

test("public info pages load", async ({ page }) => {
  for (const path of ["/how-it-works", "/concierge", "/terms", "/privacy"]) {
    const resp = await page.goto(path);
    expect(resp?.status(), path).toBeLessThan(400);
  }
});

test("sign-in page renders the form", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.locator("#si-email")).toBeVisible();
  await expect(page.locator("#si-password")).toBeVisible();
});

test("verified seller shows the ID-verified badge; pending seller does not (SELL-3)", async ({
  page,
}) => {
  await page.goto("/seller/verified-atelier");
  await expect(page.getByTitle("ID-verified by D&D")).toBeVisible();

  await page.goto("/seller/pending-seller");
  await expect(page.getByTitle("ID-verified by D&D")).toHaveCount(0);
});
