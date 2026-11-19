import { NextResponse } from "next/server";
import { LANGUAGES, localizedPath, type Language } from "@/src/i18n/languages";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";

// The language switcher's links before the page has hydrated (or without JavaScript):
//   GET /api/language?locale=bn
// sends the shopper to the page they were on (taken from the Referer, same site only) in that
// language, or to that language's home page. After hydration the switcher links straight to it.

export function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "";
  if (!(locale in LANGUAGES))
    return NextResponse.json({ code: "BAD_REQUEST", message: "Unknown language" }, { status: 400 });

  let from: URL | null = null;
  try {
    const referer = request.headers.get("referer");
    from = referer ? new URL(referer) : null;
  } catch {
    from = null;
  }
  const sameSite = from && from.host === url.host;
  const segment = sameSite ? from!.pathname.split("/")[1] : undefined;
  const market = parseMarketSegment(segment)?.market ?? parseMarketSegment(env.DEFAULT_MARKET)!.market;
  const target = sameSite
    ? localizedPath(from!.pathname, from!.search, locale as Language, market)
    : localizedPath("/", "", locale as Language, market);
  return NextResponse.redirect(new URL(target, url), 303);
}
