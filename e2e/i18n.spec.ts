import { expect, test } from "@playwright/test";

// The storefront is bilingual (English and Bangla). The header's language switcher links to the
// same page, query included, in the other language; the choice changes <html lang> and the UI text.

test("the language switcher keeps the page and switches the UI between English and Bangla", async ({ page }) => {
  await page.goto("/en-bd/search?q=bag");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  const english = page.locator("header").getByRole("navigation", { name: "Language" });
  const toBangla = english.getByRole("link", { name: "বাংলা" });
  await expect(toBangla).toHaveAttribute("hreflang", "bn");
  await expect(toBangla).toHaveAttribute("lang", "bn");
  await expect(toBangla).toHaveAttribute("href", "/bn-bd/search?q=bag");
  // the current language (hidden in the header on small screens, where only the other one shows)
  await expect(english.getByRole("link", { name: "English", includeHidden: true })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await toBangla.click();
  await expect(page).toHaveURL(/\/bn-bd\/search\?q=bag$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("link", { name: "মূল বিষয়বস্তুতে যান" })).toBeAttached();
  await expect(page.getByRole("list", { name: "পেমেন্টের মাধ্যম" })).toBeAttached();
  // the footer names the language and currency in Bangla
  await expect(page.locator("footer")).toContainText("বাংলা · ৳ BDT");

  const bangla = page.locator("header").getByRole("navigation", { name: "ভাষা" });
  await expect(bangla.getByRole("link", { name: "বাংলা", includeHidden: true })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await bangla.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en-bd\/search\?q=bag$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeAttached();
});

test("before the switcher hydrates (or without JavaScript) its links still keep the page", async ({
  request,
  baseURL,
}) => {
  const res = await request.get("/api/language?locale=bn", {
    headers: { referer: `${baseURL}/en-bd/search?q=bag` },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(
    new URL(res.headers()["location"]!, baseURL).pathname + new URL(res.headers()["location"]!, baseURL).search,
  ).toBe("/bn-bd/search?q=bag");
  // another site's page, or none: the language's home page
  const away = await request.get("/api/language?locale=en", {
    headers: { referer: "https://elsewhere.test/bn-bd/products/x" },
    maxRedirects: 0,
  });
  expect(new URL(away.headers()["location"]!, baseURL).pathname).toBe("/en-bd");
});

test("the footer offers the same page in the other language", async ({ page }) => {
  await page.goto("/bn-bd/products");
  const footer = page.locator("footer").getByRole("navigation", { name: "ভাষা" });
  await expect(footer.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en-bd/products");
  await expect(footer.getByRole("link", { name: "বাংলা" })).toHaveAttribute("aria-current", "true");
});

test("the Bangla home page has Bangla editorial content and block labels", async ({ page }) => {
  await page.goto("/bn-bd");
  await expect(page.getByRole("link", { name: "কালেকশন দেখুন" })).toBeVisible();
  await expect(page.getByText("৳ 5,000-এর বেশি অর্ডারে ফ্রি ডেলিভারি")).toBeAttached();
  await expect(page.getByRole("button", { name: "প্রোমো কোড EID15 কপি করুন" })).toBeAttached();
  await expect(page.getByLabel("ইমেইল ঠিকানা")).toBeAttached();
  await expect(page.locator("footer")).toContainText("বাংলাদেশে হাতে তৈরি।");
});
