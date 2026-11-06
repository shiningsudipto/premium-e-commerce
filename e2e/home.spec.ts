import { expect, test } from "@playwright/test";

// The home page (Premium Touch design): every block renders at both design widths, and the
// interactive parts work with mouse, keyboard and screen readers.

const SECTIONS = [
  "Made slowly. Carried for decades.",
  "Four things, done properly.",
  "Pieces people keep coming back for.",
  "The gift set: wallet and belt, boxed.",
  "Seventy-two hours for one bag. A lifetime to wear it in.",
  "From one bag to a workshop of twelve.",
  "A little extra, on the house.",
  "Carried across the country.",
  "15% off travel pieces, for a few days only.",
  "Before you order.",
  "Join the workshop letter.",
];

test.beforeEach(async ({ page }) => {
  await page.goto("/en-bd");
});

test("renders every block in the design's order", async ({ page }) => {
  // sections stream in; read the headings once the last one has arrived
  await expect(page.getByRole("heading", { name: SECTIONS.at(-1) })).toBeVisible();
  const headings = await page.locator("main h1, main h2").allTextContents();
  const order = SECTIONS.map((title) => headings.findIndex((h) => h.replace(/\s+/g, " ").trim() === title));
  expect(order.every((i) => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  // the featured product comes from the catalog
  await expect(page.locator("#spot-title")).toHaveText("Leather Weekender Bag");
  await expect(page.locator("#products li.card").first()).toBeVisible();
});

test("the product tabs switch lists with the mouse and the arrow keys", async ({ page }) => {
  const best = page.getByRole("tab", { name: "Bestsellers" });
  const fresh = page.getByRole("tab", { name: "New arrivals" });
  await expect(best).toHaveAttribute("aria-selected", "true");
  await fresh.click();
  await expect(fresh).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await fresh.press("ArrowRight");
  await expect(best).toBeFocused();
  await expect(best).toHaveAttribute("aria-selected", "true");
  await best.press("End");
  await expect(fresh).toBeFocused();
});

test("FAQ answers open and close", async ({ page }) => {
  const first = page.locator(".faq__item").first();
  await expect(first).toHaveAttribute("open", "");
  const second = page.locator(".faq__item").nth(1);
  await second.locator("summary").click();
  await expect(second).toHaveAttribute("open", "");
  await expect(second.locator(".faq__answer")).toBeVisible();
});

test("the promo code can be copied", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy promo code EID15" }).click();
  await expect(page.locator(".code-chip__btn")).toHaveText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("EID15");
});

test("the countdown shows the time left", async ({ page }) => {
  await expect(page.locator(".timer__num").first()).toHaveText(/^\d{2}$/);
  await expect(page.getByRole("timer")).toContainText(/Offer ends in \d+ days/);
});

test("the newsletter form explains a mistyped address", async ({ page }) => {
  const email = page.getByLabel("Email address");
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText("Enter an email address like name@example.com.")).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
});

test("choosing a colour in the spotlight updates the label and the photo", async ({ page }) => {
  const picker = page.getByRole("group", { name: /Colour/ });
  await picker.getByText("Black").click({ force: true });
  await expect(picker).toContainText("Colour: Black");
  await expect(page.locator(".gallery__main [role=img]")).toHaveAttribute("aria-label", /in black, front view/);
  await page.getByRole("button", { name: "Show image 3 of 3: stitching detail" }).click();
  await expect(page.locator(".gallery__main [role=img]")).toHaveAttribute("aria-label", /stitching detail/);
});

test("adding the featured piece to the bag updates the header count", async ({ page }) => {
  const bag = page.getByTestId("bag-link");
  await expect(bag).toHaveAccessibleName(/Bag, empty/);
  await page
    .locator("#spotlight")
    .getByRole("button", { name: /Add to bag/ })
    .click();
  // the bag drawer opens with the piece in it; closing it returns to the page
  const drawer = page.getByTestId("bag-drawer");
  await expect(drawer.getByTestId("bag-line")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(bag).toHaveAccessibleName(/Bag, 1 item/);
  await expect(bag.locator(".cart-count")).toHaveText("1");
});

test("the header condenses once the page scrolls", async ({ page }) => {
  const header = page.locator("header.site-header");
  await expect(header).not.toHaveClass(/is-condensed/);
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveClass(/is-condensed/);
});

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile layout");

  test("the menu opens as a drawer and closes with Escape", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("collections swipe sideways instead of overflowing the page", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const row = page.locator(".collections__grid");
    expect(await row.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
  });
});
