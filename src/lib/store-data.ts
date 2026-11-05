import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { serverApi } from "../api/server";
import { ApiError, unwrap } from "../api/errors";
import { env } from "./env";
import { parseMarketSegment, type MarketRef } from "./market";

// Shared storefront data, cached on the server and revalidated by tag when the API's worker
// calls /api/revalidate (spec §3.5). The tags match premium-ec-backend's tagsFor().

const defaultMarket = () => parseMarketSegment(env.DEFAULT_MARKET)!;

export async function getStoreConfig(market: MarketRef) {
  "use cache";
  cacheTag("config");
  cacheLife("hours");
  return unwrap(serverApi({ market }).GET("/v1/store/config"));
}

export async function getMarkets() {
  "use cache";
  cacheTag("config");
  cacheLife("hours");
  return unwrap(serverApi({ market: defaultMarket() }).GET("/v1/store/markets"));
}

// Flags evaluated for an anonymous shopper in this market. Shopper-specific targeting
// (customer IDs, groups, percentages) goes through getFlags() in flags.ts instead.
export async function getMarketFlags(market: MarketRef) {
  "use cache";
  cacheTag("config");
  cacheLife("minutes");
  return unwrap(serverApi({ market }).GET("/v1/store/flags"));
}

// The channel's active theme, or null before one is activated (the CSS defaults apply then).
export async function getTheme() {
  "use cache";
  cacheTag("theme");
  cacheLife("hours");
  try {
    return await unwrap(serverApi({ market: defaultMarket() }).GET("/v1/store/theme", { params: { query: {} } }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export type StoreConfig = Awaited<ReturnType<typeof getStoreConfig>>;
export type Theme = NonNullable<Awaited<ReturnType<typeof getTheme>>>;
