import { expect, test } from "@playwright/test";

// B-Phase 3 recommendation blocks: product page shelves (complete the look, frequently bought
// together), "Recently viewed" kept in the browser (product page and home), and "You may also like"
// on the bag page. Reads the catalog only; the bag test starts a guest bag.

const API = process.env.API_URL ?? "http://localhost:4000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";
const headers = { "x-market": MARKET.split("-")[1]!, "x-locale": MARKET.split("-")[0]! };

type Card = { id: string; handle: string; title: string };

async function products(count: number) {
  const res = await fetch(`${API}/v1/store/products?inStock=true&pageSize=${count}&facets=false`, { headers });
  return ((await res.json()) as { items: Card[] }).items;
}

async function recommended(query: string) {
  const res = await fetch(`${API}/v1/store/recommendations?${query}`, { headers });
  const body = (await res.json()) as { items?: Card[] };
  if (!res.ok || !body.items)
    throw new Error(`recommendations ${query} → ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.items;
}

test("recently viewed follows the shopper from product to product and onto the home page", async ({ page }) => {
  const [first, second] = await products(2);
  test.skip(!second, "needs two in-stock products");

  // nothing viewed yet: no strip
  await page.goto(`/${MARKET}/products/${first!.handle}`);
  await expect(page.getByTestId("add-to-bag")).toBeVisible();
  await expect(page.getByTestId("recently-viewed")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("pe_recently_viewed"))).toContain(first!.id);

  // the second product shows the first, not itself
  await page.goto(`/${MARKET}/products/${second!.handle}`);
  const strip = page.getByTestId("recently-viewed");
  await expect(strip.getByRole("heading", { name: "Recently viewed" })).toBeVisible();
  await expect(strip.getByRole("link", { name: first!.title })).toBeVisible();
  await expect(strip.getByRole("link", { name: second!.title })).toHaveCount(0);

  // home: both, newest first
  await page.goto(`/${MARKET}`);
  const home = page.getByTestId("recently-viewed");
  await expect(home.locator(".card__link")).toHaveText([second!.title, first!.title]);
});

test("blocked storage doesn't break the product page", async ({ page }) => {
  const [product] = await products(1);
  test.skip(!product, "no in-stock products");
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await page.goto(`/${MARKET}/products/${product!.handle}`);
  await expect(page.getByTestId("add-to-bag")).toBeVisible();
  await expect(page.getByTestId("recently-viewed")).toHaveCount(0);
});

test("product page shows complete-the-look and bought-together shelves when there are picks", async ({ page }) => {
  const [product] = await products(1);
  test.skip(!product, "no in-stock products");
  const [related, look, together] = await Promise.all([
    recommended(`placement=related&productId=${product!.id}&limit=4`),
    recommended(`placement=complete_the_look&productId=${product!.id}&limit=8`),
    recommended(`placement=frequently_bought_together&productId=${product!.id}&limit=8`),
  ]);
  const shown = new Set(related.map((p) => p.id));
  const freshLook = look.filter((p) => !shown.has(p.id)).slice(0, 4);
  freshLook.forEach((p) => shown.add(p.id));
  const freshTogether = together.filter((p) => !shown.has(p.id));

  await page.goto(`/${MARKET}/products/${product!.handle}`);
  await expect(page.locator("#related-title")).toBeVisible();
  const lookShelf = page.getByTestId("recs-complete_the_look");
  const togetherShelf = page.getByTestId("recs-frequently_bought_together");
  if (freshLook.length) {
    await expect(lookShelf.getByRole("heading", { name: "Complete the look" })).toBeVisible();
    await expect(lookShelf.locator(".card")).toHaveCount(freshLook.length);
  } else {
    await expect(lookShelf).toHaveCount(0);
  }
  if (freshTogether.length) {
    await expect(togetherShelf.getByRole("heading", { name: "Frequently bought together" })).toBeVisible();
  } else {
    await expect(togetherShelf).toHaveCount(0);
  }
});

test("the bag page suggests more pieces from what's in the bag", async ({ page }) => {
  const [product] = await products(1);
  test.skip(!product, "no in-stock products");
  const picks = await recommended(`placement=cart&productIds=${product!.id}&limit=4`);

  await page.goto(`/${MARKET}/products/${product!.handle}`);
  await page.getByTestId("add-to-bag").click();
  await expect(page.getByTestId("bag-drawer").getByTestId("bag-line")).toHaveCount(1);

  const fetched = page.waitForResponse((r) => r.url().includes("/v1/store/recommendations?placement=cart"));
  await page.goto(`/${MARKET}/cart`);
  const res = await fetched;
  expect(res.url()).toContain(`productIds=${product!.id}`);
  const section = page.getByTestId("cart-recommendations");
  if (picks.length) {
    await expect(section.getByRole("heading", { name: "You may also like" })).toBeVisible();
    await expect(section.locator(".card")).toHaveCount(picks.length);
    await expect(section.getByRole("link", { name: product!.title, exact: true })).toHaveCount(0);
  } else {
    await expect(section).toHaveCount(0);
  }
});
