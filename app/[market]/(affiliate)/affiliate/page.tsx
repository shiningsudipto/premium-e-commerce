import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import type { paths } from "@/src/api/schema";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import {
  nextSort,
  overviewQuery,
  periodFrom,
  periodOf,
  PERIODS,
  sortOf,
  SUB_ID_SORTS,
  subIdRows,
  type SubIdSortKey,
} from "@/src/features/affiliate/subids";
import { ProgressBar, Stat } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("dashboard.title"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Commission = NonNullable<
  paths["/v1/affiliate/tier"]["get"]["responses"]["200"]["content"]["application/json"]["current"]
>["commission"];

// Overview: tier and progress, the chosen period's results (7, 30 or 90 days), balances and the
// sortable sub-ID breakdown. Period and sort live in the URL.
export default async function AffiliateOverviewPage({ searchParams }: Props) {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t, params] = await Promise.all([requestContext(), getTranslations("affiliate"), searchParams]);
  const period = periodOf(params);
  const sort = sortOf(params);
  const api = serverApi(ctx);
  const [stats, balance, tier, config] = await Promise.all([
    unwrap(api.GET("/v1/affiliate/stats", { params: { query: { from: periodFrom(period, new Date()) } } })),
    unwrap(api.GET("/v1/affiliate/balance")),
    unwrap(api.GET("/v1/affiliate/tier")),
    getStoreConfig(ctx.market),
  ]);
  const currency = balance.currency ?? config.market.currency;
  const money = (minor: number) => formatMoney(minor, currency, ctx.market.locale);
  const percent = new Intl.NumberFormat(ctx.market.locale, { style: "percent", maximumFractionDigits: 1 });
  const count = new Intl.NumberFormat(ctx.market.locale);
  const defaultCode =
    me.links.find((l) => l.isDefault && l.status === "ACTIVE") ?? me.links.find((l) => l.status === "ACTIVE");
  const base = href(ctx.market, "/affiliate");
  const rows = subIdRows(stats.subIds, sort);

  const commission = (c: Commission) => {
    if (!c) return null;
    const scope = c.appliesTo && c.appliesTo !== "all" ? ` ${t(`tier.appliesTo.${c.appliesTo}`)}` : "";
    switch (c.type) {
      case "percent":
        return c.percent !== undefined ? t("tier.percent", { rate: percent.format(c.percent / 100) }) + scope : null;
      case "fixed_per_item":
        return c.amountMinor !== undefined ? t("tier.perItem", { amount: money(c.amountMinor) }) + scope : null;
      case "fixed_per_order":
        return c.amountMinor !== undefined ? t("tier.perOrder", { amount: money(c.amountMinor) }) + scope : null;
      case "tiered":
        return t("tier.tiered") + scope;
    }
  };
  const reward = (type: string) => (t.has(`rewardType.${type}`) ? t(`rewardType.${type}`) : type);
  const sortLabel = (key: SubIdSortKey) =>
    key === "subId"
      ? t("overview.subId")
      : key === "clicks"
        ? t("overview.clicks")
        : key === "conversions"
          ? t("overview.conversions")
          : t("overview.conversionRate");

  return (
    <>
      <section className="box" aria-labelledby="affiliate-profile-title">
        <h2 className="h3" id="affiliate-profile-title">
          {t("overview.profile")}
        </h2>
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

      <section className="box affiliate-tier" aria-labelledby="affiliate-tier-title" data-testid="affiliate-tier">
        <h2 className="h3" id="affiliate-tier-title">
          {t("tier.title")}
        </h2>
        {tier.current ? (
          <>
            <p className="affiliate-tier__name">{tier.current.name}</p>
            <ul className="affiliate-points">
              <li>{t("tier.rewardAs", { reward: reward(tier.current.rewardType) })}</li>
              {commission(tier.current.commission) && <li>{commission(tier.current.commission)}</li>}
            </ul>
          </>
        ) : (
          <p className="muted">{t("tier.none")}</p>
        )}
        {tier.automatic && tier.next ? (
          <div className="affiliate-tier__next">
            <h3 className="affiliate-tier__subtitle">{t("tier.nextTitle", { tier: tier.next.name })}</h3>
            <ProgressBar
              value={tier.periodSalesMinor}
              max={tier.next.minSalesMinor}
              label={t("tier.progressLabel", { tier: tier.next.name })}
              valueText={t("tier.progress", {
                sales: money(tier.periodSalesMinor),
                target: money(tier.next.minSalesMinor),
                days: tier.periodDays,
              })}
            />
            <p className="muted">
              {tier.periodSalesMinor >= tier.next.minSalesMinor
                ? t("tier.reached")
                : t("tier.toGo", { amount: money(tier.next.minSalesMinor - tier.periodSalesMinor) })}{" "}
              {t("tier.nextBenefits", {
                benefits: [
                  t("tier.rewardAs", { reward: reward(tier.next.rewardType) }),
                  commission(tier.next.commission),
                ]
                  .filter(Boolean)
                  .join(", "),
              })}
            </p>
          </div>
        ) : tier.automatic && tier.current ? (
          <p className="muted">{t("tier.top", { sales: money(tier.periodSalesMinor), days: tier.periodDays })}</p>
        ) : null}
      </section>

      <section aria-labelledby="affiliate-stats-title">
        <div className="affiliate-section-head">
          <h2 className="h3" id="affiliate-stats-title">
            {t("overview.lastDays", { days: period })}
          </h2>
          <nav className="chips affiliate-periods" aria-label={t("overview.periodLabel")}>
            {PERIODS.map((p) => (
              <Link
                key={p}
                className="chip"
                href={`${base}${overviewQuery(p, sort)}`}
                aria-current={p === period ? "true" : undefined}
                scroll={false}
              >
                {t("overview.days", { days: p })}
              </Link>
            ))}
          </nav>
        </div>
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
        <p className="affiliate-pager">
          <Link className="btn btn--secondary" href={href(ctx.market, "/affiliate/payouts")}>
            {t("overview.toPayouts")}
          </Link>
        </p>
      </section>

      <section aria-labelledby="affiliate-subids-title" id="sub-ids">
        <h2 className="h3" id="affiliate-subids-title">
          {t("overview.subIds")}
        </h2>
        {rows.length ? (
          <div className="affiliate-table-wrap">
            <table className="orders-table affiliate-subids" data-testid="affiliate-subids">
              <caption className="sr-only">
                {t("overview.subIdsCaption", { days: period })}{" "}
                {t("overview.sortedBy", {
                  column: sortLabel(sort.key),
                  direction: t(`overview.sort.${sort.dir}`),
                })}
              </caption>
              <thead>
                <tr>
                  {SUB_ID_SORTS.map((key) => (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      <Link
                        className="affiliate-sort"
                        href={`${base}${overviewQuery(period, nextSort(sort, key))}#sub-ids`}
                        scroll={false}
                      >
                        {sortLabel(key)}
                        <span aria-hidden="true" className="affiliate-sort__icon">
                          {sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </Link>
                    </th>
                  ))}
                  <th scope="col">{t("overview.share")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.subId ?? ""}>
                    <th scope="row">{s.subId ?? <span className="muted">{t("overview.noSubId")}</span>}</th>
                    <td>{count.format(s.clicks)}</td>
                    <td>{count.format(s.conversions)}</td>
                    <td>{s.rate === null ? "—" : percent.format(s.rate)}</td>
                    <td className="affiliate-share">
                      <span className="affiliate-share__bar" aria-hidden="true">
                        <span style={{ width: `${(s.share * 100).toFixed(1)}%` }} />
                      </span>
                      <span className="affiliate-share__value">{percent.format(s.share)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("overview.noActivityDays", { days: period })}</p>
        )}
      </section>
    </>
  );
}
