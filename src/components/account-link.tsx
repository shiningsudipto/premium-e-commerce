import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestContext } from "../api/server";
import { href } from "../lib/links";
import type { MarketRef } from "../lib/market";

// Reads the session cookie, so it renders per request behind a <Suspense> boundary.
export async function AccountLink({ market }: { market: MarketRef }) {
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("header")]);
  const signedIn = ctx.kind === "customer";
  return (
    <Link href={href(market, signedIn ? "/account" : "/account/sign-in")} className="hover:underline">
      {signedIn ? t("account") : t("signIn")}
    </Link>
  );
}

export async function AccountLinkFallback() {
  const t = await getTranslations("header");
  // same width as the real link, so the header doesn't shift when it streams in
  return (
    <span aria-hidden className="text-transparent select-none">
      {t("signIn")}
    </span>
  );
}
