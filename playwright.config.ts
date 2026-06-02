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
  retries: 0,
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
  ],
});
