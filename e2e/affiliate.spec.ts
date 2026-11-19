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

const affiliateEmail = process.env.E2E_AFFILIATE_EMAIL;
const affiliatePassword = process.env.E2E_AFFILIATE_PASSWORD;
const NEEDS_AFFILIATE = "set E2E_AFFILIATE_EMAIL and E2E_AFFILIATE_PASSWORD for an approved affiliate";

async function signInAsAffiliate(page: Page) {
  await page.goto(`${MARKET}/account/sign-in?next=${encodeURIComponent(`${MARKET}/affiliate`)}`);
  const form = page.getByTestId("sign-in-form");
  await form.getByRole("textbox", { name: "Email" }).fill(affiliateEmail!);
  await form.getByLabel("Password").fill(affiliatePassword!);
  await form.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(new RegExp(`${MARKET}/affiliate$`));

  const terms = page.getByTestId("affiliate-terms-form");
  if (await terms.isVisible()) {
    await terms.getByRole("checkbox", { name: /I accept the affiliate terms/ }).check();
    await terms.getByRole("button", { name: "Accept terms" }).click();
  }
  await expect(page.getByTestId("affiliate-stats")).toBeVisible();
}

const sections = (page: Page) => page.getByRole("navigation", { name: "Affiliate sections" });

test("an approved affiliate builds a link with a sub-ID and a QR code", async ({ page }) => {
  test.skip(!affiliateEmail || !affiliatePassword, NEEDS_AFFILIATE);
  await signInAsAffiliate(page);

  await sections(page).getByRole("link", { name: "Links & QR codes" }).click();
  const builder = page.getByTestId("affiliate-link-builder");
  await builder.getByRole("textbox", { name: "Page (optional)" }).fill("/products");
  await builder.getByRole("textbox", { name: "Sub-ID (optional)" }).fill("e2e-video");
  const link = await builder.getByRole("textbox", { name: "Your link" }).inputValue();
  const url = new URL(link);
  expect(url.pathname).toBe(`${MARKET}/products`);
  expect(url.searchParams.get("ref")).toBeTruthy();
  expect(url.searchParams.get("sub")).toBe("e2e-video");
  await expect(builder.getByRole("img", { name: /QR code for/ })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Your coupon codes" })).toBeVisible();

  for (const section of ["Orders", "Earnings", "Payouts", "Payout methods", "Marketing assets"]) {
    await sections(page).getByRole("link", { name: section, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  }
});

test("the overview shows the tier and a sortable sub-ID breakdown per period", async ({ page }) => {
  test.skip(!affiliateEmail || !affiliatePassword, NEEDS_AFFILIATE);
  await signInAsAffiliate(page);

  await expect(page.getByTestId("affiliate-tier").getByRole("heading", { name: "Your tier" })).toBeVisible();
  await page.getByRole("navigation", { name: "Reporting period" }).getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByRole("heading", { name: "Last 7 days" })).toBeVisible();

  const table = page.getByTestId("affiliate-subids");
  if (await table.isVisible()) {
    await table
      .getByRole("columnheader", { name: /Sub-ID/ })
      .getByRole("link")
      .click();
    await expect(page).toHaveURL(/sort=subId&dir=asc/);
    await expect(table.getByRole("columnheader", { name: /Sub-ID/ })).toHaveAttribute("aria-sort", "ascending");
  }
});

test("an affiliate adds, edits and removes a bKash payout method; only the last digits are shown", async ({ page }) => {
  test.skip(!affiliateEmail || !affiliatePassword, NEEDS_AFFILIATE);
  await signInAsAffiliate(page);
  await sections(page).getByRole("link", { name: "Payout methods", exact: true }).click();

  const form = page.getByTestId("payout-method-form");
  test.skip(!(await form.isVisible()), "this affiliate already has the maximum number of payout methods");

  // checked before anything is sent
  await form.getByRole("radio", { name: /Mobile wallet/ }).check();
  await form.getByRole("button", { name: "Save payout method" }).click();
  await expect(form.getByText("Please fill this in.").first()).toBeVisible();

  // a unique number per run, so leftovers from other runs don't match
  const number = `017${Date.now().toString().slice(-8)}`;
  await form.getByRole("combobox", { name: "Wallet provider" }).selectOption("bKash");
  await form.getByRole("textbox", { name: "Wallet number" }).fill(number);
  await form.getByRole("textbox", { name: "Account holder name" }).fill("E2E Affiliate");
  await form.getByRole("button", { name: "Save payout method" }).click();
  await expect(form.getByText("Payout method saved.")).toBeVisible();

  const list = page.getByTestId("payout-methods");
  const masked = `•••• ${number.slice(-4)}`;
  const item = list.getByRole("listitem").filter({ hasText: masked }).first();
  await expect(item).toBeVisible();
  // the full number is never shown again
  await expect(page.getByText(number)).toHaveCount(0);

  // edit: switch the wallet provider
  await item.getByText("Edit", { exact: true }).click();
  await item.getByRole("combobox", { name: "Wallet provider" }).selectOption("Nagad");
  await item.getByRole("button", { name: "Save changes" }).click();
  const renamed = list.getByRole("listitem").filter({ hasText: masked }).filter({ hasText: "Nagad" }).first();
  await expect(renamed).toBeVisible();

  // remove, with its confirm step
  await renamed.getByText("Remove", { exact: true }).click();
  await renamed.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(list.getByRole("listitem").filter({ hasText: masked })).toHaveCount(0);
});

test("the payouts page shows the payable balance, the minimum and how payouts are sent", async ({ page }) => {
  test.skip(!affiliateEmail || !affiliatePassword, NEEDS_AFFILIATE);
  await signInAsAffiliate(page);
  await sections(page).getByRole("link", { name: "Payouts", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Request a payout" })).toBeVisible();
  await expect(page.getByText("Ready for payout")).toBeVisible();
  await expect(page.getByText("Minimum payout")).toBeVisible();
  // a schedule note, a payout in progress, or the request button
  await expect(
    page
      .getByTestId("payout-schedule")
      .or(page.getByTestId("payout-in-progress"))
      .or(page.getByRole("button", { name: /Request payout of/ })),
  ).toBeVisible();
});

test("marketing assets can be downloaded and shared with a tracked link", async ({ page }) => {
  test.skip(!affiliateEmail || !affiliatePassword, NEEDS_AFFILIATE);
  await signInAsAffiliate(page);
  await sections(page).getByRole("link", { name: "Marketing assets", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Marketing assets", level: 2 })).toBeVisible();

  const assets = page.getByTestId("affiliate-assets");
  test.skip(!(await assets.isVisible()), "no marketing assets in this store");
  const first = assets.getByRole("listitem").first();

  const download = page.waitForEvent("download");
  await first.getByRole("link", { name: /^Download/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^[a-z0-9-]+(\.[a-z0-9]+)?$/);

  await first.getByRole("button", { name: /Get tracked link/ }).click();
  const link = await first.getByRole("textbox", { name: "Your tracked link" }).inputValue();
  const url = new URL(link);
  expect(url.pathname.startsWith(MARKET)).toBe(true);
  expect(url.searchParams.get("ref")).toBeTruthy();
  expect(url.searchParams.get("asset")).toBeTruthy();
});
