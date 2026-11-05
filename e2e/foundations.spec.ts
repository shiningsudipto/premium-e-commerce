import { expect, test } from "@playwright/test";

// B-Phase 0 exit criteria: the storefront renders under /{locale}-{market}/ with the theme's
// tokens and the market's flags, and the BFF keeps the API behind it.

test("visitors without a market prefix are sent to their market", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en-bd$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("store-name")).toContainText("Welcome to");
});

test("the active theme's tokens drive the page", async ({ page }) => {
  await page.goto("/en-bd");
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
  );
  expect(primary).toBe("#1f3a2e");
  const footerBg = await page.locator("footer").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(footerBg).toBe("rgb(242, 237, 228)"); // --color-secondary #f2ede4
});

test("the chosen locale is remembered and falls back to English for untranslated text", async ({ page }) => {
  await page.goto("/bn-bd");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByTestId("store-name")).toContainText("স্বাগতম");
  await expect(page.getByText("Our full catalog is on its way.")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/bn-bd$/);
});

test("keyboard users can skip straight to the content", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard navigation");
  await page.goto("/en-bd");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("unknown pages show the not-found page inside the shop and aren't indexed", async ({ page }) => {
  await page.goto("/en-bd/no/such/page");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await page.getByRole("link", { name: "Back to the home page" }).click();
  await expect(page).toHaveURL(/\/en-bd$/);
});

test("the BFF serves storefront APIs and refuses the rest", async ({ request }) => {
  const config = await request.get("/api/bff/v1/store/config");
  expect(config.ok()).toBe(true);
  expect(await config.json()).toMatchObject({ market: { handle: "bd", currency: "BDT" } });
  expect((await request.get("/api/bff/v1/admin/orders")).status()).toBe(404);
  const crossSite = await request.post("/api/bff/v1/store/carts", {
    headers: { origin: "https://evil.example" },
    data: {},
  });
  expect(crossSite.status()).toBe(403);
  const unsigned = await request.post("/api/revalidate", { data: { tags: ["config"] } });
  expect(unsigned.status()).toBe(401);
});
