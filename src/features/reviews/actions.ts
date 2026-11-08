"use server";

import { updateTag } from "next/cache";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { getQuestionPage, getReviewPage, reviewsTag } from "./data";
import {
  isReviewSort,
  readQuestionInput,
  readReviewInput,
  type FieldErrors,
  type QuestionPage,
  type ReviewPage,
} from "./parse";
import type { CommunityFormState, HelpfulResult } from "./state";

// Reviews and Q&A mutations (plan B-Phase 2). They call the API as the signed-in customer and
// expire this product's review cache so the shopper sees their change on the next render.

const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v : "";
};

const HANDLE = /^[a-z0-9][a-z0-9-]{0,199}$/i;

// API error → a key under `reviews.errors` (or the API's own message when there's no key).
function failure(err: unknown, values: Record<string, string>): CommunityFormState {
  if (!(err instanceof ApiError)) return { ok: false, errors: {}, messageKey: "failed", values };
  const keys: Partial<Record<ApiError["code"], string>> = {
    ALREADY_EXISTS: "alreadyReviewed",
    REVIEW_NOT_ALLOWED: "notAllowed",
    UNAUTHENTICATED: "signInAgain",
    TOKEN_EXPIRED: "signInAgain",
    FORBIDDEN: "signInAgain",
    FEATURE_DISABLED: "unavailable",
    RATE_LIMITED: "rateLimited",
    NOT_FOUND: "unavailable",
  };
  if (err.code === "VALIDATION_FAILED") {
    const errors: FieldErrors = {};
    const fieldErrors = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {};
    for (const k of Object.keys(fieldErrors)) errors[k] = "invalid";
    return { ok: false, errors, messageKey: Object.keys(errors).length ? undefined : "failed", values };
  }
  const key = keys[err.code];
  return key
    ? { ok: false, errors: {}, messageKey: key, values }
    : { ok: false, errors: {}, message: err.message, values };
}

export async function submitReview(_prev: CommunityFormState, form: FormData): Promise<CommunityFormState> {
  const handle = text(form, "handle");
  const values = { rating: text(form, "rating"), title: text(form, "title"), body: text(form, "body") };
  if (!HANDLE.test(handle)) return { ok: false, errors: {}, messageKey: "failed", values };
  const { input, errors } = readReviewInput(values);
  if (!input) return { ok: false, errors, values };
  try {
    const ctx = await requestContext();
    if (ctx.kind !== "customer") return { ok: false, errors: {}, messageKey: "signInAgain", values };
    const created: unknown = await unwrap(
      serverApi(ctx).POST("/v1/store/products/{handle}/reviews", { params: { path: { handle } }, body: input }),
    );
    const published = (created as { status?: unknown } | null)?.status === "APPROVED";
    if (published) updateTag(reviewsTag(handle));
    return { ok: true, errors: {}, published };
  } catch (err) {
    return failure(err, values);
  }
}

export async function askQuestion(_prev: CommunityFormState, form: FormData): Promise<CommunityFormState> {
  const handle = text(form, "handle");
  const values = { body: text(form, "body") };
  if (!HANDLE.test(handle)) return { ok: false, errors: {}, messageKey: "failed", values };
  const { body, error } = readQuestionInput(values.body);
  if (!body) return { ok: false, errors: { body: error ?? "invalid" }, values };
  try {
    const ctx = await requestContext();
    if (ctx.kind !== "customer") return { ok: false, errors: {}, messageKey: "signInAgain", values };
    await unwrap(
      serverApi(ctx).POST("/v1/store/products/{handle}/questions", { params: { path: { handle } }, body: { body } }),
    );
    // questions are published once staff answer or approve them; nothing to expire yet
    return { ok: true, errors: {} };
  } catch (err) {
    return failure(err, values);
  }
}

// Helpful votes count once per customer (the API ignores repeats).
export async function voteHelpful(handle: string, reviewId: string): Promise<HelpfulResult> {
  if (!HANDLE.test(handle) || typeof reviewId !== "string" || !reviewId || reviewId.length > 64)
    return { ok: false, reason: "failed" };
  try {
    const ctx = await requestContext();
    if (ctx.kind !== "customer") return { ok: false, reason: "signIn" };
    const result: unknown = await unwrap(
      serverApi(ctx).POST("/v1/store/reviews/{id}/helpful", { params: { path: { id: reviewId } } }),
    );
    updateTag(reviewsTag(handle));
    const count = (result as { helpfulCount?: unknown } | null)?.helpfulCount;
    return typeof count === "number" ? { ok: true, helpfulCount: count } : { ok: false, reason: "failed" };
  } catch (err) {
    if (err instanceof ApiError) {
      if (["UNAUTHENTICATED", "TOKEN_EXPIRED", "FORBIDDEN"].includes(err.code)) return { ok: false, reason: "signIn" };
      if (err.code === "BAD_REQUEST") return { ok: false, reason: "own" };
    }
    return { ok: false, reason: "failed" };
  }
}

// "Show more" and re-sorting: further pages come from the same shared cache as the first.
export async function loadReviews(handle: string, sort: string, page: number): Promise<ReviewPage | null> {
  if (!HANDLE.test(handle) || !isReviewSort(sort) || !Number.isInteger(page) || page < 1 || page > 1000) return null;
  const ctx = await requestContext();
  return getReviewPage(ctx.market, handle, sort, page);
}

export async function loadQuestions(handle: string, cursor: string): Promise<QuestionPage | null> {
  if (!HANDLE.test(handle) || typeof cursor !== "string" || !cursor || cursor.length > 64) return null;
  const ctx = await requestContext();
  return getQuestionPage(ctx.market, handle, cursor);
}
