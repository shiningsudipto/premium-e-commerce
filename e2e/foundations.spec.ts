import { expect, test } from "@playwright/test";

// B-Phase 0 exit criteria: the storefront renders under /{locale}-{market}/ with the theme's
// tokens and the market's flags, and the BFF keeps the API behind it.

test("visitors without a market prefix are sent to their market", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en-bd$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Made slowly. Carried for decades.");
});

test("the active theme's tokens drive the page", async ({ page }) => {
  await page.goto("/en-bd");
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
  );
  expect(primary).toBe("#4a002a");
  // the primary call to action is painted with the theme's primary colour
  const cta = page.getByRole("link", { name: "Shop the collection" });
  expect(await cta.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(74, 0, 42)");
  // and headings use the self-hosted display face named by the theme
  const heading = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily);
  expect(heading).toMatch(/Fraunces/);
});

test("the chosen locale is remembered and falls back to English for untranslated text", async ({ page }) => {
  await page.goto("/bn-bd");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  // translated chrome, English where there is no translation yet
  await expect(page.getByRole("link", { name: "মূল বিষয়বস্তুতে যান" })).toBeAttached();
  await expect(page.getByRole("button", { name: "Copy promo code EID15" })).toBeAttached();
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

test("the web app exposes no API of its own besides cache revalidation", async ({ request }) => {
  // browsers talk to the Express API directly (ADR 0012)
  for (const path of ["/api/bff/v1/store/config", "/api/auth/login", "/api/admin/bff/v1/admin/flags"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const unsigned = await request.post("/api/revalidate", { data: { tags: ["config"] } });
  expect(unsigned.status()).toBe(401);
});
