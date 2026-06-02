import { test, expect } from "@playwright/test";

// iPhone 13 viewport (configured on the "mobile" project).

test("home renders on mobile with no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("browse renders listings on mobile with no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/browse");
  await expect(page.getByText("Rolex Submariner Date")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});
