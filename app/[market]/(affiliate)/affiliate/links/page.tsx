import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { LinkBuilder } from "@/src/features/affiliate/link-builder";
import { StatusPill } from "@/src/features/affiliate/ui";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.links"), robots: { index: false } };
}

// Link and QR generator: any storefront page + a referral code + an optional sub-ID.
export default async function AffiliateLinksPage() {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("affiliate")]);
  const active = me.links.filter((l) => l.status === "ACTIVE");
  return (
    <>
      <section className="box" aria-labelledby="affiliate-builder-title">
        <h2 className="h3" id="affiliate-builder-title">
          {t("links.title")}
        </h2>
        <p className="muted">{t("links.intro")}</p>
        <LinkBuilder
          codes={active.map((l) => ({ code: l.code, label: l.label, isDefault: l.isDefault }))}
          origin={env.SITE_URL}
          marketPrefix={href(ctx.market)}
        />
      </section>
      <section aria-labelledby="affiliate-codes-title">
        <h2 className="h3" id="affiliate-codes-title">
          {t("links.codes")}
        </h2>
        <div className="affiliate-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th scope="col">{t("links.code")}</th>
                <th scope="col">{t("links.label")}</th>
                <th scope="col">{t("links.status")}</th>
              </tr>
            </thead>
            <tbody>
              {me.links.map((l) => (
                <tr key={l.id}>
                  <th scope="row" className="affiliate-code">
                    {l.code}
                  </th>
                  <td>
                    {l.label ?? ""}
                    {l.isDefault && <span className="muted"> {t("links.default")}</span>}
                  </td>
                  <td>
                    <StatusPill
                      status={l.status}
                      label={t.has(`linkStatus.${l.status}`) ? t(`linkStatus.${l.status}`) : l.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
