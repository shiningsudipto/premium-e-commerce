import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 3 admin operations: the job monitor and integration health render the API's real data;
// the affiliate fraud queue, payout batches and asset library render, and their flows run only
// when there's data to work on (they skip with a reason otherwise). Nothing is created, approved
// or deleted here: these screens act on money and fraud decisions, so the tests only read.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";

let admin: APIRequestContext;

test.use({ storageState: OWNER_STATE });

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  await admin.dispose();
});

test.describe("job monitor", () => {
  test("lists the app's queues with counts and opens a queue's jobs", async ({ page }) => {
    const res = await admin.get("/v1/admin/ops/queues");
    expect(res.status(), await res.text()).toBe(200);
    const { queues } = (await res.json()) as { queues: { name: string }[] };
    expect(queues.length).toBeGreaterThan(0);

    await page.goto("/admin/jobs");
    await expect(page.getByRole("heading", { name: "Jobs", level: 1 })).toBeVisible();
    await expect(page.getByRole("cell", { name: /^Send emails/ })).toBeVisible();
    await expect(page.getByText("notification.send-email", { exact: true })).toBeVisible();
    await expect(page.getByText(/refreshes every 15 seconds/)).toBeVisible();

    await page.getByRole("button", { name: "View jobs in Send emails" }).click();
    await expect(page).toHaveURL(/queue=notification\.send-email/);
    await expect(page.getByRole("heading", { name: "Send emails", level: 2 })).toBeVisible();
  });
});

test.describe("integration health", () => {
  test("shows a status card per integration with a last-checked time", async ({ page }) => {
    const res = await admin.get("/v1/admin/ops/integrations");
    expect(res.status(), await res.text()).toBe(200);
    const { checks } = (await res.json()) as { checks: { name: string }[] };

    await page.goto("/admin/integrations");
    await expect(page.getByRole("heading", { name: "Integrations", level: 1 })).toBeVisible();
    for (const c of checks) await expect(page.getByRole("region", { name: c.name })).toBeVisible();
    await expect(page.getByText(/Last checked/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Database (Postgres)" }).getByText("Working")).toBeVisible();
  });
});

test.describe("affiliate operations", () => {
  test("fraud review lists open flags and offers a resolution", async ({ page }) => {
    const res = await admin.get("/v1/admin/affiliate-program/fraud-flags?status=OPEN&limit=1");
    expect(res.status(), await res.text()).toBe(200);
    const { items } = (await res.json()) as { items: { affiliateId: string }[] };

    await page.goto("/admin/affiliates/fraud?status=OPEN");
    await expect(page.getByRole("heading", { name: "Fraud review", level: 1 })).toBeVisible();
    test.skip(!items.length, "No open fraud flags in this database to review.");

    await expect(page.locator(`a[href="/admin/affiliates/${items[0]!.affiliateId}"]`).first()).toBeVisible();
    // open the dialog and back out: resolving would change a real affiliate
    await page
      .getByRole("button", { name: /^Resolve / })
      .first()
      .click();
    await expect(page.getByRole("dialog", { name: "Resolve fraud flag" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Dismiss/ })).toBeChecked();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("payout batches list and open a batch with its payouts", async ({ page }) => {
    const res = await admin.get("/v1/admin/affiliate-program/payout-batches?limit=1");
    expect(res.status(), await res.text()).toBe(200);
    const { items } = (await res.json()) as { items: { id: string }[] };

    await page.goto("/admin/affiliates/payouts");
    await expect(page.getByRole("heading", { name: "Payout batches", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prepare batch" })).toBeVisible();
    test.skip(!items.length, "No payout batches in this database to open.");

    await page.goto(`/admin/affiliates/payouts/${items[0]!.id}`);
    await expect(page.getByRole("heading", { name: /^Payout batch / })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Payout method" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Export CSV/ })).toBeEnabled();
  });

  test("the asset library shows assets with their numbers", async ({ page }) => {
    const res = await admin.get("/v1/admin/affiliate-program/assets");
    expect(res.status(), await res.text()).toBe(200);
    const assets = (await res.json()) as { title: string }[];

    await page.goto("/admin/affiliates/assets");
    await expect(page.getByRole("heading", { name: "Marketing assets", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "New asset" })).toBeVisible();
    test.skip(!assets.length, "No marketing assets in this database to show.");

    await expect(page.getByText(assets[0]!.title, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Downloads").first()).toBeVisible();
  });
});
