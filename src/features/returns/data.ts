import "server-only";
import { unwrap } from "../../api/errors";
import { serverApi, type ApiContext } from "../../api/server";
import type { paths } from "../../api/schema";
import { toReturn, toReturns, type ReturnView } from "./returns";

// The shopper's returns: per order, and across all orders for the account page. These reads are
// per customer and never cached.

export async function getOrderReturns(ctx: ApiContext, orderId: string): Promise<ReturnView[]> {
  const raw: unknown = await unwrap(
    serverApi(ctx).GET("/v1/store/orders/{id}/returns", { params: { path: { id: orderId } } }),
  );
  return toReturns(raw);
}

export type AccountReturn = ReturnView & { order: { id: string; number: string; currency: string } };

// How many returns the page lists (newest first). Returns only exist inside the return window,
// so this covers nearly every customer; the page says so when there are more.
const PAGE = 50;
const MAX_RETURNS = 200;

// The customer's returns across all their orders, newest first (GET /v1/store/account/returns).
export async function listAccountReturns(ctx: ApiContext): Promise<{ returns: AccountReturn[]; truncated: boolean }> {
  const api = serverApi(ctx);
  const returns: AccountReturn[] = [];
  let cursor: string | null = null;
  do {
    const page: AccountReturnsPage = await unwrap(
      api.GET("/v1/store/account/returns", { params: { query: { limit: PAGE, ...(cursor ? { cursor } : {}) } } }),
    );
    for (const item of page.items) {
      const view = toReturn(item);
      if (view) {
        returns.push({
          ...view,
          order: { id: item.orderId, number: String(item.orderNumber), currency: item.orderCurrency },
        });
      }
    }
    cursor = page.nextCursor;
  } while (cursor && returns.length < MAX_RETURNS);
  return { returns: returns.slice(0, MAX_RETURNS), truncated: !!cursor };
}

type AccountReturnsPage = paths["/v1/store/account/returns"]["get"]["responses"]["200"]["content"]["application/json"];
