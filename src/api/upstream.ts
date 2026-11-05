import { env } from "../lib/env";
import type { Tokens } from "../lib/session/cookies";
import type { MarketInfo, MarketRef } from "../lib/market";

// Plain fetch calls to the API for proxy.ts and the BFF, which work with raw requests and
// responses rather than the typed client.

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

// Exchanges a refresh token. null means the API refused it (expired, revoked or reused);
// a network failure throws, so a flaky connection doesn't sign anyone out.
export async function refreshTokens(
  refreshToken: string,
  headers: Record<string, string> = {},
): Promise<Tokens | null> {
  const res = await fetch(`${env.API_URL}/v1/store/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401 || res.status === 400) return null;
  if (!res.ok) throw new Error(`refresh failed with ${res.status}`);
  return (await res.json()) as Tokens;
}

export async function createGuestToken(headers: Record<string, string>): Promise<string> {
  const res = await fetch(`${env.API_URL}/v1/store/auth/guest`, {
    method: "POST",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`guest token failed with ${res.status}`);
  return ((await res.json()) as { guestToken: string }).guestToken;
}

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
