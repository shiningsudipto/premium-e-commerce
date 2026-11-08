import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clientIpOf, contextHeaders, newRequestId } from "../../api/upstream";
import { env, isProduction } from "../../lib/env";
import type { MarketRef } from "../../lib/market";
import {
  cleanSearch,
  hasRefParams,
  nextReferral,
  parseReferral,
  readRefParams,
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  serializeReferral,
} from "./referral";

const BEACON_TIMEOUT_MS = 2_000;

// For proxy.ts: a request with ?ref= is answered with a redirect to the same URL without the
// referral parameters, carrying the attribution cookie. The click is reported to the API in the
// background (event.waitUntil): the redirect never waits for it, and a failure is ignored.
// Returns null when the URL has no referral parameters.
export function affiliateRefRedirect(
  request: NextRequest,
  event: Pick<NextFetchEvent, "waitUntil"> | undefined,
  market: MarketRef,
) {
  const params = request.nextUrl.searchParams;
  if (!hasRefParams(params)) return null;

  const url = request.nextUrl.clone();
  url.search = cleanSearch(params);
  const response = NextResponse.redirect(url, 307);
  response.headers.set("cache-control", "private, no-store");

  const click = readRefParams(params);
  // an unusable code is still removed from the URL, but neither remembered nor reported
  if (!click) return response;

  const referral = nextReferral(parseReferral(request.cookies.get(REF_COOKIE)?.value), click, new Date());
  response.cookies.set(REF_COOKIE, serializeReferral(referral), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: REF_COOKIE_MAX_AGE,
  });

  const beacon = fetch(`${env.API_URL}/v1/store/affiliate/click`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(BEACON_TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      ...contextHeaders({
        market,
        channel: env.CHANNEL,
        requestId: request.headers.get("x-request-id") ?? newRequestId(),
        // the API hashes IP + user agent (never stored raw) to spot click spikes
        clientIp: clientIpOf(request.headers),
        userAgent: request.headers.get("user-agent"),
      }),
    },
    body: JSON.stringify({
      code: click.code,
      subId: click.subId,
      assetId: click.assetId,
      path: url.pathname.slice(0, 500),
    }),
  }).then(
    () => undefined,
    () => undefined,
  );
  // without an event (called directly, e.g. in tests) the beacon just runs on its own
  event?.waitUntil(beacon);
  return response;
}
