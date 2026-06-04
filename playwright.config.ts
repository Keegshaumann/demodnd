import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// E2E runs against a production build (next start) for speed + parity. Serial,
// single worker — the suite is a smoke/flow check and a few real sign-ins must
// stay under the (fail-closed) auth rate limit. globalSetup resets that counter.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // Retries absorb an environment flake: on this machine the repo lives under an
  // iCloud-synced Documents folder, which occasionally locks/half-syncs a .next
  // chunk mid-run and yields an empty page body. Real failures still fail thrice.
  retries: 2,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      // Chromium at a phone viewport (390px) — avoids needing the WebKit binary
      // that the iPhone device profile would otherwise launch.
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: "a11y",
      testMatch: /a11y\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
    {
      name: "seller",
      testMatch: /seller\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/verified-seller.json",
      },
    },
    {
      name: "buyer",
      testMatch: /buyer\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/buyer.json",
      },
    },
    {
      // MUTATION flows run LAST so the baseline-assertion specs above see the
      // seeded state first. Each describe sets its own role storageState.
      name: "flows",
      testMatch: /flows\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
