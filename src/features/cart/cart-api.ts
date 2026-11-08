import {
  createApi,
  fetchBaseQuery,
  type BaseQueryApi,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { paths } from "../../api/schema";
import type { MarketRef } from "../../lib/market";
import type { Bag } from "./types";

// The shopper's bag, managed in the browser with RTK Query. Calls go straight to the API with the
// session cookies it sets (ADR 0012), the same way the admin's data layer works:
// - an expired customer session is refreshed once and the call retried;
// - the first "Add to bag" without any session starts a guest session (the API sets its cookie);
// - every mutation answers with the whole repriced cart, which replaces the cached bag, so the
//   header count, the drawer and the bag page stay in step without refetching.
// Request and response types come from the API's OpenAPI document (src/api/schema.d.ts).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CHANNEL = process.env.NEXT_PUBLIC_CHANNEL ?? "web";

// The store's thunk extra argument (bag-store.tsx).
export type BagExtra = { market: MarketRef };

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include",
  prepareHeaders: (headers, { extra }) => {
    const { market } = extra as BagExtra;
    headers.set("x-market", market.market);
    headers.set("x-locale", market.locale);
    headers.set("x-channel", CHANNEL);
    return headers;
  },
});

type ApiErrorData = { code?: string; message?: string };
export const errorCode = (error: unknown): string | undefined =>
  ((error as { data?: ApiErrorData } | undefined)?.data ?? (error as ApiErrorData | undefined))?.code;

// One refresh at a time: the API revokes the whole session when a rotated refresh token is
// presented twice, so parallel calls that all hit an expired token wait for the same refresh.
let refreshing: Promise<unknown> | null = null;

function refreshSession(api: BaseQueryApi, extra: object) {
  refreshing ??= Promise.resolve(
    rawBaseQuery({ url: "/v1/store/session/refresh", method: "POST" }, api, extra),
  ).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export const shopperBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  let result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401 && errorCode(result.error) === "TOKEN_EXPIRED") {
    // whether or not the refresh works, retry: a failed refresh clears the customer cookies and
    // the call goes on with the guest session (or none)
    await refreshSession(api, extra as object);
    result = await rawBaseQuery(args, api, extra);
  }
  return result;
};

type Json<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : never;
type Product = paths["/v1/store/products/{handle}"]["get"]["responses"]["200"]["content"]["application/json"];

// Failures carry the API's error body ({ code, message }), or one of ours in the same shape.
const own = (code: string): { error: FetchBaseQueryError } => ({
  error: { status: "CUSTOM_ERROR", error: code, data: { code } },
});
const fail = (error: FetchBaseQueryError) => ({ error });

// The code of a bag failure: the API's (INSUFFICIENT_STOCK, …), ours (CHOOSE_OPTIONS), or OFFLINE.
export function bagErrorCode(error: unknown): string | undefined {
  if ((error as FetchBaseQueryError | undefined)?.status === "FETCH_ERROR") return "OFFLINE";
  return errorCode(error);
}

const MESSAGES: Partial<Record<string, string>> = {
  INSUFFICIENT_STOCK: "Sorry, there isn't enough stock left for that.",
  PRICE_NOT_AVAILABLE: "This piece isn't sold in your market.",
  CART_NOT_ACTIVE: "Your bag is being checked out. Refresh and try again.",
  CHOOSE_OPTIONS: "Choose a colour or size first.",
  UNAVAILABLE: "This piece can't be added right now.",
  OFFLINE: "You seem to be offline. Please try again.",
};

// What to tell the shopper when a bag change fails.
export function bagErrorMessage(error: unknown): string {
  const code = bagErrorCode(error);
  return (code && MESSAGES[code]) ?? "Something went wrong. Please try again.";
}

export type AddToBagArg = { variantId?: string; handle?: string; quantity?: number };
export type LineArg = { cartId: string; lineId: string };

const CART = { url: "/v1/store/carts", method: "POST" } as const;

// Bag writes run one at a time, in the order the shopper made them: two quick changes to the
// same line (or a change, then removing it) must reach the API in that order. `keepalive` lets
// a write that has started finish even if the shopper leaves the page straight away.
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

// Writes that haven't been answered yet. Only the last one to settle replaces the cached bag
// with the API's answer; earlier answers would briefly undo the later optimistic changes.
let pendingWrites = 0;

export const bagApi = createApi({
  reducerPath: "bagApi",
  baseQuery: shopperBaseQuery,
  tagTypes: ["Bag"],
  // the bag changes from other tabs and at checkout: keep it briefly, refetch when it matters
  keepUnusedDataFor: 30,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    // The shopper's open bag. Without a session there is no bag (and none is created).
    getBag: build.query<Bag | null, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const result = await baseQuery(CART);
        if (result.error?.status === 401) return { data: null };
        if (result.error) return fail(result.error);
        return { data: result.data as Bag };
      },
      providesTags: ["Bag"],
    }),

    // variantId when the shopper chose one; otherwise the product's only variant. A product with
    // several fails with CHOOSE_OPTIONS so the caller can send the shopper to its page.
    addToBag: build.mutation<Bag, AddToBagArg>({
      queryFn: ({ variantId, handle, quantity = 1 }, _api, _extra, baseQuery) =>
        inOrder(async (): Promise<{ data: Bag } | { error: FetchBaseQueryError }> => {
          let variant = variantId;
          if (!variant && handle) {
            const product = await baseQuery(`/v1/store/products/${encodeURIComponent(handle)}`);
            if (product.error) return fail(product.error);
            const { variants } = product.data as Product;
            if (variants.length !== 1) return own("CHOOSE_OPTIONS");
            variant = variants[0]!.id;
          }
          if (!variant) return own("UNAVAILABLE");

          let cart = await baseQuery(CART);
          if (cart.error?.status === 401) {
            // first visit: the API starts a guest session and sets its cookie
            const guest = await baseQuery({ url: "/v1/store/session/guest", method: "POST" });
            if (guest.error) return fail(guest.error);
            cart = await baseQuery(CART);
          }
          if (cart.error) return fail(cart.error);

          const body: Json<"/v1/store/carts/{id}/lines", "post"> = { variantId: variant, quantity };
          const updated = await baseQuery({
            url: `/v1/store/carts/${encodeURIComponent((cart.data as Bag).id)}/lines`,
            method: "POST",
            body,
            keepalive: true,
          });
          if (updated.error) return fail(updated.error);
          return { data: updated.data as Bag };
        }),
      onQueryStarted: (_arg, api) => settle(api),
    }),

    // Quantity 0 removes the line. Shown at once; rolled back if the API refuses.
    setLineQuantity: build.mutation<Bag, LineArg & { quantity: number }>({
      queryFn: ({ cartId, lineId, quantity }, _api, _extra, baseQuery) => {
        const body: Json<"/v1/store/carts/{id}/lines/{lineId}", "patch"> = {
          quantity: Math.max(0, Math.min(999, Math.trunc(quantity))),
        };
        return write(baseQuery, { url: lineUrl(cartId, lineId), method: "PATCH", body });
      },
      onQueryStarted: ({ lineId, quantity }, api) => settle(api, (bag) => changeLine(bag, lineId, quantity)),
    }),

    removeLine: build.mutation<Bag, LineArg>({
      queryFn: ({ cartId, lineId }, _api, _extra, baseQuery) =>
        write(baseQuery, { url: lineUrl(cartId, lineId), method: "DELETE" }),
      onQueryStarted: ({ lineId }, api) => settle(api, (bag) => changeLine(bag, lineId, 0)),
    }),

    // Promotion codes. A code the API refuses outright (unknown, expired, used up, too many codes)
    // fails with its error; one whose conditions aren't met yet stays on the bag, explained in
    // bag.promotions.codes.
    applyCode: build.mutation<Bag, { cartId: string; code: string }>({
      queryFn: ({ cartId, code }, _api, _extra, baseQuery) =>
        write(baseQuery, {
          url: `/v1/store/carts/${encodeURIComponent(cartId)}/promotion-codes`,
          method: "POST",
          body: { code },
        }),
      onQueryStarted: (_arg, api) => settle(api),
    }),

    removeCode: build.mutation<Bag, { cartId: string; code: string }>({
      queryFn: ({ cartId, code }, _api, _extra, baseQuery) =>
        write(baseQuery, {
          url: `/v1/store/carts/${encodeURIComponent(cartId)}/promotion-codes/${encodeURIComponent(code)}`,
          method: "DELETE",
        }),
      onQueryStarted: ({ code }, api) =>
        settle(api, (bag) => {
          bag.promotions.codes = bag.promotions.codes.filter((c) => c.code !== code);
        }),
    }),
  }),
});

const lineUrl = (cartId: string, lineId: string) =>
  `/v1/store/carts/${encodeURIComponent(cartId)}/lines/${encodeURIComponent(lineId)}`;

type BaseQuery = (
  args: FetchArgs,
) => ReturnType<typeof shopperBaseQuery> | Awaited<ReturnType<typeof shopperBaseQuery>>;

function write(baseQuery: BaseQuery, args: FetchArgs) {
  return inOrder(async (): Promise<{ data: Bag } | { error: FetchBaseQueryError }> => {
    const result = await baseQuery({ ...args, keepalive: true });
    return result.error ? fail(result.error) : { data: result.data as Bag };
  });
}

// The optimistic version of a quantity change: the line's total follows its unit price; the
// API's answer (repriced, with discounts and shipping) replaces it a moment later.
export function changeLine(bag: Bag, lineId: string, quantity: number): void {
  const line = bag.lines.find((l) => l.id === lineId);
  if (!line) return;
  const delta = quantity - line.quantity;
  bag.itemCount = Math.max(0, bag.itemCount + delta);
  bag.subtotalMinor += line.unitPriceMinor * delta;
  if (quantity === 0) bag.lines = bag.lines.filter((l) => l.id !== lineId);
  else Object.assign(line, { quantity, totalMinor: line.unitPriceMinor * quantity });
}

type MutationLifecycle = {
  dispatch: (action: unknown) => unknown;
  queryFulfilled: Promise<{ data: Bag }>;
};

// Applies a write's optimistic change (if any) to the cached bag, then settles it: the API's
// answer replaces the bag once no other write is waiting; a refused write is rolled back.
async function settle({ dispatch, queryFulfilled }: MutationLifecycle, optimistic?: (bag: Bag) => void) {
  pendingWrites++;
  const patch = optimistic
    ? (dispatch(
        bagApi.util.updateQueryData("getBag", undefined, (bag) => {
          if (bag) optimistic(bag);
        }),
      ) as { undo: () => void })
    : null;
  try {
    const { data } = await queryFulfilled;
    if (--pendingWrites === 0) dispatch(bagApi.util.upsertQueryData("getBag", undefined, data));
  } catch {
    pendingWrites--;
    patch?.undo();
  }
}

export const {
  useGetBagQuery,
  useAddToBagMutation,
  useSetLineQuantityMutation,
  useRemoveLineMutation,
  useApplyCodeMutation,
  useRemoveCodeMutation,
} = bagApi;
