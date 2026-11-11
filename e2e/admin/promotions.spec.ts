import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 2 admin: promotions. The Owner builds a code promotion in the builder (a nested
// condition group and a percentage action), generates and disables codes, tests the draft in
// the simulator against a real product, then activates and archives it. Everything is named
// with this run's id and archived afterwards (promotions have no delete endpoint).

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36).toUpperCase();
const name = `E2E promo ${run}`;

let admin: APIRequestContext;
const promotions: string[] = [];

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  for (const id of promotions) await admin.post(`/v1/admin/promotions/${id}/status`, { data: { status: "ARCHIVED" } });
  await admin.dispose();
});

// a product with a variant priced in the default market, for the simulator
async function pricedProduct() {
  const res = await admin.get("/v1/admin/products?status=ACTIVE&limit=10");
  const { items } = (await res.json()) as { items: { id: string; title: string; variantCount: number }[] };
  return items.find((p) => p.variantCount > 0);
}

// adds the product's first variant to the sample cart at a known price
async function addToSampleCart(page: Page, title: string) {
  await page.getByLabel("Find a product to add").fill(title.slice(0, 20));
  await page.getByRole("listitem").getByRole("button").filter({ hasText: title }).first().click();
  await page
    .getByRole("group", { name: /^Variants of/ })
    .getByRole("button", { name: /^Add / })
    .first()
    .click();
  await page
    .getByLabel(/^Unit price of/)
    .first()
    .fill("1000");
}

test("build, code, simulate and publish a promotion", async ({ page }) => {
  await page.goto("/admin/promotions/new");
  await expect(page.getByRole("heading", { name: "New promotion" })).toBeVisible();

  await page.getByLabel("Name").fill(name);
  await page.getByRole("combobox", { name: "Type", exact: true }).click();
  await page.getByRole("option", { name: /^Code/ }).click();
  await page.getByLabel("Codes (optional)").fill(`FIRST${run}`);

  // conditions: subtotal at least 1, and a nested "any" group with an item count
  await page.getByRole("combobox", { name: "Add a condition to all conditions" }).click();
  await page.getByRole("option", { name: /Cart subtotal/ }).click();
  await page
    .getByLabel(/^At least/)
    .first()
    .fill("1");
  await page.getByRole("button", { name: "Add group" }).click();
  await page.getByRole("combobox", { name: "Add a condition to group 2" }).click();
  await page.getByRole("option", { name: /Number of items/ }).click();
  await page
    .getByRole("group", { name: /Number of items/ })
    .getByLabel(/At least/)
    .fill("1");
  await expect(page.getByText(/Applies when:.*subtotal at least .* and \(at least 1 items\)/)).toBeVisible();

  // the default action is 10% off the order; make it 15%
  await page.getByLabel("Percent off", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Create draft" }).click();

  // the editor moves from /new to the saved promotion's own URL
  await expect(page).toHaveURL(/\/admin\/promotions\/(?!new$)[^/]+$/);
  const id = page.url().split("/").pop()!;
  promotions.push(id);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();

  // codes: generate five, then disable one
  await page.getByRole("tab", { name: "Codes" }).click();
  await page.getByRole("tab", { name: "Generate" }).click();
  await page.getByLabel("How many").fill("5");
  await page.getByLabel("Prefix (optional)").fill(`G${run}-`);
  await page.getByRole("button", { name: "Generate codes" }).click();
  await expect(page.getByText("5 new codes")).toBeVisible();
  await expect(page.getByRole("cell", { name: `FIRST${run}` })).toBeVisible();
  const firstRow = page.getByRole("row", { name: new RegExp(`FIRST${run}`) });
  await firstRow.getByRole("button", { name: "Disable" }).click();
  await page.getByRole("button", { name: "Disable code" }).click();
  await expect(firstRow.getByText("Disabled")).toBeVisible();

  // simulator: the draft applies with one of its active codes
  const product = await pricedProduct();
  test.skip(!product, "no active products with variants in this store");
  await page.getByRole("tab", { name: "Simulate" }).click();
  await addToSampleCart(page, product!.title);
  const codes = await admin.get(`/v1/admin/promotions/${id}/codes?q=G${run}&limit=1`);
  const [code] = ((await codes.json()) as { items: { code: string }[] }).items;
  await page.getByLabel("Promo codes").fill(code!.code);
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByText("This promotion applied to the sample cart.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Simulation result" }).getByRole("link", { name })).toBeVisible();

  // a disabled code is explained
  await page.getByLabel("Promo codes").fill(`FIRST${run}`);
  await page.getByRole("button", { name: "Run simulation" }).click();
  await expect(page.getByText(/This promotion didn't apply: not active/)).toBeVisible();

  // status: activate, then archive
  await page.getByRole("button", { name: "Activate", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Archive promotion" }).click();
  await expect(page.getByText("Archived", { exact: true }).first()).toBeVisible();

  // the list finds it by name
  await page.goto("/admin/promotions");
  await page.getByRole("textbox", { name: "Search" }).fill(run);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("the store-wide simulator explains an unknown code", async ({ page }) => {
  const product = await pricedProduct();
  test.skip(!product, "no active products with variants in this store");
  await page.goto("/admin/promotions/simulator");
  await expect(page.getByRole("heading", { name: "Promotion simulator" })).toBeVisible();
  await addToSampleCart(page, product!.title);
  await page.getByLabel("Promo codes").fill(`NOPE${run}`);
  await page.getByRole("button", { name: "Run simulation" }).click();
  // the "Codes entered" list says why (the raw engine output below also contains the code, collapsed)
  await expect(page.getByRole("listitem").filter({ hasText: `NOPE${run}` })).toContainText("Code not found");
});
