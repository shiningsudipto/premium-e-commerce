import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { adminProxy, isAdminPath } from "./src/admin/lib/session/proxy";
import { clientIpOf, contextHeaders, newRequestId, proxyMarkets, proxyRedirects } from "./src/api/upstream";
import { affiliateRefRedirect } from "./src/features/affiliate/proxy-ref";
import { env, isProduction } from "./src/lib/env";
import { parseMarketSegment, pickSegment, resolveSegment } from "./src/lib/market";
import { resolveRedirect } from "./src/lib/redirects";
import { callSession, type ParsedCookie } from "./src/lib/session/api-session";
import { COOKIE, marketCookie } from "./src/lib/session/cookies";
import { refreshOnce } from "./src/lib/session/refresh";

// Runs before every page. /admin belongs to the back office (staff sign-in gate, see
// src/admin/lib/session/proxy.ts); everything else is the storefront (spec §3.3):
// 1. every URL carries a market prefix (/en-bd/…): URL → cookie → geo header → default;
// 2. downstream rendering gets the market, locale, channel and a correlation ID as headers;
// 3. merchant redirects (admin → Redirects) are applied, on the path without its prefix;
// 4. an expired access token is refreshed here through the API (which sets the new cookies), so
//    Server Components always see a live session;
// 5. an affiliate link (?ref=CODE&sub=…) sets the attribution cookie, reports the click in the
//    background and redirects to the same URL without those parameters.

const GEO_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"];

// `event` is optional so the proxy can be called directly in tests
export async function proxy(request: NextRequest, event?: NextFetchEvent) {
  if (isAdminPath(request.nextUrl.pathname)) return adminProxy(request);

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

  const rest = pathname.slice(first!.length + 1) || "/";
  const redirect = resolveRedirect(await proxyRedirects(current), rest, current.segment);
  if (redirect) {
    const target = redirect.location.startsWith("/")
      ? new URL(redirect.location + search, request.url)
      : redirect.location;
    return NextResponse.redirect(target, redirect.status);
  }

  const referral = affiliateRefRedirect(request, event, current);
  if (referral) return referral;

  const requestId = request.headers.get("x-request-id") ?? newRequestId();
  // session cookies the API sets while refreshing, passed to the browser and to this render
  let sessionCookies: ParsedCookie[] = [];
  const refreshToken = request.cookies.get(COOKIE.refresh)?.value;
  if (refreshToken && !request.cookies.get(COOKIE.access)) {
    try {
      const context = contextHeaders({
        market: current,
        channel: env.CHANNEL,
        requestId,
        clientIp: clientIpOf(request.headers),
      });
      const result = await refreshOnce(refreshToken, (rt) =>
        callSession("store", "refresh", `${COOKIE.refresh}=${encodeURIComponent(rt)}`, context),
      );
      sessionCookies = result.cookies;
    } catch {
      // API unreachable: render signed out for now and try again on the next request
    }
  }
  for (const c of sessionCookies) {
    if (c.value) request.cookies.set(c.name, c.value);
    else request.cookies.delete(c.name);
  }
  const headers = new Headers(request.headers);
  headers.set("x-market-segment", current.segment);
  headers.set("x-market", current.market);
  headers.set("x-locale", current.locale);
  headers.set("x-channel", env.CHANNEL);
  headers.set("x-request-id", requestId);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("x-request-id", requestId);
  for (const c of sessionCookies) response.cookies.set(c.name, c.value, c.options);
  if (request.cookies.get(COOKIE.market)?.value !== current.segment) {
    const { name, value, ...options } = marketCookie(current.segment, isProduction);
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: [
    // everything except route handlers, Next internals and files with an extension
    "/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)",
  ],
};
