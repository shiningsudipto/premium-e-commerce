import { NextResponse, type NextRequest } from "next/server";
import { clientIpOf, contextHeaders, newRequestId, proxyMarkets, refreshTokens } from "./src/api/upstream";
import { env, isProduction } from "./src/lib/env";
import { parseMarketSegment, pickSegment, resolveSegment } from "./src/lib/market";
import { clearedSession, COOKIE, marketCookie, sessionCookies, type CookieWrite } from "./src/lib/session/cookies";
import { refreshOnce } from "./src/lib/session/refresh";

// Runs before every page (spec §3.3):
// 1. every URL carries a market prefix (/en-bd/…): URL → cookie → geo header → default;
// 2. downstream rendering gets the market, locale, channel and a correlation ID as headers;
// 3. an expired access token is refreshed here, so Server Components always see a live session.
// Route handlers under /api do their own session work and aren't matched.

const GEO_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"];

export async function proxy(request: NextRequest) {
  const fallback = parseMarketSegment(env.DEFAULT_MARKET)!;
  const markets = await proxyMarkets(fallback);
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  const current = resolveSegment(first, markets) ?? (first === env.DEFAULT_MARKET ? fallback : null);

  if (!current) {
    const country = GEO_HEADERS.map((h) => request.headers.get(h)).find(Boolean);
    const segment = pickSegment(
      { cookie: request.cookies.get(COOKIE.market)?.value, country },
      markets,
      env.DEFAULT_MARKET,
    );
    const url = request.nextUrl.clone();
    url.pathname = `/${segment}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  const requestId = request.headers.get("x-request-id") ?? newRequestId();
  const writes: CookieWrite[] = [];
  if (request.cookies.get(COOKIE.market)?.value !== current.segment)
    writes.push(marketCookie(current.segment, isProduction));

  const refreshToken = request.cookies.get(COOKIE.refresh)?.value;
  if (refreshToken && !request.cookies.get(COOKIE.access)) {
    try {
      const tokens = await refreshOnce(refreshToken, (rt) =>
        refreshTokens(
          rt,
          contextHeaders({ market: current, channel: env.CHANNEL, requestId, clientIp: clientIpOf(request.headers) }),
        ),
      );
      writes.push(...(tokens ? sessionCookies(tokens, isProduction) : clearedSession(isProduction)));
    } catch {
      // API unreachable: render signed out for now and try again on the next request
    }
  }

  // what Server Components see: the updated cookies plus the context headers
  for (const w of writes) {
    if (w.name === COOKIE.market) continue;
    if (w.value) request.cookies.set(w.name, w.value);
    else request.cookies.delete(w.name);
  }
  const headers = new Headers(request.headers);
  headers.set("x-market-segment", current.segment);
  headers.set("x-market", current.market);
  headers.set("x-locale", current.locale);
  headers.set("x-channel", env.CHANNEL);
  headers.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  for (const { name, value, ...options } of writes) response.cookies.set(name, value, options);
  return response;
}

export const config = {
  matcher: [
    // everything except route handlers, Next internals and files with an extension
    "/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)",
  ],
};
