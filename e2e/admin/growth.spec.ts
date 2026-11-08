import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 2 storefront: promotion codes with their explanations, and CMS pages (hand-picked
// products, per-visitor targeting, draft preview through Draft Mode). Promotions and pages are
// created through the admin API with the signed-in Owner's session, uniquely named, and archived
// afterwards.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";
const run = Date.now().toString(36).toUpperCase();

let admin: APIRequestContext;
const promotions: string[] = [];
const pages: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // the Owner's cookie session; writes carry the storefront's origin like the admin app's do
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  for (const id of promotions) await admin.post(`/v1/admin/promotions/${id}/status`, { data: { status: "ARCHIVED" } });
  for (const id of pages) await admin.post(`/v1/admin/pages/${id}/unpublish`, { data: { status: "ARCHIVED" } });
  await admin.dispose();
});

async function inStockProduct() {
  const res = await fetch(`${API}/v1/store/products?inStock=true&pageSize=1&facets=false`, {
    headers: { "x-market": MARKET.split("-")[1]!, "x-locale": MARKET.split("-")[0]! },
  });
  const listing = (await res.json()) as { items: { id: string; handle: string; title: string }[] };
  return listing.items[0];
}

async function codePromotion(name: string, code: string, extra: Record<string, unknown>) {
  const res = await admin.post("/v1/admin/promotions", {
    data: { name: `${name} ${run}`, type: "CODE", codes: [code], ...extra },
  });
  expect(res.status(), await res.text()).toBe(201);
  const promo = (await res.json()) as { id: string };
  promotions.push(promo.id);
  const active = await admin.post(`/v1/admin/promotions/${promo.id}/status`, { data: { status: "ACTIVE" } });
  expect(active.ok()).toBe(true);
}

test("promo codes: unmet conditions are explained, a valid code shows its saving, the limit is enforced", async ({
  browser,
}) => {
  const product = await inStockProduct();
  test.skip(!product, "no in-stock products in this store");
  const spendMore = `BIG${run}`;
  const tenOff = `TEN${run}`;
  await codePromotion("Spend more", spendMore, {
    conditions: { type: "subtotal", min: 99_999_999 },
    actions: [{ type: "percent_off", percent: 10, target: "order" }],
  });
  await codePromotion("Ten off", tenOff, { actions: [{ type: "percent_off", percent: 10, target: "order" }] });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/${MARKET}/products/${product!.handle}`);
  await page.getByTestId("add-to-bag").click();
  await expect(page.getByTestId("bag-drawer").getByTestId("bag-line")).toHaveCount(1);
  await page.goto(`/${MARKET}/cart`);

  const promo = page.getByTestId("promo-codes");
  const field = promo.getByRole("textbox", { name: "Promo code" });

  // not met yet: stays on the bag with what to do about it
  await field.fill(spendMore.toLowerCase());
  await promo.getByRole("button", { name: "Apply" }).click();
  await expect(promo.locator(".promo__tag", { hasText: spendMore })).toBeVisible();
  await expect(promo.getByText(/^Spend .+ or more to use this code\.$/)).toBeVisible();

  // one code per order by default: the API's own message
  await field.fill(tenOff);
  await promo.getByRole("button", { name: "Apply" }).click();
  await expect(promo.getByRole("alert")).toHaveText(/one code/i);

  // swap: remove the unmet one, apply the valid one
  await promo.getByRole("button", { name: `Remove ${spendMore}` }).click();
  await expect(promo.locator(".promo__tag", { hasText: spendMore })).toHaveCount(0);
  await field.fill(tenOff);
  await promo.getByRole("button", { name: "Apply" }).click();
  await expect(promo.getByText(/^You save /)).toBeVisible();
  await expect(page.locator(".summary").getByText("Discount")).toBeVisible();

  // unknown codes are refused outright
  await promo.getByRole("button", { name: `Remove ${tenOff}` }).click();
  await field.fill(`NOPE${run}`);
  await promo.getByRole("button", { name: "Apply" }).click();
  await expect(promo.getByRole("alert")).toHaveText(/isn't valid/i);
  await context.close();
});

test("CMS pages: hand-picked products, per-visitor blocks and a draft preview via Draft Mode", async ({ browser }) => {
  const product = await inStockProduct();
  test.skip(!product, "no in-stock products in this store");
  const handle = `e2e-${run.toLowerCase()}`;
  const blocks = [
    { type: "hero", props: { heading: `Live heading ${run}`, align: "center" } },
    {
      type: "product_grid",
      props: { title: "Picked for you", source: "products", productIds: [product!.id], limit: 4 },
    },
    { type: "hero", props: { heading: "Members only", align: "left" }, settings: { audience: { loggedIn: true } } },
    { type: "hero", props: { heading: "Welcome, guest", align: "left" }, settings: { audience: { loggedIn: false } } },
    { type: "video", props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } },
    { type: "countdown", props: { heading: "Offer ends", endsAt: "2099-01-01T00:00:00.000Z", hideWhenDone: true } },
  ];
  const created = await admin.post("/v1/admin/pages", { data: { handle, title: `E2E ${run}`, blocks, seo: {} } });
  expect(created.status(), await created.text()).toBe(201);
  const pageRow = (await created.json()) as { id: string; version: number };
  pages.push(pageRow.id);
  expect((await admin.post(`/v1/admin/pages/${pageRow.id}/publish`, { data: {} })).ok()).toBe(true);

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/${MARKET}/pages/${handle}`);
  await expect(page.getByRole("heading", { name: `Live heading ${run}` })).toBeVisible();
  await expect(page.getByRole("link", { name: product!.title }).first()).toBeVisible();
  // a visitor who isn't signed in sees the guest block, not the members' one
  await expect(page.getByRole("heading", { name: "Welcome, guest" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Members only" })).toHaveCount(0);
  await expect(page.locator("iframe[src^='https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']")).toHaveCount(1);
  await expect(page.getByRole("timer")).toBeVisible();

  // change the draft only: shoppers keep seeing the live version
  const current = (await (await admin.get(`/v1/admin/pages/${pageRow.id}`)).json()) as {
    draft?: { version: number };
    version?: number;
  };
  const version = current.draft?.version ?? current.version ?? pageRow.version;
  const saved = await admin.put(`/v1/admin/pages/${pageRow.id}`, {
    data: {
      handle,
      title: `E2E ${run}`,
      blocks: [{ type: "hero", props: { heading: `Draft heading ${run}` } }],
      seo: {},
      version,
    },
  });
  expect(saved.ok(), await saved.text()).toBe(true);

  // a made-up preview link is refused and doesn't switch Draft Mode on
  const bogus = await page.request.get(`/api/preview?handle=${handle}&token=${"x".repeat(40)}&market=${MARKET}`, {
    maxRedirects: 0,
  });
  expect(bogus.status()).toBe(404);

  const link = (await (
    await admin.post(`/v1/admin/pages/${pageRow.id}/preview-link`, { data: { hours: 1 } })
  ).json()) as {
    token: string;
  };
  await page.goto(`/api/preview?handle=${handle}&token=${encodeURIComponent(link.token)}&market=${MARKET}`);
  await expect(page).toHaveURL(new RegExp(`/${MARKET}/pages/${handle}$`));
  await expect(page.getByRole("status").filter({ hasText: "Preview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `Draft heading ${run}` })).toBeVisible();

  // another visitor still gets the published page
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(`/${MARKET}/pages/${handle}`);
  await expect(otherPage.getByRole("heading", { name: `Live heading ${run}` })).toBeVisible();
  await other.close();

  // leaving the preview goes back to the live page
  await page.getByRole("link", { name: "Leave preview" }).click();
  await expect(page).toHaveURL(new RegExp(`/${MARKET}/pages/${handle}$`));
  await expect(page.getByRole("status").filter({ hasText: "Preview" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: `Live heading ${run}` })).toBeVisible();
  await context.close();
});
