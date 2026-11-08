import { expect, test } from "@playwright/test";

// Wishlists (B-Phase 2): the heart saves to the customer's default list, the account page manages
// lists, and a shared link shows the list read-only to anyone until sharing is turned off.
// Creates one customer account (e2e+…@example.com) per run in the API's database.

const API = process.env.API_URL ?? "http://localhost:4000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
});

test("hearts, lists and sharing", async ({ page, browser }) => {
  const res = await fetch(`${API}/v1/store/products?inStock=true&pageSize=1&facets=false`);
  const listing = (await res.json()) as { items: { handle: string; title: string }[] };
  test.skip(!listing.items.length, "no in-stock products in this store");
  const product = listing.items[0]!;

  // signed out: the heart asks the shopper to sign in and comes back
  await page.goto(`/${MARKET}/products/${product.handle}`);
  await page
    .locator(".buy-row")
    .getByRole("button", { name: `Save ${product.title} to your wishlist` })
    .click();
  await expect(page).toHaveURL(/\/account\/sign-in\?next=/);

  await page.goto(`/${MARKET}/account/register`);
  const form = page.getByTestId("register-form");
  await form.getByRole("textbox", { name: "First name" }).fill("Wish");
  await form.getByRole("textbox", { name: "Email" }).fill(`e2e+wish-${Date.now().toString(36)}@example.com`);
  await form.getByLabel("Password").fill("correct horse battery staple");
  await form.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL(/\/account$/);

  // signed in: the heart saves and shows it
  await page.goto(`/${MARKET}/products/${product.handle}`);
  const heart = page.locator(".buy-row").getByTestId("heart");
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().includes("/wishlists/saved/"));
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  expect((await saved).ok()).toBe(true);
  // the product cards on the page agree after a reload
  await page.reload();
  await expect(page.locator(".buy-row").getByTestId("heart")).toHaveAttribute("aria-pressed", "true");

  // the account page lists it in the default list
  await page.goto(`/${MARKET}/account/wishlists`);
  await expect(page.getByRole("button", { name: /Saved items/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("wish-item")).toHaveCount(1);
  await expect(page.getByTestId("wish-item").getByRole("link", { name: product.title })).toBeVisible();

  // share it, and open the link as someone else
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const link = await page.getByTestId("share-link").inputValue();
  expect(link).toContain(`/${MARKET}/wishlists/shared/`);
  const other = await browser.newContext();
  const visitor = await other.newPage();
  await visitor.goto(link);
  await expect(visitor.getByRole("heading", { level: 1, name: "Saved items" })).toBeVisible();
  await expect(visitor.getByRole("link", { name: product.title })).toBeVisible();

  // stop sharing: the old link stops working
  await page.getByRole("button", { name: "Stop sharing" }).click();
  await expect(page.getByTestId("share-link")).toHaveCount(0);
  await visitor.goto(link);
  await expect(visitor.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(visitor.getByRole("link", { name: product.title })).toHaveCount(0);
  await other.close();

  // a second list, then remove the item from the first
  await page.getByRole("textbox", { name: "New wishlist" }).fill("Gifts");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByRole("button", { name: /Gifts/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Saved items/ }).click();
  await page
    .getByTestId("wish-item")
    .getByRole("button", { name: new RegExp(`^Remove ${product.title}`) })
    .click();
  await expect(page.getByTestId("wish-item")).toHaveCount(0);
});
