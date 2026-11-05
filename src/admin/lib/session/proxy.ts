import { NextResponse, type NextRequest } from "next/server";
import { clientIpOf, newRequestId } from "../../../api/upstream";
import { callSession, type ParsedCookie } from "../../../lib/session/api-session";
import { refreshOnce } from "../../../lib/session/refresh";
import { COOKIE } from "./cookies";

// The /admin half of proxy.ts. Every console page needs a staff session: without one the
// visitor goes to /admin/login and comes back afterwards, and an expired access cookie is
// refreshed through the API (which sets the new cookies) before the page renders. The API still
// checks every permission; this only keeps signed-out visitors off the pages.

const PUBLIC_PATHS = /^\/admin\/(login|mfa)(\/|$)/;

export const isAdminPath = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");

export async function adminProxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.test(pathname)) return NextResponse.next();

  const requestId = request.headers.get("x-request-id") ?? newRequestId();
  let cookies: ParsedCookie[] = [];
  let signedIn = !!request.cookies.get(COOKIE.access);
  const refreshToken = request.cookies.get(COOKIE.refresh)?.value;

  if (!signedIn && refreshToken) {
    try {
      const clientIp = clientIpOf(request.headers);
      const result = await refreshOnce(refreshToken, (rt) =>
        callSession("admin", "refresh", `${COOKIE.refresh}=${encodeURIComponent(rt)}`, {
          "x-request-id": requestId,
          ...(clientIp ? { "x-forwarded-for": clientIp } : {}),
        }),
      );
      cookies = result.cookies;
      signedIn = result.ok;
    } catch {
      // API unreachable: let the page load; its API calls report the outage
      signedIn = true;
    }
  }

  let response: NextResponse;
  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    response = NextResponse.redirect(url, 307);
  } else {
    response = NextResponse.next();
  }
  response.headers.set("x-request-id", requestId);
  for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
  return response;
}
