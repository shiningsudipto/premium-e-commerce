import { expect, test } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 2 back office: the product import wizard (dry run only, so nothing is written to the
// catalogue), product export with job status and download, and the reports dashboard. Runs as
// the signed-in Owner. Jobs are processed by the API's worker, so it must be running.

const run = Date.now().toString(36);
const JOB_TIMEOUT = 60_000;

test.use({ storageState: OWNER_STATE });
test.describe.configure({ mode: "serial" });

test.describe("import & export (spec §6.2)", () => {
  test("a dry run maps columns by name and reports row problems without importing", async ({ page }) => {
    await page.goto("/admin/data");
    await expect(page.getByRole("heading", { name: "Import & export" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Import" })).toHaveAttribute("aria-selected", "true");

    // Shopify-style headers; the second row has no SKU, the third an unreadable price
    const csv = [
      "Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Inventory Qty,Image Src",
      `e2e-${run}-tee,E2E tee ${run},Size,S,E2E-${run}-S,250.00,3,https://example.com/a.jpg`,
      `e2e-${run}-tee,,Size,M,,260.00,3,`,
      `e2e-${run}-tee,,Size,L,E2E-${run}-L,abc,3,`,
    ].join("\n");
    await page.getByLabel("Product file (CSV or JSON)").setInputFiles({
      name: `e2e-${run}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(page.getByText("3 rows · 8 columns")).toBeVisible();
    await page.getByRole("button", { name: "Map columns" }).click();

    // auto-matched by header name; the image column isn't imported
    await expect(page.getByRole("combobox", { name: "Product field for column Variant SKU" })).toHaveText(/SKU/);
    await expect(page.getByRole("combobox", { name: "Product field for column Variant Price" })).toHaveText(/Price/);
    await expect(page.getByRole("combobox", { name: "Product field for column Image Src" })).toHaveText(/Don't import/);
    await page.getByRole("button", { name: "Continue to check" }).click();

    await page.getByRole("button", { name: `Check e2e-${run}.csv` }).click();
    await expect(page.getByText("2 problems found in 3 rows")).toBeVisible({ timeout: JOB_TIMEOUT });
    const problems = page.getByRole("region", { name: /Row problems/ });
    await expect(problems.getByRole("row", { name: /Row 3 SKU sku is required/ })).toBeVisible();
    await expect(problems.getByRole("row", { name: /Row 4/ })).toBeVisible();

    const download = page.waitForEvent("download");
    await problems.getByRole("button", { name: "Download as CSV" }).click();
    expect((await download).suggestedFilename()).toMatch(/^import-problems-\d{4}-\d{2}-\d{2}\.csv$/);

    // the import step isn't offered while the file has problems
    await expect(page.getByRole("button", { name: "Import", exact: true })).toHaveCount(0);

    // the dry run is in the job history, with its report
    await page.getByRole("tab", { name: "Job history" }).click();
    const row = page.getByRole("row", { name: /Product import dry run \(CSV\).*2 problems found in 3 rows/ }).first();
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: /Report for/ }).click();
    await expect(page).toHaveURL(/job=/);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("sku is required")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/job=/);
  });

  test("a clean file passes the dry run and offers the import (not run here)", async ({ page }) => {
    await page.goto("/admin/data");
    const json = JSON.stringify([
      { handle: `e2e-${run}-cap`, title: `E2E cap ${run}`, sku: `E2E-${run}-CAP`, price: "99.00" },
    ]);
    await page.getByLabel("Product file (CSV or JSON)").setInputFiles({
      name: `e2e-${run}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(json),
    });
    await page.getByRole("button", { name: "Map columns" }).click();
    await page.getByRole("button", { name: "Continue to check" }).click();
    await page.getByRole("button", { name: `Check e2e-${run}.json` }).click();
    await expect(page.getByText("1 row ready to import")).toBeVisible({ timeout: JOB_TIMEOUT });
    await expect(page.getByRole("button", { name: "Import", exact: true })).toBeVisible();
  });

  test("an export runs as a job and its file downloads", async ({ page }) => {
    await page.goto("/admin/data?tab=export");
    await page.getByRole("button", { name: "Start export" }).click();
    const button = page.getByRole("button", { name: /^Download products-\d{4}-\d{2}-\d{2}\.csv$/ });
    await expect(button).toBeVisible({ timeout: JOB_TIMEOUT });
    const download = page.waitForEvent("download");
    await button.click();
    expect((await download).suggestedFilename()).toMatch(/^products-.*\.csv$/);
  });
});

test.describe("reports (spec §6.12)", () => {
  test("filters by date range, shows KPIs, the sales chart with its table, and downloads CSV", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Last 30 days" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Net sales").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Net sales per day/ })).toBeVisible();

    await page.getByRole("button", { name: "Last 90 days" }).click();
    await expect(page).toHaveURL(/range=90d/);
    await expect(page.getByText(/grouped by week/)).toBeVisible();

    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("From", { exact: true }).fill("2026-01-01");
    await page.getByLabel("To", { exact: true }).fill("2026-01-14");
    await page.getByRole("button", { name: "Apply range" }).click();
    await expect(page).toHaveURL(/range=custom&from=2026-01-01&to=2026-01-14/);

    await page.getByRole("button", { name: "Orders", exact: true }).click();
    await expect(page.getByRole("img", { name: /Orders per day/ })).toBeVisible();
    await page.getByRole("button", { name: "Show table" }).click();
    await expect(page.getByRole("table", { name: "Sales per day" })).toBeVisible();

    const sales = page.getByRole("region", { name: "Sales over time" });
    const download = page.waitForEvent("download");
    await sales.getByRole("button", { name: "Download CSV" }).click();
    expect((await download).suggestedFilename()).toBe("sales-2026-01-01-to-2026-01-14.csv");

    await expect(page.getByRole("heading", { name: "Top products" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Promotions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  });
});
