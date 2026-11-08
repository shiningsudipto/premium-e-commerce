import { expect, test } from "@playwright/test";

// The bag is managed in the browser (RTK Query) with the API's session cookies. A signed-in
// shopper whose access cookie has expired must keep using their own bag: the API reports the
// expired session, the browser refreshes it and retries, instead of quietly adding to the guest
// bag the guest cookie still points at.
//
// Creates a customer account (e2e+…@example.com) in the API's database.

const PRODUCT = "/en-bd/products/leather-weekender-bag";

// one account per run is enough: the session logic doesn't depend on the viewport
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
});

test("an expired customer session is refreshed, and the item lands in the customer's bag", async ({
  page,
  context,
}) => {
  const email = `e2e+bag-${Date.now().toString(36)}@example.com`;
  // a guest bag first, so the guest cookie is there too (it survives sign-in)
  await page.goto(PRODUCT);
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByTestId("bag-drawer").getByTestId("bag-line")).toHaveCount(1);
  await page.keyboard.press("Escape");

  await page.goto("/en-bd/account/register");
  const form = page.getByTestId("register-form");
  await form.getByRole("textbox", { name: "First name" }).fill("Bag");
  await form.getByRole("textbox", { name: "Email" }).fill(email);
  await form.getByLabel("Password").fill("correct horse battery staple");
  await form.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL(/\/en-bd\/account$/);

  // the customer's bag now holds the merged guest item
  await page.goto(PRODUCT);
  const bag = page.getByTestId("bag-link");
  await expect(bag.locator(".cart-count")).toHaveText("1");

  // the access cookie runs out while the page is open
  await context.clearCookies({ name: "pe_at" });
  expect((await context.cookies()).map((c) => c.name)).toEqual(expect.arrayContaining(["pe_rt", "pe_guest"]));

  await page.getByRole("button", { name: "Add to bag" }).click();
  const line = page.getByTestId("bag-drawer").getByTestId("bag-line");
  await expect(line).toHaveCount(1);
  await expect(line.locator("output")).toHaveText("2");
  await expect(bag.locator(".cart-count")).toHaveText("2");
  // the session was renewed along the way
  expect((await context.cookies()).map((c) => c.name)).toContain("pe_at");
});
