import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// Segments rule builder (spec §6.6) and customer tags, groups and privacy actions. Segments are
// uniquely named and deleted afterwards; a tag added to a customer is removed again. The
// destructive anonymize action is only opened and cancelled, never confirmed.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36);
const tag = `e2e-${run}`;
const segmentName = `E2E segment ${run}`;
const segmentHandle = `e2e-segment-${run}`;

let admin: APIRequestContext;

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
});

test.afterAll(async () => {
  const segments = (await (await admin.get("/v1/admin/segments")).json()) as { id: string; handle: string }[];
  for (const s of segments.filter((s) => s.handle.startsWith(`e2e-segment-${run}`)))
    await admin.delete(`/v1/admin/segments/${s.id}`);
  const customers = (await (await admin.get(`/v1/admin/customers?tag=${tag}&limit=50`)).json()) as {
    items: { id: string; tags: string[]; version: number }[];
  };
  for (const c of customers.items)
    await admin.patch(`/v1/admin/customers/${c.id}`, {
      data: { version: c.version, tags: c.tags.filter((t) => t !== tag) },
    });
  await admin.dispose();
});

test("a segment is built from rules, previewed, created, refreshed and deleted", async ({ page }) => {
  await page.goto("/admin/segments");
  await expect(page.getByRole("heading", { name: "Segments", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "New segment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(segmentName);
  await expect(dialog.getByLabel("Handle")).toHaveValue(segmentHandle);

  // condition 1: the default field (tag) left empty is flagged
  await dialog.getByRole("button", { name: "Preview matches" }).click();
  await expect(dialog.getByText("Enter a tag")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Condition 1 value" }).fill(tag);

  // condition 2: number of orders at least 1
  await dialog.getByRole("button", { name: "Add condition" }).click();
  await dialog.getByRole("combobox", { name: "Condition 2 field" }).click();
  await page.getByRole("option", { name: "Number of orders" }).click();
  await dialog.getByRole("textbox", { name: "Condition 2 value" }).fill("1");
  await expect(dialog.getByText(/Customers who match all of: tag has/)).toBeVisible();

  await dialog.getByRole("button", { name: "Preview matches" }).click();
  await expect(dialog.getByText("No customers match these rules right now.")).toBeVisible();

  await dialog.getByRole("button", { name: "Create segment" }).click();
  await expect(page.getByText(`${segmentName} created: 0 members`)).toBeVisible();
  await expect(dialog).toBeHidden();

  const row = page.getByRole("row", { name: new RegExp(segmentName) });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Show details" }).click();
  await page.getByRole("button", { name: "Refresh members" }).click();
  await expect(page.getByText(new RegExp(`${segmentName}: 0 members`))).toBeVisible();

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm.getByRole("heading", { name: `Delete ${segmentName}?` })).toBeVisible();
  await confirm.getByRole("button", { name: "Delete segment" }).click();
  await expect(page.getByText(`${segmentName} deleted`)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(segmentName) })).toHaveCount(0);
});

test("staff tag a customer, see groups, export data, and must type the email to anonymize", async ({ page }) => {
  const list = (await (await admin.get("/v1/admin/customers?limit=10")).json()) as {
    items: { id: string; email: string | null; anonymizedAt?: string | null; archivedAt: string | null }[];
  };
  const customer = list.items.find((c) => c.email && !c.archivedAt);
  test.skip(!customer, "no customer with an email to work with");

  await page.goto("/admin/customers");
  await page.getByRole("button", { name: "Groups" }).click();
  const groups = page.getByRole("dialog");
  await expect(groups.getByRole("heading", { name: "Customer groups" })).toBeVisible();
  await expect(groups.getByRole("form", { name: "New group" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto(`/admin/customers/${customer!.id}`);
  const tags = page.getByRole("region", { name: "Tags and group" });
  await tags.getByLabel("Tags", { exact: true }).fill(tag);
  await tags.getByLabel("Tags", { exact: true }).press("Enter");
  await expect(tags.getByRole("button", { name: `Remove tag ${tag}` })).toBeVisible();
  await tags.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Tags and group saved")).toBeVisible();

  await page.reload();
  await tags.getByRole("button", { name: `Remove tag ${tag}` }).click();
  await tags.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Tags and group saved")).toBeVisible();
  await page.reload();
  await expect(tags.getByRole("button", { name: `Remove tag ${tag}` })).toHaveCount(0);

  const privacy = page.getByRole("region", { name: "Privacy" });
  const download = page.waitForEvent("download");
  await privacy.getByRole("button", { name: "Export data" }).click();
  expect((await download).suggestedFilename()).toMatch(new RegExp(`^customer-${customer!.id}-.*\\.json$`));

  await privacy.getByRole("button", { name: "Anonymize" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Anonymize customer" });
  await dialog.getByLabel("Reason").fill("E2E check only");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/to confirm/).fill("not-the-email@example.com");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/to confirm/).fill(customer!.email!);
  await expect(confirm).toBeEnabled();
  // never confirmed: cancel leaves the customer untouched
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
  const after = (await (await admin.get(`/v1/admin/customers/${customer!.id}`)).json()) as {
    anonymizedAt: string | null;
  };
  expect(after.anonymizedAt).toBeNull();
});
