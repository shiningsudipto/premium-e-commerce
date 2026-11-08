import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { readPayouts } from "@/src/features/affiliate/readers";
import { cursorOf, NextPage, StatusPill } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.payouts"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Payout history. Payouts are prepared and sent by the store (manual payouts, spec §7.6).
export default async function AffiliatePayoutsPage({ searchParams }: Props) {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t, params] = await Promise.all([requestContext(), getTranslations("affiliate"), searchParams]);
  const cursor = cursorOf(params);
  const [raw, config] = await Promise.all([
    unwrap(
      serverApi(ctx).GET("/v1/affiliate/payouts", { params: { query: { limit: 25, ...(cursor ? { cursor } : {}) } } }),
    ),
    getStoreConfig(ctx.market),
  ]);
  const page = readPayouts(raw);
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });
  const label = (group: string, value: string) => (t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value);

  return (
    <section aria-labelledby="affiliate-payouts-title">
      <h2 className="h3" id="affiliate-payouts-title">
        {t("payouts.title")}
      </h2>
      <p className="muted">{t("payouts.intro")}</p>
      {page.items.length ? (
        <div className="affiliate-table-wrap">
          <table className="orders-table" data-testid="affiliate-payouts">
            <thead>
              <tr>
                <th scope="col">{t("payouts.date")}</th>
                <th scope="col">{t("payouts.status")}</th>
                <th scope="col">{t("payouts.amount")}</th>
                <th scope="col">{t("payouts.method")}</th>
                <th scope="col">{t("payouts.reference")}</th>
                <th scope="col">{t("payouts.paidAt")}</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.createdAt ? date.format(new Date(p.createdAt)) : "—"}</td>
                  <td>
                    <StatusPill status={p.status} label={label("payoutStatus", p.status)} />
                  </td>
                  <td>{formatMoney(p.amountMinor, p.currency ?? config.market.currency, ctx.market.locale)}</td>
                  <td>{p.method ? label("payoutMethod", p.method) : "—"}</td>
                  <td>{p.providerRef ?? "—"}</td>
                  <td>{p.paidAt ? date.format(new Date(p.paidAt)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{cursor ? t("payouts.noMore") : t("payouts.empty")}</p>
      )}
      <NextPage base={href(ctx.market, "/affiliate/payouts")} cursor={page.nextCursor} label={t("older")} />
    </section>
  );
}
