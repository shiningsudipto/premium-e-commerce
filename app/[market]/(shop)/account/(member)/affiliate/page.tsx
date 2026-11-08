import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { affiliateStatus } from "@/src/features/affiliate/data";
import { ApplicationForm } from "@/src/features/affiliate/forms";
import { StatusPill } from "@/src/features/affiliate/ui";
import { isEnabled } from "@/src/lib/flags";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("account.title"), robots: { index: false } };
}

// "Become an affiliate": the application form, or where the application or profile stands.
// Rendered inside the account layout's customer-only Suspense boundary.
export default async function AccountAffiliatePage() {
  if (!(await isEnabled("affiliates"))) notFound();
  const [ctx, t, status] = await Promise.all([requestContext(), getTranslations("affiliate"), affiliateStatus()]);
  const { profile, currentTermsVersion } = status;
  const termsHref = href(ctx.market, "/pages/affiliate-terms");

  if (!profile) {
    return (
      <section className="box" aria-labelledby="affiliate-apply-title">
        <h2 className="h3" id="affiliate-apply-title">
          {t("account.title")}
        </h2>
        <p>{t("account.intro")}</p>
        <ul className="affiliate-points">
          <li>{t("account.point1")}</li>
          <li>{t("account.point2")}</li>
          <li>{t("account.point3")}</li>
        </ul>
        <ApplicationForm termsHref={termsHref} termsVersion={currentTermsVersion} />
      </section>
    );
  }

  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });
  const statusKey = `profileStatus.${profile.status}` as const;
  return (
    <section className="box" aria-labelledby="affiliate-status-title" data-testid="affiliate-status">
      <h2 className="h3" id="affiliate-status-title">
        {t("account.title")}
      </h2>
      <p>
        <StatusPill status={profile.status} label={t(`${statusKey}.label`)} />{" "}
        <span className="muted">{t("account.appliedOn", { date: date.format(new Date(profile.createdAt)) })}</span>
      </p>
      <p>{t(`${statusKey}.body`)}</p>
      {profile.status === "ACTIVE" && (
        <>
          {profile.tier && <p className="muted">{t("account.tier", { tier: profile.tier.name })}</p>}
          {profile.termsVersion !== currentTermsVersion && (
            <p className="notice" role="status">
              {t("account.termsOutdated")}
            </p>
          )}
          <p className="box__actions">
            <Link className="btn btn--primary" href={href(ctx.market, "/affiliate")}>
              {t("account.openDashboard")}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
