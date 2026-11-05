import "server-only";
import { cache } from "react";
import { serverApi, requestContext } from "../api/server";
import { unwrap } from "../api/errors";
import { getMarketFlags } from "./store-data";

// Feature flags for the current shopper, fetched once per request. A signed-in or guest shopper
// can be targeted individually, so their flags come straight from the API; anonymous visitors
// share the cached per-market evaluation. Reads cookies, so callers sit behind <Suspense>.
export const getFlags = cache(async (): Promise<Record<string, boolean>> => {
  const ctx = await requestContext();
  if (!ctx.token) return getMarketFlags(ctx.market);
  return unwrap(serverApi(ctx).GET("/v1/store/flags"));
});

export async function isEnabled(key: string): Promise<boolean> {
  return (await getFlags())[key] === true;
}
