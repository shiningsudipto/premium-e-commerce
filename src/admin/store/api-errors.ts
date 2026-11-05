import type { components } from "../../api/schema";

// The API answers errors as { code, message, details }. RTK Query wraps that in
// { status, data }; network failures come back as { status: "FETCH_ERROR" }.

export type ApiErrorBody = components["schemas"]["Error"];

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}

// The API's error body from an RTK Query error (or an error body itself), if there is one.
export function apiErrorBody(error: unknown): ApiErrorBody | null {
  const candidate =
    typeof error === "object" && error !== null && "data" in error ? (error as { data: unknown }).data : error;
  return isErrorBody(candidate) ? candidate : null;
}

export const errorCode = (error: unknown) => apiErrorBody(error)?.code;

// Field-level messages from a VALIDATION_FAILED response (z.flattenError on the API side).
export function fieldErrors(error: unknown): Record<string, string[]> {
  const body = apiErrorBody(error);
  if (body?.code !== "VALIDATION_FAILED") return {};
  const details = body.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  return { ...(details?.fieldErrors ?? {}), ...(details?.formErrors?.length ? { _form: details.formErrors } : {}) };
}

export function errorMessage(error: unknown): string {
  const body = apiErrorBody(error);
  if (!body) {
    const status = (error as { status?: unknown } | null)?.status;
    return status === "FETCH_ERROR" ? "The API is unavailable right now." : "Something went wrong. Please try again.";
  }
  if (body.code === "VERSION_CONFLICT")
    return "Someone else changed this in the meantime. The latest version is loaded.";
  const first = Object.entries(fieldErrors(error))[0];
  return first ? `${body.message}: ${first[0] === "_form" ? "" : `${first[0]} `}${first[1][0]}` : body.message;
}
