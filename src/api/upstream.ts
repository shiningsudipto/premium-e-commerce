import { env } from "../lib/env";
import type { MarketInfo, MarketRef } from "../lib/market";

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
