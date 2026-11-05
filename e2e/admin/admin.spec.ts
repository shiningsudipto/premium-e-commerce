import { expect, test, type Page } from "@playwright/test";
import { generate } from "otplib";
import { loadStaff, OWNER_STATE, type TestStaff } from "./staff";

// these tests change shared settings and flags, so they run one at a time
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, staff: TestStaff) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(staff.email);
  await page.getByLabel("Password").fill(staff.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/mfa/);
  await page.getByLabel("6-digit code").fill(await generate({ secret: staff.totpSecret! }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: /Hello, E2E tester/ })).toBeVisible();
}

test.describe("sign-in (spec §3.4)", () => {
  test("signed-out visitors land on sign-in and return to where they were going", async ({ page }) => {
    const { owner } = loadStaff();
    await page.goto("/admin/staff");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fstaff$/);
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill(owner.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("6-digit code").fill(await generate({ secret: owner.totpSecret! }));
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page).toHaveURL(/\/admin\/staff$/);
    await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();
  });

  test("a wrong password and a wrong code are explained", async ({ page }) => {
    const { owner } = loadStaff();
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match an account.")).toBeVisible();

    await page.getByLabel("Password").fill(owner.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText(/That code didn't match/)).toBeVisible();
  });

  test("a role that requires two-step verification enrolls at first sign-in", async ({ page }) => {
    const { newcomer } = loadStaff();
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(newcomer.email);
    await page.getByLabel("Password").fill(newcomer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/mfa\/enroll/);
    await expect(page.getByRole("img", { name: "Authenticator QR code" })).toBeVisible();
    const secret = (await page.getByTestId("mfa-secret").textContent())!.trim();
    await page.getByLabel("6-digit code").fill(await generate({ secret }));
    await page.getByRole("button", { name: "Turn on and continue" }).click();
    await expect(page.getByText(/two-step verification on/)).toBeVisible();
  });

  test("signing out ends the session", async ({ page }) => {
    // its own session: signing out revokes it, and the shared Owner session must stay valid
    await signIn(page, loadStaff().owner);
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/flags");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fflags$/);
  });
});

test.describe("permission gating (spec §4)", () => {
  test("a Content Editor only sees what their role allows", async ({ page }) => {
    await signIn(page, loadStaff().editor);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Audit log" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Staff" })).toHaveCount(0);
    // the API refuses even when the page is opened directly
    await page.goto("/admin/flags");
    await expect(page.getByText(/Missing permission/)).toBeVisible();
  });
});

test.describe("settings and revalidation (B-Phase 0 exit criteria)", () => {
  test.use({ storageState: OWNER_STATE });

  test("a store name changed here shows on the storefront", async ({ page, request }) => {
    // the worker revalidates behind every other queued event, which takes longer while the
    // storefront tests run in parallel
    test.setTimeout(120_000);
    await page.goto("/admin");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" }).click();
    await page.getByLabel("Search settings").fill("store.name");
    const card = page.getByTestId("setting-store.name");
    const name = `Premium E2E ${Date.now().toString(36)}`;
    await card.getByLabel("Value").fill(name);
    await card.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Name saved/)).toBeVisible();
    await expect(card.getByText(/^Set here/)).toBeVisible();

    try {
      // the worker calls the storefront's /api/revalidate; the next visits serve the new name
      await expect
        .poll(
          async () => {
            const html = await (await request.get("/en-bd")).text();
            return /class="logo__word"[^>]*>([^<]*)</.exec(html)?.[1] ?? "";
          },
          { timeout: 60_000, intervals: [1_000] },
        )
        .toContain(name);
    } finally {
      await card.getByRole("button", { name: "Use default" }).click();
      await expect(card.getByText(/^Not set here/)).toBeVisible();
    }
  });

  test("invalid values are caught before saving", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("Search settings").fill("support_email");
    const card = page.getByTestId("setting-store.support_email");
    await card.getByLabel("Value").fill("not-an-email");
    await expect(card.getByText("Enter an email address")).toBeVisible();
    await expect(card.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("the change is in the audit log with a field diff", async ({ page }) => {
    await page.goto("/admin/audit?entityType=Setting&action=setting.reset");
    await expect(page.getByLabel("Entity type")).toHaveValue("Setting");
    await page.getByRole("button", { name: "Show details" }).first().click();
    const diff = page.locator("dl").first();
    await expect(diff.getByRole("term")).toHaveText("value removed");
    await expect(diff.locator("del")).toContainText("Premium E2E");
  });
});

test.describe("feature flags (spec §2.4)", () => {
  test.use({ storageState: OWNER_STATE });

  test("a flag can be switched on and back off", async ({ page }) => {
    await page.goto("/admin/flags");
    const toggle = page.getByRole("switch", { name: "product_compare enabled" });
    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await expect(page.getByText(new RegExp(`product_compare ${before === "true" ? "off" : "on"}`))).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", before!);
  });
});
