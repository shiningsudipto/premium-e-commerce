import type { ReturnFieldErrors } from "./returns";

// State of the return request form (kept out of actions.ts: "use server" files export only
// actions). Error values and `messageKey` are keys under `returns.errors`; `message` is the
// API's own explanation (return window, final sale, quantity left), shown as is.
export type ReturnFormState = {
  ok: boolean;
  errors: ReturnFieldErrors;
  messageKey?: string;
  message?: string;
  values?: Record<string, string>;
};

export const initialReturnForm: ReturnFormState = { ok: false, errors: {} };
