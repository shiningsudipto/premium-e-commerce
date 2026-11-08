// Reviews and Q&A as the product page shows them.
//
// The generated client (src/api/schema.d.ts) has no response schema for the store review and
// question endpoints (their routes in premium-ec-backend declare none), so their bodies arrive
// untyped. These readers narrow the raw JSON field by field and drop anything malformed, in the
// same way toMenuLinks() treats menu JSON. Once the API documents the responses, replace these
// view types with ones derived from `paths`.

export type ReviewSort = "newest" | "helpful" | "highest" | "lowest";
export const REVIEW_SORTS: readonly ReviewSort[] = ["newest", "helpful", "highest", "lowest"];
export const isReviewSort = (v: unknown): v is ReviewSort => REVIEW_SORTS.includes(v as ReviewSort);

export type ReviewView = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  verifiedBuyer: boolean;
  helpfulCount: number;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export type RatingSummary = { average: number | null; count: number; distribution: Record<number, number> };

export type ReviewPage = {
  summary: RatingSummary;
  items: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
};

export type AnswerView = { id: string; body: string; createdAt: string };
export type QuestionView = { id: string; body: string; createdAt: string; answers: AnswerView[] };
export type QuestionPage = { items: QuestionView[]; nextCursor: string | null };

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
// dates come as ISO strings over JSON
const date = (v: unknown): string | null => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null);

function toReview(raw: unknown): ReviewView | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const rating = num(raw.rating);
  const body = str(raw.body);
  const createdAt = date(raw.createdAt);
  if (!id || rating === null || rating < 1 || rating > 5 || body === null || !createdAt) return null;
  return {
    id,
    rating: Math.round(rating),
    title: str(raw.title) || null,
    body,
    author: str(raw.author) || "",
    verifiedBuyer: raw.verifiedBuyer === true,
    helpfulCount: Math.max(0, num(raw.helpfulCount) ?? 0),
    reply: str(raw.reply) || null,
    repliedAt: date(raw.repliedAt),
    createdAt,
  };
}

export function toReviewPage(raw: unknown): ReviewPage | null {
  if (!isObject(raw) || !isObject(raw.summary) || !Array.isArray(raw.items)) return null;
  const s = raw.summary;
  const distribution: Record<number, number> = {};
  const rawDist = isObject(s.distribution) ? s.distribution : {};
  for (const r of [1, 2, 3, 4, 5]) distribution[r] = Math.max(0, num(rawDist[String(r)]) ?? 0);
  const items = raw.items.map(toReview).filter((r): r is ReviewView => r !== null);
  const average = num(s.average);
  return {
    summary: {
      average: average !== null && average > 0 ? average : null,
      count: Math.max(0, num(s.count) ?? 0),
      distribution,
    },
    items,
    total: Math.max(0, num(raw.total) ?? items.length),
    page: Math.max(1, num(raw.page) ?? 1),
    pageSize: Math.max(1, num(raw.pageSize) ?? (items.length || 1)),
  };
}

export const hasMoreReviews = (p: Pick<ReviewPage, "page" | "pageSize" | "total">) => p.page * p.pageSize < p.total;

function toAnswer(raw: unknown): AnswerView | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const body = str(raw.body);
  const createdAt = date(raw.createdAt);
  return id && body && createdAt ? { id, body, createdAt } : null;
}

export function toQuestionPage(raw: unknown): QuestionPage | null {
  if (!isObject(raw) || !Array.isArray(raw.items)) return null;
  const items = raw.items.flatMap((q): QuestionView[] => {
    if (!isObject(q)) return [];
    const id = str(q.id);
    const body = str(q.body);
    const createdAt = date(q.createdAt);
    if (!id || !body || !createdAt) return [];
    const answers = Array.isArray(q.answers) ? q.answers.map(toAnswer).filter((a): a is AnswerView => !!a) : [];
    return [{ id, body, createdAt, answers }];
  });
  return { items, nextCursor: str(raw.nextCursor) || null };
}

// One bar per star rating, 5 first. Percentages are of all approved reviews in the
// distribution and are rounded so the bars read sensibly; they needn't add up to exactly 100.
export type RatingBar = { rating: number; count: number; percent: number };

export function ratingBars(distribution: Record<number, number>): RatingBar[] {
  const counts = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: Math.max(0, distribution[rating] ?? 0) }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  return counts.map((c) => ({ ...c, percent: total ? Math.round((c.count / total) * 100) : 0 }));
}

// "4.3" style: one decimal, never more than 5.
export const formatAverage = (average: number, locale: string) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    Math.min(5, Math.max(0, average)),
  );

// ── Form input (mirrors the API's limits so most mistakes are caught before the round trip) ──

export type FieldErrors = Record<string, string>;

export const REVIEW_LIMITS = { titleMax: 150, bodyMin: 10, bodyMax: 5000 } as const;
export const QUESTION_LIMITS = { bodyMin: 5, bodyMax: 1000 } as const;

export type ReviewInput = { rating: number; title?: string; body: string };

export function readReviewInput(values: { rating: string; title: string; body: string }): {
  input: ReviewInput | null;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};
  const rating = Number(values.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "ratingRequired";
  const title = values.title.trim();
  if (title.length > REVIEW_LIMITS.titleMax) errors.title = "titleTooLong";
  const body = values.body.trim();
  if (body.length < REVIEW_LIMITS.bodyMin) errors.body = "bodyTooShort";
  else if (body.length > REVIEW_LIMITS.bodyMax) errors.body = "bodyTooLong";
  if (Object.keys(errors).length) return { input: null, errors };
  return { input: { rating, body, ...(title ? { title } : {}) }, errors };
}

export function readQuestionInput(value: string): { body: string | null; error?: string } {
  const body = value.trim();
  if (body.length < QUESTION_LIMITS.bodyMin) return { body: null, error: "questionTooShort" };
  if (body.length > QUESTION_LIMITS.bodyMax) return { body: null, error: "questionTooLong" };
  return { body };
}
