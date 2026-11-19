"use server";

import { refresh } from "next/cache";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { FormState } from "../account/actions";
import { readApplication } from "./application";
import { readPayoutLabel, readPayoutMethod } from "./payout-method-input";

// Affiliate program actions (plan B-Phases 2–3). Messages are codes the forms translate
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

// API error code → message code, per action; anything else becomes the fallback.
function messageFor(err: unknown, map: Partial<Record<string, string>>, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  return map[err.code] ?? (err.code === "RATE_LIMITED" ? "RATE_LIMITED" : fallback);
}

const idOf = (form: FormData) => {
  const id = form.get("id");
  return typeof id === "string" && /^[\w-]{1,64}$/.test(id) ? id : null;
};

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

// ── Payout methods ───────────────────────────────────────────────────────────

// After saving, nothing of the account is sent back: the list shows the API's masked number.
export async function addPayoutMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const { values, errors, body } = readPayoutMethod(form);
  if (!body) return { ok: false, errors, values };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).POST("/v1/affiliate/payout-methods", { body }));
  } catch (err) {
    const message = messageFor(
      err,
      { VALIDATION_FAILED: "PAYOUT_METHOD_INVALID", BAD_REQUEST: "TOO_MANY_METHODS" },
      "PAYOUT_METHOD_FAILED",
    );
    return { ok: false, errors: {}, values, message };
  }
  refresh();
  return { ok: true, errors: {} };
}

export async function renamePayoutMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const id = idOf(form);
  const { label, error } = readPayoutLabel(form);
  if (!id) return { ok: false, errors: {}, message: "PAYOUT_METHOD_FAILED" };
  if (!label) return { ok: false, errors: { label: error ?? "required" } };
  try {
    const ctx = await requestContext();
    await unwrap(
      serverApi(ctx).PATCH("/v1/affiliate/payout-methods/{id}", { params: { path: { id } }, body: { label } }),
    );
  } catch (err) {
    return {
      ok: false,
      errors: {},
      message: messageFor(err, { NOT_FOUND: "PAYOUT_METHOD_GONE" }, "PAYOUT_METHOD_FAILED"),
    };
  }
  refresh();
  return { ok: true, errors: {} };
}

export async function makeDefaultPayoutMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const id = idOf(form);
  if (!id) return { ok: false, errors: {}, message: "PAYOUT_METHOD_FAILED" };
  try {
    const ctx = await requestContext();
    await unwrap(
      serverApi(ctx).PATCH("/v1/affiliate/payout-methods/{id}", {
        params: { path: { id } },
        body: { isDefault: true },
      }),
    );
  } catch (err) {
    return {
      ok: false,
      errors: {},
      message: messageFor(err, { NOT_FOUND: "PAYOUT_METHOD_GONE" }, "PAYOUT_METHOD_FAILED"),
    };
  }
  refresh();
  return { ok: true, errors: {} };
}

export async function removePayoutMethod(_prev: FormState, form: FormData): Promise<FormState> {
  const id = idOf(form);
  if (!id) return { ok: false, errors: {}, message: "PAYOUT_METHOD_FAILED" };
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).DELETE("/v1/affiliate/payout-methods/{id}", { params: { path: { id } } }));
  } catch (err) {
    // removed already (another tab): the refreshed list shows that
    if (!(err instanceof ApiError && err.code === "NOT_FOUND")) {
      return { ok: false, errors: {}, message: messageFor(err, {}, "PAYOUT_METHOD_FAILED") };
    }
  }
  refresh();
  return { ok: true, errors: {} };
}

// ── Payout requests ──────────────────────────────────────────────────────────

export async function requestPayout(): Promise<FormState> {
  try {
    const ctx = await requestContext();
    await unwrap(serverApi(ctx).POST("/v1/affiliate/payouts/request"));
  } catch (err) {
    const message = messageFor(
      err,
      {
        PAYOUT_BELOW_MINIMUM: "PAYOUT_BELOW_MINIMUM",
        // "Add a payout method first"
        BAD_REQUEST: "NO_PAYOUT_METHOD",
        CONFLICT: "PAYOUT_IN_PROGRESS",
        // payouts are batched on a schedule (or the session is an impersonation)
        FORBIDDEN: "PAYOUT_SCHEDULED",
      },
      "PAYOUT_REQUEST_FAILED",
    );
    return { ok: false, errors: {}, message };
  }
  refresh();
  return { ok: true, errors: {}, message: "PAYOUT_REQUESTED" };
}

// ── Marketing assets ─────────────────────────────────────────────────────────

export type AssetLinkState = { ok: boolean; message?: string; trackedPath?: string };

// The asset's tracked link (credits the asset and counts as a download in its analytics).
export async function getAssetLink(_prev: AssetLinkState, form: FormData): Promise<AssetLinkState> {
  const id = idOf(form);
  if (!id) return { ok: false, message: "ASSET_FAILED" };
  try {
    const ctx = await requestContext();
    const asset = await unwrap(serverApi(ctx).POST("/v1/affiliate/assets/{id}/download", { params: { path: { id } } }));
    return { ok: true, trackedPath: asset.trackedPath };
  } catch (err) {
    return { ok: false, message: messageFor(err, { NOT_FOUND: "ASSET_GONE" }, "ASSET_FAILED") };
  }
}
