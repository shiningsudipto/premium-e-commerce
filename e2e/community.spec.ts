import { expect, test, type Page } from "@playwright/test";

// B-Phase 2 community features: reviews and Q&A on the product page (flags `reviews`, `qna`)
// and the returns portal in the account. Sections whose flag is off are expected to be absent,
// and the tests that need them skip.
//
// Creates customer accounts (e2e+community-…@example.com), at most one review and one question
// per run, all uniquely named, in the API's database.

const API = process.env.API_URL ?? "http://localhost:4000";
const MARKET = process.env.E2E_MARKET ?? "en-bd";

// accounts and reviews per run are enough on one viewport
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
});

async function firstProduct() {
  const res = await fetch(`${API}/v1/store/products?pageSize=1&facets=false`);
  expect(res.ok, "the API lists products").toBe(true);
  const listing = (await res.json()) as { items: { handle: string; title: string }[] };
  return listing.items[0] ?? null;
}

// the API answers FEATURE_DISABLED when the section's flag is off
const apiOk = async (path: string) => (await fetch(`${API}${path}`).catch(() => null))?.ok === true;

async function registerCustomer(page: Page, tag: string) {
  const email = `e2e+community-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
  await page.goto(`/${MARKET}/account/register`);
  const form = page.getByTestId("register-form");
  await form.getByRole("textbox", { name: "First name" }).fill("Community");
  await form.getByRole("textbox", { name: "Email" }).fill(email);
  await form.getByLabel("Password").fill("correct horse battery staple");
  await form.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL(new RegExp(`/${MARKET}/account$`));
  return email;
}

test.describe("reviews and Q&A", () => {
  test("signed-out shoppers see the flagged sections with a sign-in link back to the product", async ({ page }) => {
    const product = await firstProduct();
    test.skip(!product, "no products in this store");
    const handle = product!.handle;
    const [reviewsOn, qnaOn] = await Promise.all([
      apiOk(`/v1/store/products/${handle}/reviews`),
      apiOk(`/v1/store/products/${handle}/questions`),
    ]);

    await page.goto(`/${MARKET}/products/${handle}`);
    await expect(page.getByRole("heading", { level: 1, name: product!.title })).toBeVisible();

    const reviews = page.getByTestId("reviews");
    const questions = page.getByTestId("questions");
    if (reviewsOn) {
      await expect(reviews.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();
      await expect(reviews.getByTestId("review-sign-in")).toHaveAttribute(
        "href",
        `/${MARKET}/account/sign-in?next=${encodeURIComponent(`/${MARKET}/products/${handle}#reviews`)}`,
      );
    } else {
      await expect(reviews).toHaveCount(0);
    }
    if (qnaOn) {
      await expect(questions.getByRole("heading", { level: 2, name: "Questions & answers" })).toBeVisible();
      await expect(questions.getByTestId("question-sign-in")).toBeVisible();
    } else {
      await expect(questions).toHaveCount(0);
    }

    test.skip(!reviewsOn, "reviews are switched off");
    await reviews.getByTestId("review-sign-in").click();
    await page.waitForURL(/\/account\/sign-in\?next=/);
    await expect(page.getByTestId("sign-in-form")).toBeVisible();
  });

  test("a customer writes one review (a second is refused) and asks a question", async ({ page }) => {
    const product = await firstProduct();
    test.skip(!product, "no products in this store");
    const handle = product!.handle;
    const [reviewsOn, qnaOn] = await Promise.all([
      apiOk(`/v1/store/products/${handle}/reviews`),
      apiOk(`/v1/store/products/${handle}/questions`),
    ]);
    test.skip(!reviewsOn && !qnaOn, "reviews and Q&A are switched off");

    await registerCustomer(page, "review");
    await page.goto(`/${MARKET}/products/${handle}`);

    if (reviewsOn) {
      const reviews = page.getByTestId("reviews");
      const writeReview = async () => {
        await reviews.getByText("Write a review").click();
        const form = reviews.getByTestId("review-form");
        // the rating is a radio group: keyboard users move through it with the arrow keys
        await form.getByRole("radio", { name: "3 stars" }).focus();
        await page.keyboard.press("ArrowRight");
        await expect(form.getByRole("radio", { name: "4 stars" })).toBeChecked();
        await form
          .getByRole("textbox", { name: "Your review" })
          .fill(`E2E review ${Date.now()}: sturdy and well made.`);
        await form.getByRole("button", { name: "Submit review" }).click();
      };

      // a submission without a rating is stopped before the API
      await reviews.getByText("Write a review").click();
      await reviews.getByRole("button", { name: "Submit review" }).click();
      await expect(reviews.getByText("Choose a rating from 1 to 5 stars.")).toBeVisible();
      await page.reload();

      await writeReview();
      const thanks = reviews.getByTestId("review-thanks");
      const refused = reviews.getByRole("alert");
      await expect(thanks.or(refused)).toBeVisible();
      if (await thanks.isVisible()) {
        // one review per product: the API's refusal is explained
        await page.reload();
        await writeReview();
        await expect(reviews.getByRole("alert")).toHaveText(
          "You've already reviewed this product. Thanks for sharing!",
        );
      } else {
        // the store only accepts reviews from buyers
        await expect(refused).toHaveText("Only customers who bought this product can review it.");
      }
    }

    if (qnaOn) {
      const questions = page.getByTestId("questions");
      await questions.getByText("Ask a question").click();
      const form = questions.getByTestId("question-form");
      await form
        .getByRole("textbox", { name: "Your question" })
        .fill(`E2E question ${Date.now()}: does it fit a laptop?`);
      await form.getByRole("button", { name: "Send question" }).click();
      await expect(questions.getByTestId("question-thanks")).toBeVisible();
    }
  });
});

test.describe("returns portal", () => {
  test("a new customer's returns page is empty and points to their orders", async ({ page }) => {
    await registerCustomer(page, "returns");
    await page.goto(`/${MARKET}/account/returns`);
    await expect(page.getByRole("heading", { level: 2, name: "Returns" })).toBeVisible();
    const empty = page.getByTestId("returns-empty");
    await expect(empty).toBeVisible();
    await empty.getByRole("link", { name: "View your orders" }).click();
    await page.waitForURL(new RegExp(`/${MARKET}/account/orders$`));
  });

  test("signed-out shoppers are sent to sign in", async ({ page }) => {
    await page.goto(`/${MARKET}/account/returns`);
    await page.waitForURL(/\/account\/sign-in/);
  });
});
