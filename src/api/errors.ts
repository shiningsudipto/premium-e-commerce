import type { components } from "./schema";

export type ApiErrorBody = components["schemas"]["Error"];

// Thrown by unwrap() so callers can branch on the API's stable error codes.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorBody["code"] | "NETWORK_ERROR",
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  const b = body as Partial<ApiErrorBody> | undefined;
  return new ApiError(
    status,
    b?.code ?? "INTERNAL_ERROR",
    b?.message ?? `API request failed with ${status}`,
    b?.details,
  );
}

// openapi-fetch returns { data, error, response }; this turns the error branch into a throw.
export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined || !response.ok) throw toApiError(response.status, error);
  return data as T;
}
