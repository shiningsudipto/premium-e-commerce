import type { FieldErrors } from "./parse";

// Form states for the review and question forms (kept out of actions.ts: "use server" files
// export only actions). `messageKey` is a key under the `reviews.errors` namespace; `message`
// is the API's own text, used when there is no key for its error.
export type CommunityFormState = {
  ok: boolean;
  errors: FieldErrors;
  messageKey?: string;
  message?: string;
  values?: Record<string, string>;
  // a review was published straight away (auto-approve) rather than queued for moderation
  published?: boolean;
};

export const initialCommunityForm: CommunityFormState = { ok: false, errors: {} };

export type HelpfulResult = { ok: true; helpfulCount: number } | { ok: false; reason: "signIn" | "own" | "failed" };
