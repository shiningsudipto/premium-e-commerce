import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";
import { OWNER_STATE } from "./staff";

// Page builder (plan B-Phase 2 → Admin): create a page, add and reorder blocks, edit a block's
// generated form, catch invalid blocks before saving, preview the draft, publish with a note,
// and roll back. The page is uniquely named and archived afterwards.

const API = process.env.API_URL ?? "http://localhost:4000";
const STOREFRONT = process.env.STOREFRONT_URL ?? "http://localhost:3000";
const run = Date.now().toString(36);
const title = `E2E page ${run}`;
const handle = `e2e-page-${run}`;

let admin: APIRequestContext;
const created: string[] = [];

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
  for (const id of created) await admin.post(`/v1/admin/pages/${id}/unpublish`, { data: { status: "ARCHIVED" } });
  await admin.dispose();
});

const outline = (page: Page) => page.getByRole("list", { name: "Page blocks" });

async function addBlock(page: Page, label: string) {
  await page.getByRole("button", { name: "Add block", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add a block" });
  await dialog.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await expect(dialog).toBeHidden();
}

async function storeHeading() {
  const res = await admin.get(`/v1/store/pages/${handle}`);
  if (!res.ok()) return null;
  const body = (await res.json()) as { blocks: { type: string; props: { heading?: string } }[] };
  return body.blocks.find((b) => b.type === "hero")?.props.heading ?? null;
}

test("build, preview, publish and roll back a page", async ({ page, context }) => {
  await page.goto("/admin/pages");
  await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();

  // create: the handle follows the title
  await page.getByRole("button", { name: "New page" }).click();
  const dialog = page.getByRole("dialog", { name: "New page" });
  await dialog.getByLabel("Title").fill(title);
  await expect(dialog.getByLabel("Handle")).toHaveValue(handle);
  await dialog.getByRole("button", { name: "Create page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[^/]+$/);
  created.push(page.url().split("/").pop()!);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  // a hero, edited through its generated form
  await addBlock(page, "Hero");
  const inspector = page.getByRole("region", { name: "Selected block" });
  await inspector.getByLabel("Heading", { exact: true }).fill("Version one");
  await inspector.getByLabel("Subheading (optional)").fill("Made by the e2e suite");

  // a spacer, moved above the hero with the keyboard-accessible arrows
  await addBlock(page, "Spacer");
  await outline(page).getByRole("button", { name: "Move Spacer up" }).click();
  await expect(outline(page).getByRole("listitem").first()).toContainText("Spacer");
  await outline(page).getByRole("button", { name: "Move Spacer down" }).click();
  await expect(outline(page).getByRole("listitem").first()).toContainText("Hero");

  // a global section without its handle is caught before saving, then removed
  await addBlock(page, "Global section");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Fix the highlighted fields.", { exact: true })).toBeVisible();
  await expect(inspector.getByText("Required")).toBeVisible();
  await outline(page).getByRole("button", { name: "Actions for Global section" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  expect(await storeHeading()).toBeNull();

  // preview link: opens the saved draft on the storefront
  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("dialog", { name: "Preview the draft" });
  await preview.getByRole("button", { name: "Create link" }).click();
  const link = preview.getByRole("textbox", { name: "Preview link" });
  await expect(link).toHaveValue(new RegExp(`/api/preview\\?handle=${handle}&token=`));
  const previewTab = await context.newPage();
  await previewTab.goto(await link.inputValue());
  await expect(previewTab.getByRole("heading", { name: "Version one" })).toBeVisible();
  await previewTab.close();
  await page.keyboard.press("Escape");

  // publish with a note
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const publish = page.getByRole("dialog", { name: new RegExp(`Publish ${title}`) });
  await publish.getByLabel("Note (optional)").fill("First version");
  await publish.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByText(`${title} is live`)).toBeVisible();
  await expect.poll(storeHeading).toBe("Version one");
  const versions = page.getByRole("region", { name: "Versions" });
  await expect(versions.getByText("Version 1")).toBeVisible();
  await expect(versions.getByText(/First version/)).toBeVisible();

  // edit and publish again (publishing saves the changes first)
  await outline(page).getByRole("button", { name: /^Hero/ }).click();
  await inspector.getByLabel("Heading", { exact: true }).fill("Version two");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect.poll(storeHeading).toBe("Version two");

  // roll back to the first version
  await expect(versions.getByText("Version 2")).toBeVisible();
  await versions
    .getByRole("listitem")
    .filter({ hasText: "Version 1" })
    .getByRole("button", { name: "Roll back" })
    .click();
  await page.getByRole("button", { name: "Roll back and publish" }).click();
  await expect(page.getByText("Version 1 is live again")).toBeVisible();
  await expect.poll(storeHeading).toBe("Version one");
  await expect(versions.getByText("Version 3")).toBeVisible();

  // listed with its state
  await page.goto(`/admin/pages?q=${handle}`);
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row.getByText("Live")).toBeVisible();
});
