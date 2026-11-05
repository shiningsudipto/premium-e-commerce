import { expect, test as setup } from "@playwright/test";
import { generate } from "otplib";
import { loadStaff, OWNER_STATE } from "./staff";

setup("sign the Owner in", async ({ page }) => {
  const { owner } = loadStaff();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password").fill(owner.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("6-digit code").fill(await generate({ secret: owner.totpSecret! }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: /Hello, E2E tester/ })).toBeVisible();
  await page.context().storageState({ path: OWNER_STATE });
});
