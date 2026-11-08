import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { AffiliateNav } from "@/src/features/affiliate/affiliate-nav";
import { dashboardAccess } from "@/src/features/affiliate/data";
import { TermsForm } from "@/src/features/affiliate/forms";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

// The affiliate dashboard (spec §7.7). Active affiliates only: signed-out visitors go to sign-in,
// customers without an active affiliate profile to the account's affiliate page, and the whole
// area is a 404 while the `affiliates` flag is off. Until the current terms are accepted, the
// terms prompt replaces the dashboard (the API refuses its data until then).
export default async function AffiliateLayout({ children }: LayoutProps<"/[market]">) {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("affiliate")]);
  const links = [
    { href: href(market, "/affiliate"), label: t("nav.overview") },
    { href: href(market, "/affiliate/links"), label: t("nav.links") },
    { href: href(market, "/affiliate/orders"), label: t("nav.orders") },
    { href: href(market, "/affiliate/earnings"), label: t("nav.earnings") },
    { href: href(market, "/affiliate/payouts"), label: t("nav.payouts") },
    { href: href(market, "/account"), label: t("nav.account") },
  ];
  return (
    <div className="pt-container">
      <header className="page-head">
        <h1 className="h2">{t("dashboard.title")}</h1>
      </header>
      <div className="account">
        <AffiliateNav links={links} label={t("nav.label")} />
        <div className="account__panel stream-area">
          <Suspense fallback={<p className="muted">{t("loading")}</p>}>
            <AffiliateOnly>{children}</AffiliateOnly>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function AffiliateOnly({ children }: { children: ReactNode }) {
  const [ctx, access, t] = await Promise.all([requestContext(), dashboardAccess(), getTranslations("affiliate")]);
  if (access.kind === "signed-out") {
    redirect(`${href(ctx.market, "/account/sign-in")}?next=${encodeURIComponent(href(ctx.market, "/affiliate"))}`);
  }
  if (access.kind === "disabled") notFound();
  if (access.kind === "not-affiliate") redirect(href(ctx.market, "/account/affiliate"));
  if (access.kind === "terms") {
    return (
      <section className="box" aria-labelledby="affiliate-terms-title">
        <h2 className="h3" id="affiliate-terms-title">
          {t("terms.title")}
        </h2>
        <p>{t("terms.body")}</p>
        <TermsForm termsHref={href(ctx.market, "/pages/affiliate-terms")} termsVersion={access.currentTermsVersion} />
      </section>
    );
  }
  return children;
}
