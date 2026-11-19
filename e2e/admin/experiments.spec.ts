import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 3 storefront: A/B variant blocks on CMS pages. proxy.ts gives every visitor an
// anonymous ID cookie (pe_vid); a variant block shows only to visitors the API buckets into that
// variant, and the browser reports the exposure. The experiment and page are created through the
// admin API with the Owner's session, uniquely named, and stopped/archived afterwards.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";
const run = Date.now().toString(36);

let admin: APIRequestContext;
const experiments: string[] = [];
const pages: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  for (const id of experiments) await admin.post(`/v1/admin/experiments/${id}/status`, { data: { status: "STOPPED" } });
  for (const id of pages) await admin.post(`/v1/admin/pages/${id}/unpublish`, { data: { status: "ARCHIVED" } });
  await admin.dispose();
});

const assignmentsFor = async (visitorId: string) =>
  (await (await fetch(`${API}/v1/store/experiments?visitorId=${visitorId}`)).json()) as Record<string, string>;

test("variant blocks show per visitor bucket and report one exposure", async ({ browser }) => {
  const key = `e2e-${run}-hero`;
  const created = await admin.post("/v1/admin/experiments", {
    data: {
      key,
      name: `E2E hero ${run}`,
      variants: [
        { key: "control", weight: 50 },
        { key: "bold", weight: 50 },
      ],
      trafficPercent: 100,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const experiment = (await created.json()) as { id: string };
  experiments.push(experiment.id);

  const handle = `e2e-ab-${run}`;
  const blocks = [
    { type: "hero", props: { heading: `Everyone ${run}` } },
    { type: "hero", props: { heading: `Control ${run}` }, settings: { experiment: { key, variant: "control" } } },
    { type: "hero", props: { heading: `Bold ${run}` }, settings: { experiment: { key, variant: "bold" } } },
    // a second block of the same variant: still one exposure
    { type: "spacer", props: {}, settings: { experiment: { key, variant: "bold" } } },
  ];
  const pageRes = await admin.post("/v1/admin/pages", { data: { handle, title: `E2E AB ${run}`, blocks, seo: {} } });
  expect(pageRes.status(), await pageRes.text()).toBe(201);
  const pageRow = (await pageRes.json()) as { id: string };
  pages.push(pageRow.id);
  expect((await admin.post(`/v1/admin/pages/${pageRow.id}/publish`, { data: {} })).ok()).toBe(true);

  // not running yet: nobody sees either variant
  const draftCtx = await browser.newContext();
  const draftPage = await draftCtx.newPage();
  await draftPage.goto(`/${MARKET}/pages/${handle}`);
  await expect(draftPage.getByRole("heading", { name: `Everyone ${run}` })).toBeVisible();
  await expect(draftPage.getByRole("heading", { name: `Control ${run}` })).toHaveCount(0);
  await expect(draftPage.getByRole("heading", { name: `Bold ${run}` })).toHaveCount(0);
  // the proxy gave this visitor an httpOnly ID
  const vid = (await draftCtx.cookies()).find((c) => c.name === "pe_vid");
  expect(vid?.value).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  expect(vid?.httpOnly).toBe(true);
  await draftCtx.close();

  const started = await admin.post(`/v1/admin/experiments/${experiment.id}/status`, { data: { status: "RUNNING" } });
  expect(started.ok(), await started.text()).toBe(true);

  // find one visitor in each variant (the bucket is a hash of key + visitor ID)
  const byVariant: Record<string, string> = {};
  for (let i = 0; i < 40 && Object.keys(byVariant).length < 2; i++) {
    const visitorId = `e2e${run}visitor${i}`;
    const variant = (await assignmentsFor(visitorId))[key];
    if (variant && !byVariant[variant]) byVariant[variant] = visitorId;
  }
  expect(Object.keys(byVariant).sort()).toEqual(["bold", "control"]);

  for (const [variant, visitorId] of Object.entries(byVariant)) {
    const context = await browser.newContext();
    const url = new URL(STOREFRONT);
    await context.addCookies([
      { name: "pe_vid", value: visitorId, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    const exposures: unknown[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/v1/store/events")) exposures.push(r.postDataJSON());
    });
    const reported = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/v1/store/events"));
    await page.goto(`/${MARKET}/pages/${handle}`);

    const shown = variant === "bold" ? `Bold ${run}` : `Control ${run}`;
    const hidden = variant === "bold" ? `Control ${run}` : `Bold ${run}`;
    await expect(page.getByRole("heading", { name: shown })).toBeVisible();
    await expect(page.getByRole("heading", { name: hidden })).toHaveCount(0);

    expect((await reported).postDataJSON()).toEqual({
      visitorId,
      events: [expect.objectContaining({ type: "experiment_exposure", experiments: { [key]: variant } })],
    });
    // once per page view, however many blocks of the variant are on the page
    await page.waitForTimeout(1000);
    expect(exposures).toHaveLength(1);
    await context.close();
  }
});
