import "server-only";
import createClient from "openapi-fetch";
import { cookies, headers } from "next/headers";
import { env } from "../lib/env";
import { parseMarketSegment, type MarketRef } from "../lib/market";
import { COOKIE } from "../lib/session/cookies";
import { contextHeaders, newRequestId } from "./upstream";
import type { paths } from "./schema";

export type ApiContext = { market: MarketRef; requestId?: string; token?: string | null };

// Typed client for Server Components and Server Functions. Types come only from the generated
// OpenAPI schema (`npm run api:generate`).
export function serverApi(ctx: ApiContext) {
  const client = createClient<paths>({ baseUrl: env.API_URL });
  client.use({
    onRequest({ request }) {
      const h = contextHeaders({
        market: ctx.market,
        channel: env.CHANNEL,
        requestId: ctx.requestId ?? newRequestId(),
      });
      for (const [k, v] of Object.entries(h)) request.headers.set(k, v);
      if (ctx.token) request.headers.set("authorization", `Bearer ${ctx.token}`);
      return request;
    },
  });
  return client;
}

// Per-request context: proxy.ts sets the market and correlation ID headers, and keeps the
// session cookies fresh. Reading it makes the caller dynamic, so it belongs behind <Suspense>.
export async function requestContext(): Promise<ApiContext & { kind: "customer" | "guest" | null }> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const market = parseMarketSegment(h.get("x-market-segment")) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const customer = c.get(COOKIE.access)?.value;
  const guest = c.get(COOKIE.guest)?.value;
  return {
    market,
    requestId: h.get("x-request-id") ?? undefined,
    token: customer ?? guest ?? null,
    kind: customer ? "customer" : guest ? "guest" : null,
  };
}
