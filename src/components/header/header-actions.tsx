import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestContext } from "../../api/server";
import { bagCount } from "../../features/cart/bag";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { Icon } from "../storefront/icon";

// The parts of the header that depend on the shopper's session. They stream in behind
// <Suspense>, so the rest of the header stays in the prerendered shell.

export async function AccountButton({ market }: { market: MarketRef }) {
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("header")]);
  const signedIn = ctx.kind === "customer";
  return (
    <Link
      className="icon-btn hide-sm"
      href={href(market, signedIn ? "/account" : "/account/sign-in")}
      aria-label={signedIn ? t("account") : t("signIn")}
    >
      <Icon name="user" />
    </Link>
  );
}

export async function BagButton({ market }: { market: MarketRef }) {
  const [count, t] = await Promise.all([bagCount(), getTranslations("header")]);
  return <BagLink market={market} count={count} label={t("bag", { count })} />;
}

export async function BagButtonFallback({ market }: { market: MarketRef }) {
  const t = await getTranslations("header");
  return <BagLink market={market} count={0} label={t("bag", { count: 0 })} />;
}

function BagLink({ market, count, label }: { market: MarketRef; count: number; label: string }) {
  return (
    <Link className="icon-btn" href={href(market, "/cart")} aria-label={label} data-testid="bag-link">
      <Icon name="bag" />
      {count > 0 && (
        <span className="cart-count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function AccountButtonFallback({ market, label }: { market: MarketRef; label: string }) {
  return (
    <Link className="icon-btn hide-sm" href={href(market, "/account/sign-in")} aria-label={label}>
      <Icon name="user" />
    </Link>
  );
}
