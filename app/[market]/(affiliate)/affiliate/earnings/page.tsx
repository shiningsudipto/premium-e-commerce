import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { readEarnings } from "@/src/features/affiliate/readers";
import { cursorOf, NextPage, StatusPill } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.earnings"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The earnings ledger: commissions, adjustments and reversals, newest first.
export default async function AffiliateEarningsPage({ searchParams }: Props) {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t, params] = await Promise.all([requestContext(), getTranslations("affiliate"), searchParams]);
  const cursor = cursorOf(params);
  const [raw, config] = await Promise.all([
    unwrap(
      serverApi(ctx).GET("/v1/affiliate/earnings", { params: { query: { limit: 25, ...(cursor ? { cursor } : {}) } } }),
    ),
    getStoreConfig(ctx.market),
  ]);
  const page = readEarnings(raw);
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });
  const label = (group: string, value: string) => (t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value);

  return (
    <section aria-labelledby="affiliate-earnings-title">
      <h2 className="h3" id="affiliate-earnings-title">
        {t("earnings.title")}
      </h2>
      <p className="muted">{t("earnings.intro")}</p>
      {page.items.length ? (
        <div className="affiliate-table-wrap">
          <table className="orders-table" data-testid="affiliate-earnings">
            <thead>
              <tr>
                <th scope="col">{t("earnings.date")}</th>
                <th scope="col">{t("earnings.kind")}</th>
                <th scope="col">{t("earnings.status")}</th>
                <th scope="col">{t("earnings.reward")}</th>
                <th scope="col">{t("earnings.amount")}</th>
                <th scope="col">{t("earnings.note")}</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((e) => (
                <tr key={e.id}>
                  <td>{e.createdAt ? date.format(new Date(e.createdAt)) : "—"}</td>
                  <td>{label("earningKind", e.kind)}</td>
                  <td>
                    <StatusPill status={e.status} label={label("earningStatus", e.status)} />
                    {e.status === "PENDING" && e.approvableAt && (
                      <span className="affiliate-stat__note">
                        {t("earnings.approvableAt", { date: date.format(new Date(e.approvableAt)) })}
                      </span>
                    )}
                  </td>
                  <td>{label("rewardType", e.rewardType)}</td>
                  <td>{formatMoney(e.amountMinor, e.currency ?? config.market.currency, ctx.market.locale)}</td>
                  <td>{e.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{cursor ? t("earnings.noMore") : t("earnings.empty")}</p>
      )}
      <NextPage base={href(ctx.market, "/affiliate/earnings")} cursor={page.nextCursor} label={t("older")} />
    </section>
  );
}
