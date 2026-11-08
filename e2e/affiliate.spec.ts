import { expect, test, type Page } from "@playwright/test";

// Affiliate program (flag `affiliates`): referral links, the application in the account and the
// dashboard. The application tests create a customer account (e2e+aff-…@example.com) in the
// API's database and skip themselves when the flag is off. The dashboard test needs an
// approved affiliate: set E2E_AFFILIATE_EMAIL and E2E_AFFILIATE_PASSWORD to run it.

const MARKET = "/en-bd";

// one run is enough: none of this depends on the viewport
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
});

test.describe("referral links", () => {
  test("?ref= sets the attribution cookie and redirects to the clean URL", async ({ page, request, context }) => {
    const res = await request.get(`${MARKET}/products?sort=newest&ref=e2etest&sub=insta-bio`, { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const location = new URL(res.headers()["location"]!, "http://x");
    expect(location.pathname).toBe(`${MARKET}/products`);
    expect(location.search).toBe("?sort=newest");
    const setCookie = res.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && /^pe_ref=/.test(h.value));
    expect(setCookie?.value).toMatch(/HttpOnly/i);

    await page.goto(`${MARKET}/products?ref=e2etest&sub=insta-bio`);
    await expect(page).toHaveURL(new RegExp(`${MARKET}/products$`));
    const cookie = (await context.cookies()).find((c) => c.name === "pe_ref");
    expect(cookie?.httpOnly).toBe(true);
    const value = JSON.parse(decodeURIComponent(cookie!.value)) as { first: { code: string }; last: { subId: string } };
    expect(value.first.code).toBe("E2ETEST");
    expect(value.last.subId).toBe("insta-bio");
  });

  test("a second click keeps the first referral and replaces the last", async ({ page, context }) => {
    await page.goto(`${MARKET}?ref=FIRSTONE`);
    await page.goto(`${MARKET}?ref=SECONDONE`);
    const cookie = (await context.cookies()).find((c) => c.name === "pe_ref");
    const value = JSON.parse(decodeURIComponent(cookie!.value)) as { first: { code: string }; last: { code: string } };
    expect(value.first.code).toBe("FIRSTONE");
    expect(value.last.code).toBe("SECONDONE");
  });

  test("a malformed code is removed from the URL but not remembered", async ({ page, context }) => {
    await page.goto(`${MARKET}/products?ref=%3Cscript%3E&page=2`);
    await expect(page).toHaveURL(new RegExp(`${MARKET}/products\\?page=2$`));
    expect((await context.cookies()).find((c) => c.name === "pe_ref")).toBeUndefined();
  });
});

async function register(page: Page) {
  const email = `e2e+aff-${Date.now().toString(36)}@example.com`;
  await page.goto(`${MARKET}/account/register`);
  const form = page.getByTestId("register-form");
  await form.getByRole("textbox", { name: "First name" }).fill("Affi");
  await form.getByRole("textbox", { name: "Email" }).fill(email);
  await form.getByLabel("Password").fill("correct horse battery staple");
  await form.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL(new RegExp(`${MARKET}/account$`));
  return email;
}

test("a customer applies to become an affiliate", async ({ page }) => {
  await register(page);
  const card = page.getByTestId("affiliate-card");
  test.skip(!(await card.isVisible()), "the affiliates flag is off");

  // not an affiliate yet: the dashboard sends them to the application
  await page.goto(`${MARKET}/affiliate`);
  await page.waitForURL(new RegExp(`${MARKET}/account/affiliate$`));

  const form = page.getByTestId("affiliate-apply-form");
  await form.getByRole("button", { name: "Send application" }).click();
  await expect(form.getByText("Please fill this in.")).toBeVisible();
  await expect(form.getByText("Accept the affiliate terms to continue.")).toBeVisible();

  await form.getByRole("textbox", { name: "Website or social profile" }).fill("instagram.com/e2e-affiliate");
  await form.getByRole("textbox", { name: "Audience size (optional)" }).fill("1200");
  await form.getByRole("checkbox", { name: /I accept the affiliate terms/ }).check();
  await form.getByRole("button", { name: "Send application" }).click();

  // the default tier is approved by hand; an auto-approve tier makes them active straight away
  const status = page.getByTestId("affiliate-status");
  await expect(status).toBeVisible();
  await expect(status.getByText(/Under review|Active/).first()).toBeVisible();
});

test("an approved affiliate builds a link with a sub-ID and a QR code", async ({ page }) => {
  const email = process.env.E2E_AFFILIATE_EMAIL;
  const password = process.env.E2E_AFFILIATE_PASSWORD;
  test.skip(!email || !password, "set E2E_AFFILIATE_EMAIL and E2E_AFFILIATE_PASSWORD for an approved affiliate");

  await page.goto(`${MARKET}/account/sign-in?next=${encodeURIComponent(`${MARKET}/affiliate`)}`);
  const form = page.getByTestId("sign-in-form");
  await form.getByRole("textbox", { name: "Email" }).fill(email!);
  await form.getByLabel("Password").fill(password!);
  await form.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(new RegExp(`${MARKET}/affiliate$`));

  const terms = page.getByTestId("affiliate-terms-form");
  if (await terms.isVisible()) {
    await terms.getByRole("checkbox", { name: /I accept the affiliate terms/ }).check();
    await terms.getByRole("button", { name: "Accept terms" }).click();
  }
  await expect(page.getByTestId("affiliate-stats")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Affiliate sections" })
    .getByRole("link", { name: "Links & QR codes" })
    .click();
  const builder = page.getByTestId("affiliate-link-builder");
  await builder.getByRole("textbox", { name: "Page (optional)" }).fill("/products");
  await builder.getByRole("textbox", { name: "Sub-ID (optional)" }).fill("e2e-video");
  const link = await builder.getByRole("textbox", { name: "Your link" }).inputValue();
  const url = new URL(link);
  expect(url.pathname).toBe(`${MARKET}/products`);
  expect(url.searchParams.get("ref")).toBeTruthy();
  expect(url.searchParams.get("sub")).toBe("e2e-video");
  await expect(builder.getByRole("img", { name: /QR code for/ })).toBeVisible();

  for (const section of ["Orders", "Earnings", "Payouts"]) {
    await page.getByRole("navigation", { name: "Affiliate sections" }).getByRole("link", { name: section }).click();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  }
});
