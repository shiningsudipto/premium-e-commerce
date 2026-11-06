import { expect, test } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 1 exit criteria: a shopper browses, adds to the bag and checks out as a guest; the
// order shows up in the back office, where staff fulfil it. Uses whatever in-stock product
// the API lists first, so it runs against any seeded store.

const API = process.env.API_URL ?? "http://localhost:4000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";

test.describe.configure({ mode: "serial" });

let orderNumber = "";

test("a guest browses, adds to the bag and checks out", async ({ browser }) => {
  const res = await fetch(`${API}/v1/store/products?inStock=true&pageSize=1&facets=false`);
  expect(res.ok, "the API lists products").toBe(true);
  const listing = (await res.json()) as { items: { handle: string; title: string }[] };
  test.skip(!listing.items.length, "no in-stock products in this store");
  const product = listing.items[0]!;

  // a fresh context: the shopper isn't the signed-in Owner
  const context = await browser.newContext();
  const page = await context.newPage();

  // browse: all products → product page
  await page.goto(`/${MARKET}/products`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto(`/${MARKET}/products/${product.handle}`);
  await expect(page.getByRole("heading", { level: 1, name: product.title })).toBeVisible();
  await expect(page.getByTestId("stock-badge")).toBeVisible();

  // add to bag: the drawer opens with the line
  await page.getByTestId("add-to-bag").click();
  const drawer = page.getByTestId("bag-drawer");
  await expect(drawer.getByTestId("bag-line")).toHaveCount(1);
  await drawer.getByRole("link", { name: "Check out" }).click();

  // checkout: contact and address → delivery method → payment → place order
  await expect(page.getByTestId("details-form")).toBeVisible();
  const email = `e2e-shopper+${Date.now()}@example.com`;
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "First name" }).fill("E2E");
  await page.getByRole("textbox", { name: "Last name" }).fill("Shopper");
  await page.getByRole("textbox", { name: "Address", exact: true }).fill("12 Road 4, Dhanmondi");
  await page.getByRole("textbox", { name: "City" }).fill("Dhaka");
  await page.getByRole("textbox", { name: "Phone" }).fill("+880 1711 000000");
  await page.getByTestId("save-details").click();
  await expect(page.getByTestId("details-summary")).toContainText(email);

  await page.getByRole("radio").first().check();
  await expect(page.getByTestId("place-order")).toBeEnabled();
  await page.getByTestId("place-order").click();

  // confirmation
  await expect(page.getByTestId("order-confirmation")).toBeVisible();
  orderNumber = (await page.getByTestId("order-number").innerText()).trim();
  expect(orderNumber).not.toBe("");

  // the bag is empty again
  await page.goto(`/${MARKET}/cart`);
  await expect(page.getByRole("heading", { name: "Your bag is empty" })).toBeVisible();
  await context.close();
});

test.describe("back office", () => {
  test.use({ storageState: OWNER_STATE });

  test("the order is in the admin and staff fulfil it", async ({ page }) => {
    test.skip(!orderNumber, "no order was placed");
    await page.goto("/admin/orders");
    await page.getByRole("link", { name: orderNumber }).first().click();
    await expect(page.getByRole("heading", { name: new RegExp(orderNumber) })).toBeVisible();

    await page.getByRole("button", { name: "Fulfill" }).click();
    await page.getByRole("button", { name: "Create fulfillment" }).click();
    await expect(page.getByText("Fulfilled", { exact: true }).first()).toBeVisible();
  });
});
