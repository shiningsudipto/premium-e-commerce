"use server";

import { refresh } from "next/cache";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { FormState } from "../account/actions";
import { readApplication } from "./application";

// Affiliate program actions (plan B-Phase 2). Messages are codes the forms translate
// (affiliate.errors.*); field errors use the shared forms.errors.* codes.

function failure(err: unknown, fallback: string): Pick<FormState, "errors" | "message"> {
  if (!(err instanceof ApiError)) return { errors: {}, message: fallback };
  // CUSTOM_FIELDS_INVALID carries z.flattenError(): { fieldErrors: { website: [...] } }
  const details = err.details as { fieldErrors?: Record<string, string[]> } | undefined;
  const errors: Record<string, string> = {};
  for (const key of Object.keys(details?.fieldErrors ?? {})) errors[key] = "invalid";
  const known = ["CUSTOM_FIELDS_INVALID", "CONFLICT", "RATE_LIMITED", "FEATURE_DISABLED", "NOT_FOUND"];
  return { errors, message: known.includes(err.code) ? err.code : fallback };
}

export async function applyForAffiliate(_prev: FormState, form: FormData): Promise<FormState> {
  const { values, errors, application } = readApplication(form);
  const acceptTerms = form.get("acceptTerms") === "on";
  if (!acceptTerms) errors.acceptTerms = "termsRequired";
  if (Object.keys(errors).length) return { ok: false, errors, values };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).POST("/v1/store/affiliate/apply", { body: { application, acceptTerms } }));
  } catch (err) {
    // applied already (another tab): show the current status instead of an error
    if (err instanceof ApiError && err.code === "CONFLICT") {
      refresh();
      return { ok: true, errors: {} };
    }
    return { ok: false, values, ...failure(err, "APPLY_FAILED") };
  }
  refresh();
  return { ok: true, errors: {} };
}

export async function acceptAffiliateTerms(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("acceptTerms") !== "on") return { ok: false, errors: { acceptTerms: "termsRequired" } };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).POST("/v1/affiliate/terms/accept"));
  } catch (err) {
    return { ok: false, ...failure(err, "TERMS_FAILED") };
  }
  refresh();
  return { ok: true, errors: {} };
}
