import { env } from "../lib/env";
import type { MarketInfo, MarketRef } from "../lib/market";
import { buildTable, type RedirectRule, type RedirectTable } from "../lib/redirects";

// Plain fetch helpers for proxy.ts, which works with raw requests rather than the typed client.

export type ForwardContext = {
  market: MarketRef;
  channel: string;
  requestId: string;
  clientIp?: string | null;
  userAgent?: string | null;
};

// Headers every API call carries (ADR 0002): market, locale, channel and the correlation ID.
// The API trusts one proxy hop, so the visitor's IP goes in X-Forwarded-For for rate limits.
export function contextHeaders(ctx: ForwardContext): Record<string, string> {
  return {
    "x-market": ctx.market.market,
    "x-locale": ctx.market.locale,
    "x-channel": ctx.channel,
    "x-request-id": ctx.requestId,
    ...(ctx.clientIp ? { "x-forwarded-for": ctx.clientIp } : {}),
    ...(ctx.userAgent ? { "user-agent": ctx.userAgent } : {}),
  };
}

// The rightmost X-Forwarded-For entry was added by the hop directly in front of this server.
export function clientIpOf(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",").pop()?.trim() || headers.get("x-real-ip");
}

export const newRequestId = () => crypto.randomUUID();

// Markets for proxy.ts, kept in memory for a few minutes. If the API is unreachable the last
// known list is used, and before the first success only the default market is accepted.
type MarketCache = { markets: MarketInfo[]; fetchedAt: number };
const MARKETS_TTL_MS = 5 * 60_000;
const marketCache = globalThis as { __peMarkets?: MarketCache };

export async function proxyMarkets(fallback: MarketRef): Promise<MarketInfo[]> {
  const cached = marketCache.__peMarkets;
  if (cached && Date.now() - cached.fetchedAt < MARKETS_TTL_MS) return cached.markets;
  try {
    const res = await fetch(`${env.API_URL}/v1/store/markets`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const markets = (await res.json()) as MarketInfo[];
    marketCache.__peMarkets = { markets, fetchedAt: Date.now() };
    return markets;
  } catch {
    return (
      cached?.markets ?? [
        { handle: fallback.market, defaultLocale: fallback.locale, locales: [fallback.locale], countries: [] },
      ]
    );
  }
}

// Redirect rules for proxy.ts, refreshed every minute so a new rule applies quickly without a
// lookup per request. If the API is down the last table is kept (or none before the first load).
const REDIRECTS_TTL_MS = 60_000;
const redirectCache = globalThis as { __peRedirects?: { table: RedirectTable; fetchedAt: number } };

export async function proxyRedirects(market: MarketRef): Promise<RedirectTable> {
  const cached = redirectCache.__peRedirects;
  if (cached && Date.now() - cached.fetchedAt < REDIRECTS_TTL_MS) return cached.table;
  try {
    const res = await fetch(`${env.API_URL}/v1/store/redirects`, {
      cache: "no-store",
      headers: { "x-market": market.market, "x-locale": market.locale },
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const table = buildTable((await res.json()) as RedirectRule[]);
    redirectCache.__peRedirects = { table, fetchedAt: Date.now() };
    return table;
  } catch {
    const table = cached?.table ?? new Map();
    // don't retry on every request while the API is down
    redirectCache.__peRedirects = { table, fetchedAt: Date.now() - REDIRECTS_TTL_MS + 10_000 };
    return table;
  }
}
