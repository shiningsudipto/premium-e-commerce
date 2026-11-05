import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

// RTK Query talks to the Express API directly (ADR 0012). The staff session lives in httpOnly
// cookies the API sets on /v1/admin/session/*, so requests include credentials and no token is
// ever handled here. Endpoints aren't written by hand: `npm run api:generate` injects them from
// the API's OpenAPI document into api.generated.ts.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const rawBaseQuery = fetchBaseQuery({ baseUrl: API_URL, credentials: "include" });

type ApiErrorData = { code?: string; message?: string };
const codeOf = (error: FetchBaseQueryError | undefined) => (error?.data as ApiErrorData | undefined)?.code;

// One refresh at a time: the API revokes the whole session when a rotated refresh token is
// presented twice, so parallel requests that all hit an expired token wait for the same refresh.
let refreshing: Promise<boolean> | null = null;

function refreshSession(api: Parameters<BaseQueryFn>[1], extra: Parameters<BaseQueryFn>[2]) {
  refreshing ??= Promise.resolve(rawBaseQuery({ url: "/v1/admin/session/refresh", method: "POST" }, api, extra))
    .then((result) => !result.error)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function goToSignIn() {
  if (typeof window === "undefined" || /^\/admin\/(login|mfa)/.test(location.pathname)) return;
  // a full load, so nothing cached from the ended session survives
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  location.assign(`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`);
}

const SESSION_ENDPOINT = /\/v1\/admin\/session\//;

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  let result = await rawBaseQuery(args, api, extra);
  const url = typeof args === "string" ? args : args.url;
  if (result.error?.status !== 401 || SESSION_ENDPOINT.test(url)) return result;

  if (codeOf(result.error) === "TOKEN_EXPIRED" || codeOf(result.error) === "UNAUTHENTICATED") {
    if (await refreshSession(api, extra)) result = await rawBaseQuery(args, api, extra);
  }
  if (result.error?.status === 401) goToSignIn();
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  // data is kept for a minute after the last screen using it goes away
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
