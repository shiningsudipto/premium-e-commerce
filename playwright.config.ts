import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against a running API (premium-ec-backend `npm run dev`). The storefront is
// started here if it isn't running yet.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: process.env.STOREFRONT_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/api/bff/v1/store/config",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
