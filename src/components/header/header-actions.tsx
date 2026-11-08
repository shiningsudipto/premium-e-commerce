import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestContext } from "../../api/server";
import { bagCount } from "../../features/cart/bag";
import { BagButtonLink } from "../../features/cart/bag-trigger";
import { SessionHint } from "../../features/wishlist/shopper-session";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { Icon } from "../storefront/icon";

// The parts of the header that depend on the shopper's session. They stream in behind
// <Suspense>, so the rest of the header stays in the prerendered shell.

export async function AccountButton({ market }: { market: MarketRef }) {
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("header")]);
  const signedIn = ctx.kind === "customer";
  return (
    <>
      <Link
        className="icon-btn hide-sm"
        href={href(market, signedIn ? "/account" : "/account/sign-in")}
        aria-label={signedIn ? t("account") : t("signIn")}
      >
        <Icon name="user" />
      </Link>
      {/* tells browser code (wishlist hearts) whether to load the customer's saved items */}
      <SessionHint signedIn={signedIn} />
    </>
  );
}

// The count comes from the server first; the browser's cached bag (RTK Query) keeps it current.
export async function BagButton({ market }: { market: MarketRef }) {
  const count = await bagCount();
  return <BagButtonLink href={href(market, "/cart")} initial={count} icon={<Icon name="bag" />} />;
}

export function BagButtonFallback({ market }: { market: MarketRef }) {
  return <BagButtonLink href={href(market, "/cart")} initial={0} icon={<Icon name="bag" />} />;
}

export function AccountButtonFallback({ market, label }: { market: MarketRef; label: string }) {
  return (
    <Link className="icon-btn hide-sm" href={href(market, "/account/sign-in")} aria-label={label}>
      <Icon name="user" />
    </Link>
  );
}
