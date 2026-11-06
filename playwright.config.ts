import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a running API (premium-ec-backend `npm run dev` and `npm run dev:worker`).
// The app is started here if it isn't running yet. Storefront tests run on desktop and mobile;
// back-office tests (e2e/admin) sign a temporary Owner in once and reuse the session.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/admin/global-setup.ts",
  globalTeardown: "./e2e/admin/global-teardown.ts",
  use: { baseURL: process.env.STOREFRONT_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", testIgnore: /admin[\\/]/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: /admin[\\/]/, use: { ...devices["Pixel 7"] } },
    { name: "admin-setup", testMatch: /admin[\\/]auth\.setup\.ts/ },
    {
      name: "admin",
      testMatch: /admin[\\/].*\.spec\.ts/,
      dependencies: ["admin-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // started here only for the default local URL; with STOREFRONT_URL set, that server is used as is
  webServer: process.env.STOREFRONT_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000/admin/login", reuseExistingServer: true, timeout: 120_000 },
});
