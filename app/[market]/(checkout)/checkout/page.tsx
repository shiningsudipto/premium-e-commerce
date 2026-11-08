import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { isAddress, type Address } from "@/src/features/checkout/address";
import { readReferralCookie } from "@/src/features/affiliate/referral-cookie";
import { CheckoutFlow } from "@/src/features/checkout/checkout-flow";
import { href } from "@/src/lib/links";
import { getMarkets } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const t = await getTranslations("checkout");
  return (
    <>
      <h1 className="sr-only">{t("title")}</h1>
      <Suspense
        fallback={
          <p className="pt-container muted" style={{ paddingBlock: "var(--space-6)" }}>
            {t("loading")}
          </p>
        }
      >
        <Checkout />
      </Suspense>
    </>
  );
}

// Per shopper, so it all streams behind Suspense. No bag: back to the bag page.
async function Checkout() {
  const ctx = await requestContext();
  const bagHref = href(ctx.market, "/cart");
  if (!ctx.token) redirect(bagHref);
  const api = serverApi(ctx);
  const cart = await unwrap(api.POST("/v1/store/carts"));
  if (!cart.lines.length) redirect(bagHref);

  // Affiliate attribution (?ref= cookie) goes on the cart before the totals are shown, so a
  // referral-only offer is already in the price the shopper sees. Best effort: never blocks checkout.
  const referral = await readReferralCookie();
  if (referral) {
    await api
      .PATCH("/v1/store/carts/{id}", { params: { path: { id: cart.id } }, body: { referral } })
      .catch(() => undefined);
  }

  const [summary, markets, t] = await Promise.all([
    unwrap(api.GET("/v1/store/checkout/{id}", { params: { path: { id: cart.id } } })),
    getMarkets().catch(() => []),
    getTranslations("checkout"),
  ]);

  if (!summary.guestCheckout && ctx.kind !== "customer") {
    const next = encodeURIComponent(href(ctx.market, "/checkout"));
    return (
      <div className="pt-container auth">
        <div className="auth__card">
          <h2 className="h3">{t("signInRequired")}</h2>
          <p className="muted">{t("signInRequiredBody")}</p>
          <Link className="btn btn--primary" href={`${href(ctx.market, "/account/sign-in")}?next=${next}`}>
            {t("signIn")}
          </Link>
        </div>
      </div>
    );
  }

  let prefill: { email?: string | null; address?: Address | null } = {};
  if (ctx.kind === "customer") {
    const [account, addresses] = await Promise.all([
      unwrap(api.GET("/v1/store/account")).catch(() => null),
      unwrap(api.GET("/v1/store/account/addresses")).catch(() => []),
    ]);
    const preferred = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];
    prefill = { email: account?.email, address: preferred && isAddress(preferred) ? preferred : null };
  }
  const countries = markets.find((m) => m.handle === ctx.market.market)?.countries ?? [];

  return (
    <CheckoutFlow
      initial={summary.cart}
      paymentMethods={summary.paymentMethods}
      market={ctx.market}
      countries={countries}
      prefill={prefill}
    />
  );
}
