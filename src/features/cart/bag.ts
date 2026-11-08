import "server-only";
import { unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { Bag } from "./types";

// Server-side reads of the shopper's bag, for the first render (header count, bag page). Changes
// to the bag happen in the browser through RTK Query (cart-api.ts). Both need a session, so
// visitors without one see no bag (and none is created for them). They read cookies: render
// them behind <Suspense>.

export async function loadBag(): Promise<Bag | null> {
  const ctx = await requestContext();
  if (!ctx.token) return null;
  try {
    return await unwrap(serverApi(ctx).POST("/v1/store/carts"));
  } catch {
    return null;
  }
}

export async function bagCount(): Promise<number> {
  return (await loadBag())?.itemCount ?? 0;
}
