import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { statusKey, statusTone } from "@/src/features/account/order-status";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("orders"), robots: { index: false } };
}

// Order history, newest first, with a "more" link when the API has another page.
export default async function OrdersPage({ searchParams }: PageProps<"/[market]/account/orders">) {
  const [ctx, t, ts, params] = await Promise.all([
    requestContext(),
    getTranslations("account"),
    getTranslations("orderStatus"),
    searchParams,
  ]);
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const page = await unwrap(
    serverApi(ctx).GET("/v1/store/account/orders", { params: { query: { limit: 20, ...(cursor ? { cursor } : {}) } } }),
  );
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });

  if (!page.items.length && !cursor) {
    return (
      <div className="no-results">
        <h2 className="h3">{t("noOrders")}</h2>
        <Link className="btn btn--primary" href={href(ctx.market, "/products")}>
          {t("startShopping")}
        </Link>
      </div>
    );
  }
  return (
    <section aria-labelledby="orders-title">
      <h2 className="h3" id="orders-title" style={{ marginBottom: "var(--space-4)" }}>
        {t("orders")}
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table className="orders-table">
          <thead>
            <tr>
              <th scope="col">{t("order")}</th>
              <th scope="col">{t("date")}</th>
              <th scope="col">{t("status")}</th>
              <th scope="col">{t("items")}</th>
              <th scope="col">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={href(ctx.market, `/account/orders/${o.id}`)}>{o.number}</Link>
                </td>
                <td>{date.format(new Date(o.placedAt ?? o.createdAt))}</td>
                <td>
                  <span className={`status${statusTone(o.status) ? ` status--${statusTone(o.status)}` : ""}`}>
                    {ts.has(statusKey(o.status)) ? ts(statusKey(o.status)) : o.status}
                  </span>
                </td>
                <td>{o.lineCount}</td>
                <td>{formatMoney(o.totalMinor, o.currency, ctx.market.locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {page.nextCursor && (
        <p style={{ marginTop: "var(--space-5)" }}>
          <Link
            className="btn btn--secondary"
            href={`${href(ctx.market, "/account/orders")}?cursor=${encodeURIComponent(page.nextCursor)}`}
          >
            {t("olderOrders")}
          </Link>
        </p>
      )}
    </section>
  );
}
