import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 2 admin: affiliates. Two customers (e2e+aff-admin-…@example.com) register and apply
// through the store API; the Owner rejects one from the applications queue, approves the other,
// then works the profile: notes, an adjustment, a manual payout from prepare to paid, and a
// commission rule scoped to that affiliate. Applying needs the `affiliates` flag, so the tests
// skip themselves when it's off (or when the default tier approves applicants automatically).
// Afterwards the rule is deactivated, the affiliate closed and both customers anonymized
// (affiliates, tiers and rules have no delete endpoint).

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36);

type Applicant = { customerId: string; email: string; affiliateId: string | null; status: string | null };

let admin: APIRequestContext;
let store: APIRequestContext;
const applicants: Applicant[] = [];
const rules: { id: string; body: Record<string, unknown> }[] = [];
let skipReason: string | null = null;

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

async function apply(label: string): Promise<Applicant> {
  const email = `e2e+aff-admin-${label}-${run}@example.com`;
  const reg = await store.post("/v1/store/auth/register", {
    data: { email, password: "correct horse battery staple", firstName: `Aff${label}`, lastName: `E2E ${run}` },
  });
  expect(reg.status(), await reg.text()).toBe(201);
  const { customerId, session } = (await reg.json()) as { customerId: string; session: { accessToken: string } };
  const applicant: Applicant = { customerId, email, affiliateId: null, status: null };
  applicants.push(applicant);
  const res = await store.post("/v1/store/affiliate/apply", {
    headers: { authorization: `Bearer ${session.accessToken}` },
    data: {
      acceptTerms: true,
      application: { website: `https://example.com/${label}-${run}`, audience_size: 1200 },
    },
  });
  if (res.status() === 404) {
    skipReason = "the affiliates flag is off";
    return applicant;
  }
  if (!res.ok()) {
    skipReason = `applying failed (${res.status()}): ${await res.text()}`;
    return applicant;
  }
  const profile = (await res.json()) as { id: string; status: string };
  applicant.affiliateId = profile.id;
  applicant.status = profile.status;
  if (profile.status !== "PENDING") skipReason = "the default tier approves applicants automatically";
  return applicant;
}

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
  store = await request.newContext({ baseURL: API });
  await apply("reject");
  if (!skipReason) await apply("approve");
});

test.afterAll(async () => {
  for (const r of rules)
    await admin.put(`/v1/admin/affiliates/config/rules/${r.id}`, { data: { ...r.body, isActive: false } });
  for (const a of applicants) {
    if (a.affiliateId) {
      // unpaid approved cash blocks anonymizing: cancel open payouts and offset what's left
      const payouts = await admin.get(`/v1/admin/affiliates/${a.affiliateId}/payouts`);
      if (payouts.ok())
        for (const p of ((await payouts.json()) as { items: { id: string; status: string }[] }).items)
          if (p.status === "DRAFT" || p.status === "APPROVED")
            await admin.post(`/v1/admin/affiliates/payouts/${p.id}/cancel`);
      const res = await admin.get(`/v1/admin/affiliates/${a.affiliateId}`);
      const profile = res.ok()
        ? ((await res.json()) as { status: string; balances: { payableMinor: number; currency: string | null } })
        : null;
      const status = profile?.status ?? null;
      if (profile && profile.balances.payableMinor > 0)
        await admin.post(`/v1/admin/affiliates/${a.affiliateId}/adjustments`, {
          data: {
            amountMinor: -profile.balances.payableMinor,
            currency: profile.balances.currency ?? "BDT",
            reason: "E2E cleanup",
          },
        });
      if (status === "PENDING")
        await admin.post(`/v1/admin/affiliates/${a.affiliateId}/status`, {
          data: { status: "REJECTED", reason: "E2E cleanup" },
        });
      if (status === "SUSPENDED")
        await admin.post(`/v1/admin/affiliates/${a.affiliateId}/status`, { data: { status: "ACTIVE" } });
      if (status === "ACTIVE" || status === "SUSPENDED")
        await admin.post(`/v1/admin/affiliates/${a.affiliateId}/status`, {
          data: { status: "CLOSED", reason: "E2E cleanup" },
        });
    }
    await admin.post(`/v1/admin/customers/${a.customerId}/anonymize`, { data: {} });
  }
  await admin.dispose();
  await store.dispose();
});

const byEmail = (page: Page, email: string) => page.getByRole("row").filter({ hasText: email });

test("the applications queue: a rejection needs a reason, an approval moves the applicant to the list", async ({
  page,
}) => {
  test.skip(!!skipReason, skipReason ?? "");
  const [rejected, approved] = applicants as [Applicant, Applicant];

  await page.goto(`/admin/affiliates?q=${encodeURIComponent(`E2E ${run}`)}`);
  await expect(page.getByRole("heading", { name: "Affiliates" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Applications" })).toHaveAttribute("aria-selected", "true");
  await expect(byEmail(page, rejected.email)).toBeVisible();
  await expect(byEmail(page, approved.email)).toBeVisible();

  // reject: the reason is required
  await byEmail(page, rejected.email).getByRole("button", { name: "Reject" }).click();
  const rejectDialog = page.getByRole("dialog", { name: "Reject this application?" });
  await rejectDialog.getByRole("button", { name: "Reject" }).click();
  await expect(rejectDialog.getByText("Give a reason (at least 3 characters).")).toBeVisible();
  await rejectDialog.getByLabel("Reason").fill("Audience doesn't match the brand");
  await rejectDialog.getByRole("button", { name: "Reject" }).click();
  await expect(rejectDialog).toBeHidden();
  await expect(byEmail(page, rejected.email)).toHaveCount(0);

  // approve
  await byEmail(page, approved.email).getByRole("button", { name: "Approve" }).click();
  const approveDialog = page.getByRole("dialog", { name: "Approve this application?" });
  await approveDialog.getByRole("button", { name: "Approve" }).click();
  await expect(approveDialog).toBeHidden();
  await expect(byEmail(page, approved.email)).toHaveCount(0);

  // the list shows both with their new status
  await page.getByRole("tab", { name: "All affiliates" }).click();
  await expect(page).toHaveURL(/tab=affiliates/);
  await page.getByRole("textbox", { name: "Search" }).fill(`E2E ${run}`);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(byEmail(page, approved.email).getByText("Active")).toBeVisible();
  await expect(byEmail(page, rejected.email).getByText("Rejected")).toBeVisible();
});

test("the profile: notes, an adjustment and a manual payout from prepare to paid", async ({ page }) => {
  test.skip(!!skipReason, skipReason ?? "");
  const approved = applicants[1]!;
  await page.goto(`/admin/affiliates/${approved.affiliateId}`);
  await expect(page.getByRole("heading", { name: `Affapprove E2E ${run}` })).toBeVisible();
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();

  // a default referral code was created on approval
  const codes = page.getByRole("region", { name: "Referral codes" });
  await expect(codes.getByText("Default", { exact: true })).toBeVisible();

  // application answers
  await expect(
    page.getByRole("region", { name: "Application" }).getByText(`https://example.com/approve-${run}`),
  ).toBeVisible();

  // notes
  const notes = page.getByRole("region", { name: "Notes" });
  await notes.getByLabel("Internal notes").fill("Runs a lighting blog. E2E.");
  await notes.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Notes saved")).toBeVisible();

  // adjustment: the reason is required
  await page.getByRole("button", { name: "Add adjustment" }).click();
  const adjust = page.getByRole("dialog", { name: "Adjust earnings" });
  await adjust.getByLabel(/Amount/).fill("75");
  await adjust.getByRole("button", { name: "Add adjustment" }).click();
  await expect(adjust.getByText("Give a reason (at least 3 characters).")).toBeVisible();
  await adjust.getByLabel("Reason").fill("Launch campaign bonus");
  await adjust.getByRole("button", { name: "Add adjustment" }).click();
  await expect(adjust).toBeHidden();
  const ledger = page.getByRole("region", { name: "Earnings ledger" });
  await expect(ledger.getByText("Bonus: Launch campaign bonus")).toBeVisible();

  // prepare a payout of the approved balance
  const payouts = page.getByRole("region", { name: "Payouts", exact: true });
  await payouts.getByRole("button", { name: "Prepare payout" }).click();
  const prepare = page.getByRole("dialog", { name: "Prepare a payout" });
  await prepare.getByRole("button", { name: "Prepare payout" }).click();
  const outcome = await Promise.race([
    prepare.waitFor({ state: "hidden" }).then(() => "prepared" as const),
    page
      .getByText(/below the payout minimum/)
      .waitFor()
      .then(() => "minimum" as const),
  ]);
  test.skip(outcome === "minimum", "the payout minimum is above the test bonus");

  const row = payouts.getByRole("row").filter({ hasText: "Prepared" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await page
    .getByRole("dialog", { name: /Approve the .* payout\?/ })
    .getByRole("button", { name: "Approve payout" })
    .click();

  const approvedRow = payouts.getByRole("row").filter({ hasText: "Approved" });
  await expect(approvedRow).toBeVisible();
  await approvedRow.getByRole("button", { name: "Mark paid" }).click();
  const paid = page.getByRole("dialog", { name: "Record the payment" });
  await paid.getByRole("button", { name: "Mark paid" }).click();
  await expect(paid.getByText(/Enter the payment reference/)).toBeVisible();
  await paid.getByLabel("Payment reference").fill(`E2E-${run}`);
  await paid.getByRole("button", { name: "Mark paid" }).click();
  await expect(paid).toBeHidden();
  await expect(
    payouts
      .getByRole("row")
      .filter({ hasText: `E2E-${run}` })
      .getByText("Paid", { exact: true }),
  ).toBeVisible();

  // status actions offered for an active affiliate
  await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivate" })).toHaveCount(0);
});

test("program settings: tiers are listed and a commission rule is created and versioned", async ({ page }) => {
  test.skip(!!skipReason, skipReason ?? "");
  const approved = applicants[1]!;
  await page.goto("/admin/affiliates/program");
  await expect(page.getByRole("heading", { name: "Tiers & commission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tiers" })).toBeVisible();

  await page.getByRole("button", { name: "New rule" }).click();
  const dialog = page.getByRole("dialog", { name: "New commission rule" });
  await dialog.getByLabel("Applies to").click();
  await page.getByRole("option", { name: "Affiliate", exact: true }).click();
  // nothing chosen yet
  await dialog.getByRole("button", { name: "Create rule" }).click();
  await expect(dialog.getByText("Choose the affiliate this rule is for.")).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Affiliate" }).fill(approved.email);
  await dialog.getByRole("button", { name: new RegExp(`Affapprove E2E ${run}`) }).click();
  await dialog.getByLabel("Rate (%)").fill("12.5");
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/v1/admin/affiliates/config/rules") && r.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Create rule" }).click();
  const rule = (await (await created).json()) as {
    id: string;
    scope: string;
    scopeId: string;
    rule: unknown;
    priority: number;
  };
  rules.push({
    id: rule.id,
    body: { scope: rule.scope, scopeId: rule.scopeId, rule: rule.rule, priority: rule.priority },
  });
  await expect(dialog).toBeHidden();

  const row = page.getByRole("row").filter({ hasText: approved.affiliateId! });
  await expect(row.getByText("12.5% of the sale")).toBeVisible();
  await expect(row.getByText("v1", { exact: true })).toBeVisible();

  // editing saves a new version
  await row.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: /Edit commission rule/ });
  await edit.getByLabel("Rate (%)").fill("15");
  await edit.getByRole("button", { name: "Save new version" }).click();
  await expect(edit).toBeHidden();
  await expect(row.getByText("15% of the sale")).toBeVisible();
  await expect(row.getByText("v2", { exact: true })).toBeVisible();
});
