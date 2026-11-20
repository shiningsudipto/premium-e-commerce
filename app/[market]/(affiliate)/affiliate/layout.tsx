import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { AffiliateNav } from "@/src/features/affiliate/affiliate-nav";
import { dashboardAccess } from "@/src/features/affiliate/data";
import { TermsForm } from "@/src/features/affiliate/forms";
import { href } from "@/src/lib/links";

// The affiliate dashboard (spec §7.7). Active affiliates only: signed-out visitors go to sign-in,
// customers without an active affiliate profile to the account's affiliate page, and while the
// `affiliates` flag is off everyone goes to /affiliate-program, which says the program isn't
// open yet. Access is decided before any dashboard heading or menu is drawn, so nobody who is
// sent elsewhere sees the dashboard flash up first. Until the current terms are accepted, the
// terms prompt replaces the dashboard (the API refuses its data until then).
export default async function AffiliateLayout({ children }: LayoutProps<"/[market]">) {
  const t = await getTranslations("affiliate");
  return (
    <Suspense
      fallback={
        <div className="pt-container">
          <p className="muted">{t("loading")}</p>
        </div>
      }
    >
      <AffiliateOnly>{children}</AffiliateOnly>
    </Suspense>
  );
}

async function AffiliateOnly({ children }: { children: ReactNode }) {
  const [ctx, access, t] = await Promise.all([requestContext(), dashboardAccess(), getTranslations("affiliate")]);
  if (access.kind === "signed-out") {
    redirect(`${href(ctx.market, "/account/sign-in")}?next=${encodeURIComponent(href(ctx.market, "/affiliate"))}`);
  }
  if (access.kind === "disabled") redirect(href(ctx.market, "/affiliate-program"));
  if (access.kind === "not-affiliate") redirect(href(ctx.market, "/account/affiliate"));
  const market = ctx.market;
  const links = [
    { href: href(market, "/affiliate"), label: t("nav.overview") },
    { href: href(market, "/affiliate/links"), label: t("nav.links") },
    { href: href(market, "/affiliate/orders"), label: t("nav.orders") },
    { href: href(market, "/affiliate/earnings"), label: t("nav.earnings") },
    { href: href(market, "/affiliate/payouts"), label: t("nav.payouts") },
    { href: href(market, "/affiliate/payout-methods"), label: t("nav.payoutMethods") },
    { href: href(market, "/affiliate/assets"), label: t("nav.assets") },
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
          {access.kind === "terms" ? (
            <section className="box" aria-labelledby="affiliate-terms-title">
              <h2 className="h3" id="affiliate-terms-title">
                {t("terms.title")}
              </h2>
              <p>{t("terms.body")}</p>
              <TermsForm termsHref={href(market, "/pages/affiliate-terms")} termsVersion={access.currentTermsVersion} />
            </section>
          ) : (
            <Suspense fallback={<p className="muted">{t("loading")}</p>}>{children}</Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
