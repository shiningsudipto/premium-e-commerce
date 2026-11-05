import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contextHeaders } from "@/src/api/upstream";
import { env } from "@/src/lib/env";
import { applyCookies, errorResponse, forwardContext, rejectCrossSite, Session } from "@/src/lib/session/bff";

// Browser → /api/bff/v1/store/… → Express API, with the session token taken from httpOnly
// cookies (ADR 0002). Only shopper and affiliate APIs pass; admin calls belong to the admin app,
// and the token-issuing auth calls go through /api/auth so their tokens never reach the browser.

const ALLOWED = /^v1\/(store|affiliate)\//;
const AUTH_HANDLED_HERE = /^v1\/store\/auth\/(login|register|refresh|logout|guest)$/;
// calls that need a shopper even before sign-in get a guest token automatically
const NEEDS_SHOPPER = /^v1\/store\/(carts|checkout)(\/|$)/;

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "idempotency-key"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "x-request-id", "ratelimit", "ratelimit-policy", "retry-after"];

async function handle(request: NextRequest, { params }: RouteContext<"/api/bff/[...path]">) {
  const path = (await params).path.join("/");
  if (!ALLOWED.test(path) || AUTH_HANDLED_HERE.test(path)) return errorResponse(404, "NOT_FOUND", "Not found");
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const ctx = forwardContext(request);
  const session = new Session(request, ctx);
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

  const send = async () => {
    const headers = new Headers(contextHeaders(ctx));
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const token = await session.token({ createGuest: NEEDS_SHOPPER.test(path) });
    if (token) headers.set("authorization", `Bearer ${token}`);
    return fetch(`${env.API_URL}/${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
  };

  let upstream: Response;
  try {
    upstream = await send();
    if (upstream.status === 401 && session.hasCustomer) {
      const code = (
        (await upstream
          .clone()
          .json()
          .catch(() => ({}))) as { code?: string }
      ).code;
      if (code === "TOKEN_EXPIRED" && (await session.renew())) upstream = await send();
    }
  } catch {
    return applyCookies(errorResponse(502, "INTERNAL_ERROR", "The store is unavailable right now"), session.writes);
  }

  const headers = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return applyCookies(new NextResponse(upstream.body, { status: upstream.status, headers }), session.writes);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
