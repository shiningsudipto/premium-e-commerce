import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// B-Phase 3 admin: integrations. The Owner builds a workflow rule (kept disabled so it never acts
// on real orders) and dry-runs it, creates a webhook endpoint pointing at a port nothing listens on
// so its deliveries fail and are logged, and issues and revokes an API key. Everything is named
// with this run's id and removed (rules, endpoints) or revoked (keys) afterwards.
// The webhook delivery check needs the backend worker running (deliveries go through its queue).

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36);

let admin: APIRequestContext;
const rules: string[] = [];
const endpoints: string[] = [];
const keys: string[] = [];

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
  for (const id of rules) await admin.delete(`/v1/admin/workflows/${id}`);
  for (const id of endpoints) await admin.delete(`/v1/admin/webhooks/${id}`);
  // already revoked keys answer 404, which is fine
  for (const id of keys) await admin.post(`/v1/admin/api-keys/${id}/revoke`);
  await admin.dispose();
});

async function choose(page: Page, combobox: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: combobox, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

// the one-time secret dialog: shows the secret, closes only once "stored" is ticked
async function readOneTimeSecret(page: Page, label: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/You won't see it again/)).toBeVisible();
  const secret = await dialog.getByLabel(label).inputValue();
  await expect(dialog.getByRole("button", { name: "Done" })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: "I've stored it safely" }).check();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  return secret;
}

test("workflow rules: build, validate, dry-run, pause and delete", async ({ page }) => {
  const name = `E2E rule ${run}`;
  await page.goto("/admin/workflows/new");
  await expect(page.getByRole("heading", { name: "New workflow rule" })).toBeVisible();

  await page.getByLabel("Name").fill(name);
  await choose(page, "Trigger", /\(order\.placed\)/);
  // kept off: a live rule would tag real orders
  await page.getByRole("switch", { name: "Enabled" }).click();
  await expect(page.getByText("Paused")).toBeVisible();

  // condition: order total at least … (left empty first to see validation)
  await page.getByRole("button", { name: "Add condition" }).click();
  const condition = page.getByRole("group", { name: "Condition 1" });
  await expect(condition.getByRole("combobox", { name: "Fact" })).toHaveText(/Order total/);

  // actions: the default "Tag the order", plus an order note
  const first = page.getByRole("group", { name: "Action 1" });
  await first.getByLabel("Tag").fill(`e2e-${run}`);
  await page.getByRole("button", { name: "Add action" }).click();
  const second = page.getByRole("group", { name: "Action 2" });
  await second.getByRole("combobox", { name: "Action 2" }).click();
  await page.getByRole("option", { name: "Add an order note" }).click();
  await second.getByLabel("Note").fill("Checked by e2e {{order.number}}");

  await page.getByRole("button", { name: "Create rule" }).click();
  await expect(condition.getByText("Enter a number")).toBeVisible();
  await condition.getByLabel("Value").fill("1");

  // dry run without an order: the order total can't be at least 1, so nothing would happen
  await page.getByRole("button", { name: "Run test" }).click();
  await expect(page.getByText("Doesn't match")).toBeVisible();
  await expect(page.getByText("Nothing would happen for this event.")).toBeVisible();

  await page.getByRole("button", { name: "Create rule" }).click();
  await expect(page).toHaveURL(/\/admin\/workflows\/(?!new$)[^/]+$/);
  rules.push(page.url().split("/").pop()!);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("switch", { name: "Enabled" })).not.toBeChecked();
  await expect(page.getByRole("heading", { name: "Run history" })).toBeVisible();
  await expect(page.getByText(/No runs yet/)).toBeVisible();

  // the list shows it, off and never run; delete it from there
  await page.goto("/admin/workflows");
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row.getByRole("switch", { name: `${name} enabled` })).not.toBeChecked();
  await expect(row.getByText("Never")).toBeVisible();
  await row.getByRole("button", { name: `Delete ${name}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete rule" }).click();
  await expect(page.getByRole("link", { name })).toHaveCount(0);
  rules.pop();
});

test("webhooks: create, see the secret once, log a failing delivery, replay, rotate and delete", async ({ page }) => {
  const description = `E2E hook ${run}`;
  // port 9 (discard) has no listener locally, so every delivery fails without an external service
  const url = `http://127.0.0.1:9/e2e-${run}`;
  await page.goto("/admin/webhooks");
  await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();

  await page.getByRole("button", { name: "New endpoint" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("URL").fill(url);
  await dialog.getByLabel("Description").fill(description);
  await dialog.getByRole("button", { name: "Create endpoint" }).click();
  await expect(dialog.getByText("Choose at least one event")).toBeVisible();
  await dialog.getByRole("checkbox", { name: "order.placed" }).check();
  await dialog.getByRole("button", { name: "Create endpoint" }).click();
  const secret = await readOneTimeSecret(page, "Signing secret");
  expect(secret).toMatch(/^whsec_/);

  const list = await admin.get("/v1/admin/webhooks");
  const created = ((await list.json()) as { id: string; description: string | null }[]).find(
    (e) => e.description === description,
  );
  expect(created).toBeTruthy();
  endpoints.push(created!.id);
  // the list never carries the secret
  expect(JSON.stringify(created)).not.toContain(secret);

  const row = page.getByRole("row", { name: new RegExp(`e2e-${run}`) });
  await expect(row.getByText("Active")).toBeVisible();
  await row.getByRole("button", { name: "Show details" }).click();

  // a test event: delivered by the worker, fails (nothing listens), and is logged
  await page.getByRole("button", { name: "Send test event" }).click();
  await expect(page.getByText(/Test event queued/)).toBeVisible();
  await expect
    .poll(
      async () => {
        const res = await admin.get(`/v1/admin/webhooks/${created!.id}/deliveries?limit=5`);
        return ((await res.json()) as { items: unknown[] }).items.length;
      },
      { timeout: 45_000 },
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Refresh" }).click();
  const log = page.getByRole("region", { name: "Delivery log" });
  await expect(log.getByText("webhook.ping").first()).toBeVisible();
  await expect(log.getByText(/^No response/).first()).toBeVisible();

  // filters: nothing delivered successfully
  await log.getByRole("combobox", { name: "Outcome" }).click();
  await page.getByRole("option", { name: "Delivered" }).click();
  await expect(log.getByText("No deliveries match these filters.")).toBeVisible();
  await log.getByRole("combobox", { name: "Outcome" }).click();
  await page.getByRole("option", { name: "Failed" }).click();

  await log
    .getByRole("button", { name: /^Replay webhook\.ping/ })
    .first()
    .click();
  await expect(page.getByText(/Delivery queued again/)).toBeVisible();

  // rotating shows the new secret once
  await page.getByRole("button", { name: "Rotate secret" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Rotate secret" }).click();
  const rotated = await readOneTimeSecret(page, "Signing secret");
  expect(rotated).toMatch(/^whsec_/);
  expect(rotated).not.toBe(secret);

  // disable, then delete
  await page.getByRole("button", { name: "Disable", exact: true }).click();
  await expect(row.getByText("Disabled")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete endpoint" }).click();
  await expect(page.getByRole("row", { name: new RegExp(`e2e-${run}`) })).toHaveCount(0);
  endpoints.pop();
});

test("API keys: create with scopes and an expiry, see the key once, revoke by typing its name", async ({ page }) => {
  const name = `E2E key ${run}`;
  await page.goto("/admin/api-keys");
  await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();

  await page.getByRole("button", { name: "New key" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Create key" }).click();
  await expect(dialog.getByText("Choose at least one scope")).toBeVisible();
  await dialog.getByRole("checkbox", { name: "inventory.read", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "inventory.write", exact: true }).check();
  await expect(dialog.getByText("2 scopes selected")).toBeVisible();
  await choose(page, "Expiry", "In 30 days");
  await dialog.getByRole("button", { name: "Create key" }).click();

  const secret = await readOneTimeSecret(page, "API key");
  expect(secret).toMatch(/^sk_/);

  const list = await admin.get("/v1/admin/api-keys");
  const created = ((await list.json()) as { id: string; name: string; prefix: string }[]).find((k) => k.name === name);
  expect(created).toBeTruthy();
  keys.push(created!.id);
  expect(secret.startsWith(created!.prefix)).toBe(true);

  // the key works within its scopes
  const scoped = await request.newContext({ baseURL: API, extraHTTPHeaders: { authorization: `Bearer ${secret}` } });
  expect((await scoped.get("/v1/admin/orders")).status()).toBe(403);

  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row.getByText(`${created!.prefix}…`)).toBeVisible();
  await expect(row.getByText("Active")).toBeVisible();

  // revoke: the button stays disabled until the exact name is typed
  await row.getByRole("button", { name: `Revoke ${name}` }).click();
  const confirm = page.getByRole("dialog");
  await confirm.getByLabel(/to confirm$/).fill("wrong name");
  await expect(confirm.getByRole("button", { name: "Revoke key" })).toBeDisabled();
  await confirm.getByLabel(/to confirm$/).fill(name);
  await confirm.getByRole("button", { name: "Revoke key" }).click();
  await expect(row.getByText("Revoked")).toBeVisible();
  await expect(row.getByRole("button", { name: `Revoke ${name}` })).toHaveCount(0);

  // a revoked key is refused outright, not just short of scopes
  expect((await scoped.get("/v1/admin/inventory/variants/none")).status()).toBe(401);
  await scoped.dispose();
});
