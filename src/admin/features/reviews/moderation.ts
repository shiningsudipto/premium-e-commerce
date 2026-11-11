import type { GetV1AdminModerationApiResponse } from "../../store/api.generated";

// Pure helpers for the moderation queue. They mirror the API's rules (reviews.service.ts and
// the admin moderation routes); the API still decides.

export type ModerationKind = GetV1AdminModerationApiResponse["kind"];
export type ReviewRow = Extract<GetV1AdminModerationApiResponse, { kind: "reviews" }>["items"][number];
export type QuestionRow = Extract<GetV1AdminModerationApiResponse, { kind: "questions" }>["items"][number];
export type ModerationStatus = ReviewRow["status"];
export type Decision = Exclude<ModerationStatus, "PENDING">;

export const MODERATION_STATUSES: ModerationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const REPLY_MAX = 2000;
export const ANSWER_MAX = 2000;

export const parseKind = (value: string | undefined): ModerationKind =>
  value === "questions" ? "questions" : "reviews";

// The API's queue shows pending items unless asked otherwise.
export const parseStatus = (value: string | undefined): ModerationStatus =>
  MODERATION_STATUSES.includes(value as ModerationStatus) ? (value as ModerationStatus) : "PENDING";

export function moderationStatusVariant(status: ModerationStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  return "outline";
}

// The decisions that change an item in this status (approving an approved review is a no-op).
export const decisionsFor = (status: ModerationStatus): Decision[] =>
  (["APPROVED", "REJECTED"] as const).filter((d) => d !== status);

// Selected items a bulk decision would actually change.
export const changedBy = <T extends { status: ModerationStatus }>(rows: T[], decision: Decision) =>
  rows.filter((r) => r.status !== decision);

// Staff see the reviewer's full name and email (shoppers only see "First L.").
export function reviewAuthor(customer: ReviewRow["customer"]): { name: string; email: string | null } {
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  return { name: name || customer.email || "Customer", email: customer.email };
}

export const starLabel = (rating: number) => `${rating} out of 5 stars`;

// The reply as the API wants it: trimmed; empty removes the reply (null). Error text when invalid.
export function replyPayload(text: string): { reply: string | null } | { error: string } {
  const reply = text.trim();
  if (reply.length > REPLY_MAX) return { error: `Keep the reply under ${REPLY_MAX} characters` };
  return { reply: reply || null };
}

export function answerPayload(text: string): { answer: string } | { error: string } {
  const answer = text.trim();
  if (!answer) return { error: "Write an answer first" };
  if (answer.length > ANSWER_MAX) return { error: `Keep the answer under ${ANSWER_MAX} characters` };
  return { answer };
}

// "3 approved", "2 approved, 1 failed": the toast after a bulk decision.
export function bulkSummary(decision: Decision, results: PromiseSettledResult<unknown>[]): string {
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;
  const verb = decision === "APPROVED" ? "approved" : "rejected";
  return failed ? `${ok} ${verb}, ${failed} failed` : `${ok} ${verb}`;
}
