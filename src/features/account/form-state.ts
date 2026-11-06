import type { FormState } from "./actions";

// Starting state for account forms (kept out of actions.ts: "use server" files export only actions).
export const initialForm: FormState = { ok: false, errors: {} };
