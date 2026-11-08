import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, unwrap } from "../../api/errors";
import { serverApi } from "../../api/server";
import type { MarketRef } from "../../lib/market";
import { toQuestionPage, toReviewPage, type QuestionPage, type ReviewPage, type ReviewSort } from "./parse";

// Public review and question lists, shared by every visitor and cached per market and product.
//
// - `product:handle:…` is the tag premium-ec-backend's worker revalidates on review.approved,
//   review.rejected and question.approved, so newly published content shows up promptly.
// - `reviews:…` is ours: the review, question and helpful-vote actions expire it (updateTag)
//   so a shopper sees their own change straight away.
// - Some changes send no event at all (a merchant reply added to an already approved review, or
//   other shoppers' helpful votes), so the entry also expires on a short timer.
export const reviewsTag = (handle: string) => `reviews:${handle}`;
const LIFE = { stale: 300, revalidate: 900, expire: 86_400 };

export const REVIEWS_PAGE_SIZE = 5;
export const QUESTIONS_PAGE_SIZE = 5;

// A definite "no" from the API (flag off, product gone) is cached as null like any answer.
// Other failures (API down, timeouts) throw out of the cached function so they aren't kept,
// and the exported readers turn them into null: the section is left out for that render
// rather than breaking the product page.
const refusal = (err: unknown) =>
  err instanceof ApiError && (err.status === 404 || err.code === "FEATURE_DISABLED" || err.code === "NOT_FOUND");

async function cachedReviewPage(
  market: MarketRef,
  handle: string,
  sort: ReviewSort,
  page: number,
): Promise<ReviewPage | null> {
  "use cache";
  cacheTag(`product:handle:${handle}`, reviewsTag(handle));
  cacheLife(LIFE);
  try {
    const raw: unknown = await unwrap(
      serverApi({ market }).GET("/v1/store/products/{handle}/reviews", {
        params: { path: { handle }, query: { sort, page, pageSize: REVIEWS_PAGE_SIZE } },
      }),
    );
    return toReviewPage(raw);
  } catch (err) {
    if (refusal(err)) return null;
    throw err;
  }
}

async function cachedQuestionPage(
  market: MarketRef,
  handle: string,
  cursor: string | null,
): Promise<QuestionPage | null> {
  "use cache";
  cacheTag(`product:handle:${handle}`, reviewsTag(handle));
  cacheLife(LIFE);
  try {
    const raw: unknown = await unwrap(
      serverApi({ market }).GET("/v1/store/products/{handle}/questions", {
        params: { path: { handle }, query: { limit: QUESTIONS_PAGE_SIZE, ...(cursor ? { cursor } : {}) } },
      }),
    );
    return toQuestionPage(raw);
  } catch (err) {
    if (refusal(err)) return null;
    throw err;
  }
}

export const getReviewPage = (market: MarketRef, handle: string, sort: ReviewSort, page: number) =>
  cachedReviewPage(market, handle, sort, page).catch(() => null);

export const getQuestionPage = (market: MarketRef, handle: string, cursor: string | null) =>
  cachedQuestionPage(market, handle, cursor).catch(() => null);
