import { test as setup, expect, type Page } from "@playwright/test";
import { ADMIN, VERIFIED_SELLER, PENDING_SELLER, BUYER } from "./creds";

async function login(
  page: Page,
  email: string,
  password: string,
  expectPath: RegExp,
) {
  await page.goto("/signin");
  await page.fill("#si-email", email);
  await page.fill("#si-password", password);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL(expectPath, { timeout: 20_000 });
  await expect(page).toHaveURL(expectPath);
}

setup("authenticate admin", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password, /\/admin/);
  await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});

setup("authenticate verified seller", async ({ page }) => {
  await login(page, VERIFIED_SELLER.email, VERIFIED_SELLER.password, /\/seller/);
  await page
    .context()
    .storageState({ path: "tests/e2e/.auth/verified-seller.json" });
});

setup("authenticate pending seller", async ({ page }) => {
  await login(page, PENDING_SELLER.email, PENDING_SELLER.password, /\/seller/);
  await page
    .context()
    .storageState({ path: "tests/e2e/.auth/pending-seller.json" });
});

setup("authenticate buyer", async ({ page }) => {
  await login(page, BUYER.email, BUYER.password, /\/buyer/);
  await page.context().storageState({ path: "tests/e2e/.auth/buyer.json" });
});
