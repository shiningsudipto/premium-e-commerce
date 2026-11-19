import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { CopyButton } from "@/src/features/affiliate/copy-button";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { LinkBuilder } from "@/src/features/affiliate/link-builder";
import { StatusPill } from "@/src/features/affiliate/ui";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.links"), robots: { index: false } };
}

// Link and QR generator: any storefront page + a referral code + an optional sub-ID; and the
// coupon codes the store linked to the affiliate (an order using one is credited to them).
export default async function AffiliateLinksPage() {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("affiliate")]);
  const coupons = await unwrap(serverApi(ctx).GET("/v1/affiliate/coupon-codes"));
  const active = me.links.filter((l) => l.status === "ACTIVE");
  const count = new Intl.NumberFormat(ctx.market.locale);
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
      <section aria-labelledby="affiliate-coupons-title">
        <h2 className="h3" id="affiliate-coupons-title">
          {t("coupons.title")}
        </h2>
        <p className="muted">{t("coupons.intro")}</p>
        {coupons.length ? (
          <div className="affiliate-table-wrap">
            <table className="orders-table" data-testid="affiliate-coupons">
              <thead>
                <tr>
                  <th scope="col">{t("coupons.code")}</th>
                  <th scope="col">{t("coupons.promotion")}</th>
                  <th scope="col">{t("coupons.uses")}</th>
                  <th scope="col">{t("coupons.status")}</th>
                  <th scope="col">
                    <span className="sr-only">{t("coupons.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const usable = c.isActive && c.promotion.status === "ACTIVE";
                  const status = c.isActive ? c.promotion.status : "DISABLED";
                  return (
                    <tr key={c.id}>
                      <th scope="row" className="affiliate-code">
                        {c.code}
                      </th>
                      <td>{c.promotion.name}</td>
                      <td>
                        {c.usageLimit !== null
                          ? t("coupons.usesOf", { used: count.format(c.usageCount), limit: count.format(c.usageLimit) })
                          : count.format(c.usageCount)}
                      </td>
                      <td>
                        <StatusPill
                          status={status}
                          label={t.has(`couponStatus.${status}`) ? t(`couponStatus.${status}`) : status}
                        />
                      </td>
                      <td>{usable && <CopyButton text={c.code} label={t("coupons.copy", { code: c.code })} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("coupons.empty")}</p>
        )}
      </section>
    </>
  );
}
