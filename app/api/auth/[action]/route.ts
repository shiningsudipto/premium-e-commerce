import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { contextHeaders } from "@/src/api/upstream";
import { env } from "@/src/lib/env";
import type { Tokens } from "@/src/lib/session/cookies";
import { applyCookies, errorResponse, forwardContext, rejectCrossSite, Session } from "@/src/lib/session/bff";

// Sign-in, registration and sign-out. The API returns tokens in JSON; they're moved into
// httpOnly cookies here and the browser only learns who signed in.
//   POST /api/auth/login     { email, password }            → { customerId }
//   POST /api/auth/register  { email, password, … }         → { customerId }
//   POST /api/auth/logout                                     → { ok: true }

export async function POST(request: NextRequest, { params }: RouteContext<"/api/auth/[action]">) {
  const { action } = await params;
  const blocked = rejectCrossSite(request);
  if (blocked) return blocked;

  const ctx = forwardContext(request);
  const session = new Session(request, ctx);
  const headers = { ...contextHeaders(ctx), "content-type": "application/json" };

  try {
    if (action === "login" || action === "register") {
      const upstream = await fetch(`${env.API_URL}/v1/store/auth/${action}`, {
        method: "POST",
        headers,
        body: await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await upstream.json()) as { customerId?: string; session?: Tokens };
      if (!upstream.ok || !body.session) return NextResponse.json(body, { status: upstream.status });
      session.signedIn(body.session);
      return applyCookies(
        NextResponse.json({ customerId: body.customerId }, { status: upstream.status }),
        session.writes,
      );
    }

    if (action === "logout") {
      const refreshToken = session.refreshToken;
      if (refreshToken) {
        // revoke server-side too; signing out locally still happens if the API is down
        await fetch(`${env.API_URL}/v1/store/auth/logout`, {
          method: "POST",
          headers,
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        }).catch(() => undefined);
      }
      session.signedOut();
      return applyCookies(NextResponse.json({ ok: true }), session.writes);
    }
  } catch {
    return errorResponse(502, "INTERNAL_ERROR", "The store is unavailable right now");
  }
  return errorResponse(404, "NOT_FOUND", "Not found");
}
