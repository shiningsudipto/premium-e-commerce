import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { readBalance, readStats } from "@/src/features/affiliate/readers";
import { Stat } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("dashboard.title"), robots: { index: false } };
}

// Overview: the last 30 days (the API's default range), balances and the sub-ID breakdown.
export default async function AffiliateOverviewPage() {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("affiliate")]);
  const api = serverApi(ctx);
  const [rawStats, rawBalance, config] = await Promise.all([
    unwrap(api.GET("/v1/affiliate/stats", { params: { query: {} } })),
    unwrap(api.GET("/v1/affiliate/balance")),
    getStoreConfig(ctx.market),
  ]);
  const stats = readStats(rawStats);
  const balance = readBalance(rawBalance);
  const currency = balance.currency ?? config.market.currency;
  const money = (minor: number) => formatMoney(minor, currency, ctx.market.locale);
  const percent = new Intl.NumberFormat(ctx.market.locale, { style: "percent", maximumFractionDigits: 1 });
  const count = new Intl.NumberFormat(ctx.market.locale);
  const defaultCode =
    me.links.find((l) => l.isDefault && l.status === "ACTIVE") ?? me.links.find((l) => l.status === "ACTIVE");

  return (
    <>
      <section className="box" aria-labelledby="affiliate-profile-title">
        <h2 className="h3" id="affiliate-profile-title">
          {t("overview.profile")}
        </h2>
        <p>
          {me.tier ? t("overview.tier", { tier: me.tier.name }) : null}{" "}
          {me.tier && t.has(`rewardType.${me.tier.rewardType}`) ? (
            <span className="muted">({t("overview.rewardAs", { reward: t(`rewardType.${me.tier.rewardType}`) })})</span>
          ) : null}
        </p>
        {defaultCode && (
          <p>
            {t("overview.code")} <strong className="affiliate-code">{defaultCode.code}</strong>
          </p>
        )}
        <p className="box__actions">
          <Link className="btn btn--primary" href={href(ctx.market, "/affiliate/links")}>
            {t("overview.makeLink")}
          </Link>
        </p>
      </section>

      <section aria-labelledby="affiliate-stats-title">
        <h2 className="h3" id="affiliate-stats-title">
          {t("overview.last30")}
        </h2>
        <dl className="affiliate-stats" data-testid="affiliate-stats">
          <Stat label={t("overview.clicks")} value={count.format(stats.clicks)} />
          <Stat label={t("overview.conversions")} value={count.format(stats.conversions)} />
          <Stat label={t("overview.conversionRate")} value={percent.format(stats.conversionRate)} />
          <Stat label={t("overview.sales")} value={money(stats.salesMinor)} />
        </dl>
      </section>

      <section aria-labelledby="affiliate-balance-title">
        <h2 className="h3" id="affiliate-balance-title">
          {t("overview.balance")}
        </h2>
        <dl className="affiliate-stats">
          <Stat label={t("overview.pending")} value={money(balance.pendingMinor)} note={t("overview.pendingNote")} />
          <Stat label={t("overview.payable")} value={money(balance.payableMinor)} note={t("overview.payableNote")} />
          <Stat label={t("overview.inPayout")} value={money(balance.inPayoutMinor)} />
          <Stat label={t("overview.paid")} value={money(balance.paidMinor)} />
        </dl>
      </section>

      <section aria-labelledby="affiliate-subids-title">
        <h2 className="h3" id="affiliate-subids-title">
          {t("overview.subIds")}
        </h2>
        {stats.subIds.length ? (
          <div className="affiliate-table-wrap">
            <table className="orders-table">
              <caption className="sr-only">{t("overview.subIdsCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("overview.subId")}</th>
                  <th scope="col">{t("overview.clicks")}</th>
                  <th scope="col">{t("overview.conversions")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.subIds.map((s) => (
                  <tr key={s.subId ?? ""}>
                    <th scope="row">{s.subId ?? <span className="muted">{t("overview.noSubId")}</span>}</th>
                    <td>{count.format(s.clicks)}</td>
                    <td>{count.format(s.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("overview.noActivity")}</p>
        )}
      </section>
    </>
  );
}
