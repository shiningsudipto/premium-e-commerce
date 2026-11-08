import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";
import { parseMarketSegment } from "@/src/lib/market";
import { parsePreviewRequest, PREVIEW_COOKIE, PREVIEW_MAX_AGE } from "@/src/lib/preview";

// Opens a draft preview from the admin's preview link:
//   GET /api/preview?handle=<page>&token=<signed preview token>&market=<locale-market>
// The token is checked with the API first, so a made-up link can't switch caching off for anyone.
// GET /api/preview?exit=1 ends the preview.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const draft = await draftMode();

  // leaving the preview: back to the live version of the page (or the home page)
  if (url.searchParams.has("exit")) {
    draft.disable();
    const market = parseMarketSegment(url.searchParams.get("market")) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
    const handle = url.searchParams.get("handle");
    const target =
      handle && /^[a-z0-9][a-z0-9-]{0,199}$/.test(handle) ? href(market, `/pages/${handle}`) : href(market);
    const res = NextResponse.redirect(new URL(target, url));
    res.cookies.delete(PREVIEW_COOKIE);
    // also expire Next's bypass cookie on this response, in case disable() isn't merged into it
    res.cookies.set("__prerender_bypass", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
    return res;
  }

  const req = parsePreviewRequest(url);
  if (!req) return NextResponse.json({ code: "BAD_REQUEST", message: "Invalid preview link" }, { status: 400 });
  const market = parseMarketSegment(req.segment) ?? parseMarketSegment(env.DEFAULT_MARKET)!;

  const check = await serverApi({ market })
    .GET("/v1/store/pages/{handle}", { params: { path: { handle: req.handle }, query: { preview: req.token } } })
    .catch(() => null);
  if (!check?.data?.preview) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "This preview link has expired or isn't valid" },
      { status: 404 },
    );
  }

  draft.enable();
  const res = NextResponse.redirect(new URL(href(market, `/pages/${req.handle}`), url));
  res.cookies.set(PREVIEW_COOKIE, req.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: PREVIEW_MAX_AGE,
  });
  return res;
}
