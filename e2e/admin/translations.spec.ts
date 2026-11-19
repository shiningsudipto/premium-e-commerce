import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 3 admin: content translations. The Owner translates a product's title into Bangla in the
// translations editor, the Bangla storefront shows it while the English one keeps the English
// title, and removing the translation brings the English back. A translation the product already
// had is put back afterwards.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36).toUpperCase();
const banglaTitle = `চামড়ার ব্যাগ ${run}`;

type Product = { id: string; handle: string; title: string };

let admin: APIRequestContext;
let product: Product | undefined;
let previous: Record<string, unknown> | null = null;

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
  // a product the Bangladesh storefront shows
  const res = await fetch(`${API}/v1/store/products?inStock=true&pageSize=1&facets=false`, {
    headers: { "x-market": "bd", "x-locale": "en" },
  });
  product = ((await res.json()) as { items: Product[] }).items[0];
  if (!product) return;
  // start from no translation; any existing one is restored afterwards
  const current = await admin.get(`/v1/admin/translations/PRODUCT/${product.id}/bn`);
  expect(current.ok(), await current.text()).toBe(true);
  previous = ((await current.json()) as { translation: Record<string, unknown> | null }).translation;
  if (previous) await admin.delete(`/v1/admin/translations/PRODUCT/${product.id}/bn`);
});

test.afterAll(async () => {
  if (product) {
    if (previous) await admin.put(`/v1/admin/translations/PRODUCT/${product.id}/bn`, { data: { fields: previous } });
    else await admin.delete(`/v1/admin/translations/PRODUCT/${product.id}/bn`);
  }
  await admin.dispose();
});

// the storefront refreshes its cached pages after a translation changes, so allow a few reloads
async function expectTitle(page: Page, path: string, title: string) {
  await expect(async () => {
    await page.goto(`${STOREFRONT}${path}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

test("translate a product title into Bangla, see it on the storefront, then remove it", async ({ page }) => {
  test.skip(!product, "no in-stock products in this store");
  const { id, handle, title } = product!;

  // the list finds the product as missing
  await page.goto(`/admin/translations?type=PRODUCT&locale=bn&status=missing&q=${encodeURIComponent(handle)}`);
  await expect(page.getByRole("heading", { name: "Translations" })).toBeVisible();
  await expect(page.getByText("Language:")).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: handle });
  await expect(row.getByText("Missing")).toBeVisible();
  await row.getByRole("link", { name: title }).click();

  // the editor: English on the left, a Bangla input on the right
  await expect(page).toHaveURL(new RegExp(`/admin/translations/PRODUCT/${id}\\?locale=bn`));
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Title, Bangla", exact: true });
  await expect(input).toHaveAttribute("lang", "bn");
  await input.fill(banglaTitle);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("region", { name: /Notifications/ }).getByText("Translation saved")).toBeVisible();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await expect(input).toHaveValue(banglaTitle);

  // the Bangla storefront shows the translation; the English one doesn't
  await expectTitle(page, `/bn-bd/products/${handle}`, banglaTitle);
  await expectTitle(page, `/en-bd/products/${handle}`, title);

  // remove it: the Bangla storefront falls back to English
  await page.goto(`/admin/translations/PRODUCT/${id}?locale=bn`);
  await page.getByRole("button", { name: "Remove translation" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove translation" }).click();
  await expect(page.getByText("Translation removed")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Title, Bangla", exact: true })).toHaveValue("");
  await expectTitle(page, `/bn-bd/products/${handle}`, title);
});
