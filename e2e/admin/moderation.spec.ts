import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 2 admin: the review & Q&A moderation queue and the returns workflow. Test data is made
// through the APIs (a registered shopper's review and question; a guest's order, fulfilled and paid
// by the Owner, then a return requested with the guest's token) and is uniquely named per run.
// Reviews and questions need the `reviews` / `qna` flags; when they're off the store refuses them,
// so those tests skip rather than turn flags on for everyone sharing the store.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";
const [LOCALE, MARKET_CODE] = MARKET.split("-") as [string, string];
const run = Date.now().toString(36).toUpperCase();

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

let admin: APIRequestContext;
const cleanup: { reviews: string[]; questions: string[] } = { reviews: [], questions: [] };

test.beforeAll(async () => {
  // the Owner's cookie session; writes carry the storefront's origin like the admin app's do
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  // nothing made here stays public on the storefront
  for (const id of cleanup.reviews)
    await admin.patch(`/v1/admin/moderation/reviews/${id}`, { data: { status: "REJECTED" } });
  for (const id of cleanup.questions)
    await admin.patch(`/v1/admin/moderation/questions/${id}`, { data: { status: "REJECTED" } });
  await admin.dispose();
});

// A storefront API call as a shopper (bearer token), in the test market.
async function store(path: string, init: { method?: string; token?: string; body?: unknown; key?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: {
      "content-type": "application/json",
      "x-market": MARKET_CODE,
      "x-locale": LOCALE,
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.key ? { "idempotency-key": init.key } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped JSON from the store API
  return { status: res.status, body: (text ? JSON.parse(text) : null) as Record<string, any> };
}

async function inStockProduct() {
  const listing = await store("/v1/store/products?inStock=true&pageSize=1&facets=false");
  const card = (listing.body.items as { handle: string }[] | undefined)?.[0];
  if (!card) return null;
  const detail = await store(`/v1/store/products/${card.handle}`);
  const variant = (detail.body.variants as { id: string; availableForSale: boolean }[]).find((v) => v.availableForSale);
  return variant
    ? { id: detail.body.id as string, handle: card.handle, title: detail.body.title as string, variantId: variant.id }
    : null;
}

async function registerShopper() {
  const res = await store("/v1/store/auth/register", {
    body: {
      email: `e2e-moderation+${run}-${Math.random().toString(36).slice(2, 7)}@example.com`,
      password: `Pw-${run}-x9!`,
      firstName: "E2E",
      lastName: "Reviewer",
    },
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body.session.accessToken as string;
}

const queueRow = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text });

test.describe("reviews & Q&A moderation", () => {
  test("a pending review is approved from the queue and gets a merchant reply", async ({ page }) => {
    const product = await inStockProduct();
    test.skip(!product, "no in-stock products in this store");
    const token = await registerShopper();
    const body = `Lovely stitching and roomy inside (${run}).`;
    const created = await store(`/v1/store/products/${product!.handle}/reviews`, {
      token,
      body: { rating: 4, title: `E2E ${run}`, body },
    });
    test.skip(created.body?.code === "FEATURE_DISABLED", "the reviews feature flag is off in this store");
    test.skip(created.body?.code === "REVIEW_NOT_ALLOWED", "reviews require a purchase in this store's settings");
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    cleanup.reviews.push(created.body.id);

    if (created.body.status === "PENDING") {
      await page.goto("/admin/reviews");
      await expect(page.getByRole("heading", { name: "Reviews & Q&A" })).toBeVisible();
      const row = queueRow(page, body);
      await expect(row).toBeVisible();
      await expect(row.getByRole("link", { name: product!.title })).toHaveAttribute(
        "href",
        `/admin/products/${product!.id}`,
      );
      await row.getByRole("button", { name: /^Approve review by / }).click();
      await expect(page.getByText("Review approved")).toBeVisible();
      await expect(queueRow(page, body)).toHaveCount(0);
    }

    // auto-approved, or approved just now: it's in the approved list, where staff reply
    await page.goto("/admin/reviews?status=APPROVED");
    const row = queueRow(page, body).first();
    await expect(row).toBeVisible();
    await expect(row.getByRole("img", { name: "4 out of 5 stars" })).toBeVisible();
    await row.getByRole("button", { name: "Show details" }).click();
    await page.getByLabel("Merchant reply").fill(`Thank you for the kind words! (${run})`);
    await page.getByRole("button", { name: "Post reply" }).click();
    await expect(page.getByText("Reply saved")).toBeVisible();

    // the reply is public once approved
    const reviews = await store(`/v1/store/products/${product!.handle}/reviews?pageSize=50`);
    const published = (reviews.body.items as { id: string; reply: string | null }[]).find(
      (r) => r.id === created.body.id,
    );
    expect(published?.reply).toBe(`Thank you for the kind words! (${run})`);
  });

  test("a question is answered from the queue, which publishes it", async ({ page }) => {
    const product = await inStockProduct();
    test.skip(!product, "no in-stock products in this store");
    const token = await registerShopper();
    const question = `Does it fit a 15-inch laptop? (${run})`;
    const asked = await store(`/v1/store/products/${product!.handle}/questions`, { token, body: { body: question } });
    test.skip(asked.body?.code === "FEATURE_DISABLED", "the qna feature flag is off in this store");
    expect(asked.status, JSON.stringify(asked.body)).toBe(201);
    cleanup.questions.push(asked.body.id);

    await page.goto("/admin/reviews?kind=questions");
    await expect(page.getByRole("tab", { name: "Questions", selected: true })).toBeVisible();
    const row = queueRow(page, question);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Show details" }).click();
    await page.getByLabel("Your answer").fill("Yes, up to 15 inches.");
    await page.getByRole("button", { name: "Post answer" }).click();
    await expect(page.getByText("Answer posted")).toBeVisible();
    await expect(queueRow(page, question)).toHaveCount(0);

    await page.goto("/admin/reviews?kind=questions&status=APPROVED");
    await expect(queueRow(page, question).first()).toBeVisible();
  });

  test("bulk reject clears selected pending reviews", async ({ page }) => {
    const product = await inStockProduct();
    test.skip(!product, "no in-stock products in this store");
    const body = `Bulk moderation check, please ignore (${run}).`;
    const created = await store(`/v1/store/products/${product!.handle}/reviews`, {
      token: await registerShopper(),
      body: { rating: 2, body },
    });
    test.skip(created.body?.code === "FEATURE_DISABLED", "the reviews feature flag is off in this store");
    test.skip(created.body?.code === "REVIEW_NOT_ALLOWED", "reviews require a purchase in this store's settings");
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    cleanup.reviews.push(created.body.id);
    test.skip(created.body.status !== "PENDING", "reviews are auto-approved in this store");

    await page.goto("/admin/reviews");
    const row = queueRow(page, body);
    await row.getByRole("checkbox", { name: "Select row" }).check();
    await page.getByRole("region", { name: "Bulk actions" }).getByRole("button", { name: "Reject selected" }).click();
    await expect(page.getByText("1 rejected")).toBeVisible();
    await expect(queueRow(page, body)).toHaveCount(0);
    await page.goto("/admin/reviews?status=REJECTED");
    await expect(queueRow(page, body).first()).toBeVisible();
  });
});

test.describe("returns", () => {
  test("a refund return goes from request to settled through the workflow", async ({ page }) => {
    const product = await inStockProduct();
    test.skip(!product, "no in-stock products in this store");

    // a guest buys one unit (manual payment)
    const guest = await store("/v1/store/auth/guest", { body: {} });
    expect(guest.status).toBe(201);
    const token = guest.body.guestToken as string;
    const cart = await store("/v1/store/carts", { token, body: {} });
    expect(cart.status, JSON.stringify(cart.body)).toBe(200);
    const cartId = cart.body.id as string;
    expect(
      (await store(`/v1/store/carts/${cartId}/lines`, { token, body: { variantId: product!.variantId, quantity: 1 } }))
        .status,
    ).toBe(200);
    const withAddress = await store(`/v1/store/carts/${cartId}`, {
      method: "PATCH",
      token,
      body: {
        email: `e2e-returns+${run}@example.com`,
        shippingAddress: {
          firstName: "E2E",
          lastName: "Returner",
          line1: "12 Road 4, Dhanmondi",
          city: "Dhaka",
          country: "BD",
          phone: "+8801711000000",
        },
      },
    });
    expect(withAddress.status, JSON.stringify(withAddress.body)).toBe(200);
    const rate = (withAddress.body.shippingRates as { id: string }[])[0];
    test.skip(!rate, "no shipping rate for the test address");
    expect(
      (await store(`/v1/store/carts/${cartId}/shipping-rate`, { method: "PUT", token, body: { rateId: rate!.id } }))
        .status,
    ).toBe(200);
    const placed = await store(`/v1/store/checkout/${cartId}/place-order`, {
      token,
      key: `e2e-ret-${run}`,
      body: { paymentProvider: "manual" },
    });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    const orderId = placed.body.orderId as string;

    // the Owner ships it and records the payment
    const fulfilled = await admin.post(`/v1/admin/orders/${orderId}/fulfillments`, { data: {} });
    expect(fulfilled.status(), await fulfilled.text()).toBe(201);
    const paid = await admin.post(`/v1/admin/orders/${orderId}/mark-paid`, { data: { reference: `E2E ${run}` } });
    expect(paid.status(), await paid.text()).toBe(200);
    const order = (await (await admin.get(`/v1/admin/orders/${orderId}`)).json()) as {
      number: number;
      lines: { id: string }[];
    };

    // the guest asks for a refund of the unit
    const requested = await store(`/v1/store/orders/${orderId}/returns`, {
      token,
      body: {
        resolution: "REFUND",
        lines: [{ orderLineId: order.lines[0]!.id, quantity: 1, reason: "Too small" }],
        note: `E2E note ${run}`,
      },
    });
    test.skip(
      requested.body?.code === "RETURN_NOT_ELIGIBLE",
      `this product can't be returned: ${requested.body?.message}`,
    );
    expect(requested.status, JSON.stringify(requested.body)).toBe(201);
    const returnNumber = requested.body.number as number;

    // queue → detail
    await page.goto("/admin/returns");
    await page.getByRole("link", { name: `#${returnNumber}`, exact: true }).click();
    await expect(page.getByRole("heading", { name: `Return #${returnNumber}` })).toBeVisible();
    await expect(page.getByText(`E2E note ${run}`)).toBeVisible();
    await expect(page.getByRole("cell", { name: "Too small" })).toBeVisible();
    await expect(page.getByRole("link", { name: `#${order.number}`, exact: true })).toHaveAttribute(
      "href",
      `/admin/orders/${orderId}`,
    );

    // decision (unless the store auto-approves returns)
    if (requested.body.status === "REQUESTED") {
      await expect(page.getByRole("button", { name: "Mark received" })).toHaveCount(0);
      await page.getByRole("button", { name: "Approve", exact: true }).click();
      await page.getByLabel(/Staff note/).fill(`Approved by e2e ${run}`);
      await page.getByRole("button", { name: "Approve return" }).click();
      await expect(page.getByText(`Approved by e2e ${run}`)).toBeVisible();
    }

    // shipping: label with tracking, then received
    await page.getByRole("button", { name: "Issue label" }).click();
    await page.getByLabel("Carrier").fill("Pathao");
    await page.getByLabel("Tracking number").fill(`TRK${run}`);
    await page.getByRole("dialog").getByRole("button", { name: "Issue label" }).click();
    await expect(page.getByText(`TRK${run}`)).toBeVisible();
    await page.getByRole("button", { name: "Mark received" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Mark received" }).click();

    // inspection: accept and restock the unit
    await page.getByRole("button", { name: "Inspect", exact: true }).click();
    await expect(page.getByLabel(/^Accepted quantity for /)).toHaveValue("1");
    await page.getByRole("button", { name: "Save inspection" }).click();
    await expect(page.getByRole("cell", { name: "Restock" })).toBeVisible();

    // settle: the refund is confirmed with its amount first
    await page.getByRole("button", { name: "Complete return" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/^Refunds .+ for 1 of 1 unit to the original payment method/)).toBeVisible();
    await dialog.getByRole("button", { name: /^Refund / }).click();
    await expect(page.getByText(`Return #${returnNumber} completed`)).toBeVisible();
    await expect(page.getByRole("link", { name: "See the order's refunds" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete return" })).toHaveCount(0);
  });
});
