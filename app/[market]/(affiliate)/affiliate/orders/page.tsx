import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { statusKey, statusTone } from "@/src/features/account/order-status";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { cursorOf, NextPage, StatusPill } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.orders"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Orders credited to the affiliate. The API returns no buyer details (spec §7.7), only a
// shortened reference, amounts and statuses.
export default async function AffiliateOrdersPage({ searchParams }: Props) {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t, ts, params] = await Promise.all([
    requestContext(),
    getTranslations("affiliate"),
    getTranslations("orderStatus"),
    searchParams,
  ]);
  const cursor = cursorOf(params);
  const page = await unwrap(
    serverApi(ctx).GET("/v1/affiliate/orders", { params: { query: { limit: 25, ...(cursor ? { cursor } : {}) } } }),
  );
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });

  return (
    <section aria-labelledby="affiliate-orders-title">
      <h2 className="h3" id="affiliate-orders-title">
        {t("orders.title")}
      </h2>
      <p className="muted">{t("orders.privacy")}</p>
      {page.items.length ? (
        <div className="affiliate-table-wrap">
          <table className="orders-table" data-testid="affiliate-orders">
            <thead>
              <tr>
                <th scope="col">{t("orders.reference")}</th>
                <th scope="col">{t("orders.date")}</th>
                <th scope="col">{t("orders.status")}</th>
                <th scope="col">{t("orders.amount")}</th>
                <th scope="col">{t("orders.subId")}</th>
                <th scope="col">{t("orders.commission")}</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((o) => (
                <tr key={o.id}>
                  <th scope="row">{o.reference}</th>
                  <td>{date.format(new Date(o.placedAt))}</td>
                  <td>
                    <span
                      className={`status${statusTone(o.orderStatus) ? ` status--${statusTone(o.orderStatus)}` : ""}`}
                    >
                      {ts.has(statusKey(o.orderStatus)) ? ts(statusKey(o.orderStatus)) : o.orderStatus}
                    </span>
                  </td>
                  <td>{formatMoney(o.orderAmountMinor, o.currency, ctx.market.locale)}</td>
                  <td>{o.subId ?? "—"}</td>
                  <td>
                    {formatMoney(o.commissionMinor, o.currency, ctx.market.locale)}{" "}
                    {o.commissionStatus && (
                      <StatusPill
                        status={o.commissionStatus}
                        label={
                          t.has(`earningStatus.${o.commissionStatus}`)
                            ? t(`earningStatus.${o.commissionStatus}`)
                            : o.commissionStatus
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{cursor ? t("orders.noMore") : t("orders.empty")}</p>
      )}
      <NextPage base={href(ctx.market, "/affiliate/orders")} cursor={page.nextCursor} label={t("older")} />
    </section>
  );
}
