import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import {
  clientIpOf,
  contextHeaders,
  createGuestToken,
  newRequestId,
  refreshTokens,
  type ForwardContext,
} from "../../api/upstream";
import { env, isProduction } from "../env";
import { parseMarketSegment } from "../market";
import { clearedSession, COOKIE, guestCookie, sessionCookies, type CookieWrite } from "./cookies";
import { isSameOriginRequest } from "./csrf";
import { refreshOnce } from "./refresh";

// Shared plumbing for the BFF route handlers (ADR 0002): context headers, session tokens kept in
// httpOnly cookies, refresh on expiry, CSRF origin checks, and API-shaped error responses.

export function forwardContext(request: NextRequest): ForwardContext {
  const market =
    parseMarketSegment(request.cookies.get(COOKIE.market)?.value) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  return {
    market,
    channel: env.CHANNEL,
    requestId: request.headers.get("x-request-id") ?? newRequestId(),
    clientIp: clientIpOf(request.headers),
    userAgent: request.headers.get("user-agent"),
  };
}

export const errorResponse = (status: number, code: string, message: string) =>
  NextResponse.json({ code, message }, { status, headers: { "cache-control": "no-store" } });

export function rejectCrossSite(request: NextRequest): NextResponse | null {
  return isSameOriginRequest(request, env.SITE_URL)
    ? null
    : errorResponse(403, "FORBIDDEN", "Cross-site request blocked");
}

export function applyCookies(response: NextResponse, writes: CookieWrite[]) {
  for (const { name, value, ...options } of writes) response.cookies.set(name, value, options);
  return response;
}

// Tracks the shopper's token for one BFF request and the cookie changes it causes.
export class Session {
  readonly writes: CookieWrite[] = [];
  private access: string | undefined;
  private refresh: string | undefined;
  private guest: string | undefined;

  constructor(
    request: NextRequest,
    private readonly ctx: ForwardContext,
  ) {
    this.access = request.cookies.get(COOKIE.access)?.value;
    this.refresh = request.cookies.get(COOKIE.refresh)?.value;
    this.guest = request.cookies.get(COOKIE.guest)?.value;
  }

  get hasCustomer() {
    return !!(this.access || this.refresh);
  }

  get refreshToken() {
    return this.refresh;
  }

  // The bearer token to send: the customer's (refreshed first if the access cookie expired),
  // otherwise the guest's, otherwise a new guest token when the call needs a shopper.
  async token(options: { createGuest?: boolean } = {}): Promise<string | undefined> {
    if (!this.access && this.refresh) await this.renew();
    if (this.access) return this.access;
    if (!this.guest && options.createGuest) {
      this.guest = await createGuestToken(contextHeaders(this.ctx));
      this.writes.push(guestCookie(this.guest, isProduction));
    }
    return this.guest;
  }

  // After the API answers TOKEN_EXPIRED. Returns whether a new access token is available.
  async renew(): Promise<boolean> {
    if (!this.refresh) return false;
    const tokens = await refreshOnce(this.refresh, (rt) => refreshTokens(rt, contextHeaders(this.ctx)));
    if (!tokens) {
      this.signedOut();
      return false;
    }
    this.signedIn(tokens);
    return true;
  }

  signedIn(tokens: Parameters<typeof sessionCookies>[0]) {
    this.access = tokens.accessToken;
    this.refresh = tokens.refreshToken;
    this.writes.push(...sessionCookies(tokens, isProduction));
  }

  signedOut() {
    this.access = undefined;
    this.refresh = undefined;
    this.writes.push(...clearedSession(isProduction));
  }
}
