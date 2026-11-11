import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// Theme editor (spec §9.2): token edits, WCAG contrast warnings, the scoped live preview and the
// activation confirmation. The API can't delete themes, so the tests reuse one fixed test theme
// (reset before each run) instead of leaving a new one behind every time. Nothing is activated:
// the activation dialog is opened and cancelled, so the live theme never changes.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const HANDLE = "e2e-theme-editor";
const NAME = "E2E theme editor";

type Theme = {
  id: string;
  handle: string;
  name: string;
  version: number;
  tokens: { colors: Record<string, string> } & Record<string, unknown>;
  channels: { id: string; handle: string }[];
};

let admin: APIRequestContext;
let liveBefore: Record<string, string> = {};

test.describe.configure({ mode: "serial" });
test.use({ storageState: OWNER_STATE });

async function themes(): Promise<Theme[]> {
  const res = await admin.get("/v1/admin/themes");
  expect(res.ok(), await res.text()).toBe(true);
  return res.json();
}

const liveByChannel = (list: Theme[]) =>
  Object.fromEntries(list.flatMap((t) => t.channels.map((c) => [c.id, t.id] as const)));

test.beforeAll(async () => {
  admin = await request.newContext({
    baseURL: API,
    storageState: OWNER_STATE,
    extraHTTPHeaders: { origin: STOREFRONT },
  });
  const list = await themes();
  liveBefore = liveByChannel(list);
  const base = list.find((t) => t.handle === "default") ?? list.find((t) => t.handle !== HANDLE);
  test.skip(!base, "no theme to copy tokens from");
  // known-good starting tokens: a copy of the default theme with AA-safe muted text
  const tokens = { ...base!.tokens, colors: { ...base!.tokens.colors, mutedForeground: "#595959" } };
  const existing = list.find((t) => t.handle === HANDLE);
  const res = existing
    ? await admin.put(`/v1/admin/themes/${existing.id}`, {
        data: { handle: HANDLE, name: NAME, tokens, version: existing.version },
      })
    : await admin.post("/v1/admin/themes", { data: { handle: HANDLE, name: NAME, tokens } });
  expect(res.ok(), await res.text()).toBe(true);
});

test.afterAll(async () => {
  // the test theme must never end up live anywhere
  expect(liveByChannel(await themes())).toEqual(liveBefore);
  await admin.dispose();
});

test("editing a colour warns about contrast and updates the preview, then saves", async ({ page }) => {
  await page.goto("/admin/theme");
  await expect(page.getByRole("heading", { name: "Theme", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(NAME) }).click();
  const editor = page.getByRole("form", { name: `Edit ${NAME}` });
  await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(NAME);

  const preview = page.getByRole("region", { name: "Storefront preview, light colours" });
  await expect(preview).toHaveAttribute("style", /--color-muted-foreground:\s*#595959/);

  const muted = editor.locator("#theme-light-mutedForeground");
  await muted.fill("#dddddd");
  await expect(preview).toHaveAttribute("style", /--color-muted-foreground:\s*#dddddd/);
  await expect(page.getByText(/below WCAG AA/)).toBeVisible();
  await expect(page.getByText("Muted text on the page")).toBeVisible();

  // an invalid hex is flagged and blocks saving
  await muted.fill("#ddd1");
  await expect(editor.getByText("Use a hex colour like #1a1a1a")).toBeVisible();
  await expect(editor.getByRole("button", { name: "Save theme" })).toBeDisabled();

  await muted.fill("#dddddd");
  await editor.getByRole("button", { name: "Save theme" }).click();
  await expect(page.getByText(new RegExp(`${NAME} saved with \\d+ contrast warning`))).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: new RegExp(NAME) }).click();
  await expect(page.locator("#theme-light-mutedForeground")).toHaveValue("#dddddd");
  await expect(page.getByRole("button", { name: new RegExp(NAME) })).toContainText(/contrast issue/);
});

test("dark mode colours fall back to light ones and preview separately", async ({ page }) => {
  await page.goto("/admin/theme");
  await page.getByRole("button", { name: new RegExp(NAME) }).click();
  const editor = page.getByRole("form", { name: `Edit ${NAME}` });
  const dark = editor.getByRole("switch", { name: "Dark mode colours" });
  if ((await dark.getAttribute("aria-checked")) !== "true") await dark.click();
  await editor.locator("#theme-dark-background").fill("#111111");
  await expect(page.getByRole("region", { name: "Storefront preview, dark colours" })).toHaveAttribute(
    "style",
    /--color-background:\s*#111111/,
  );
  // not saved: discarding brings the stored tokens back
  await editor.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("region", { name: "Storefront preview, light colours" })).toBeVisible();
});

test("activation asks first, and duplicating suggests a free handle", async ({ page }) => {
  await page.goto("/admin/theme");
  await page.getByRole("button", { name: new RegExp(NAME) }).click();
  const editor = page.getByRole("form", { name: `Edit ${NAME}` });
  const activate = editor.getByRole("button", { name: "Activate" });
  if (await activate.isVisible()) {
    await activate.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: new RegExp(`Make ${NAME} live on`) })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  }

  await page.getByRole("button", { name: "Duplicate" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: `Duplicate ${NAME}` })).toBeVisible();
  await expect(dialog.getByLabel("Handle")).toHaveValue(new RegExp(`^${HANDLE}-copy`));
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
