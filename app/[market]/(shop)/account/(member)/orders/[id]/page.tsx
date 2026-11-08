import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { statusKey, statusTone } from "@/src/features/account/order-status";
import { formatAddress, isAddress } from "@/src/features/checkout/address";
import { getOrderReturns } from "@/src/features/returns/data";
import { ReturnList } from "@/src/features/returns/return-list";
import { canHaveReturns, returnableQuantities } from "@/src/features/returns/returns";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("order"), robots: { index: false } };
}

// One order: what was bought, where it's going, shipments with tracking, returns, and the timeline.
export default async function OrderPage({ params, searchParams }: PageProps<"/[market]/account/orders/[id]">) {
  const [{ id }, ctx, t, ts, tr, query] = await Promise.all([
    params,
    requestContext(),
    getTranslations("account"),
    getTranslations("orderStatus"),
    getTranslations("returns"),
    searchParams,
  ]);
  const order = await unwrap(serverApi(ctx).GET("/v1/store/orders/{id}", { params: { path: { id } } })).catch(
    (err: unknown) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
      throw err;
    },
  );
  if (!order) notFound();
  // only shipped orders can have returns; a failed read hides the section's actions, not the order
  const returns = canHaveReturns(order.status) ? await getOrderReturns(ctx, order.id).catch(() => null) : [];
  const returnable = returns ? returnableQuantities(order.lines, returns) : {};
  const canRequestReturn = canHaveReturns(order.status) && Object.values(returnable).some((n) => n > 0);
  const justRequested = query.return === "requested";
  const money = (minor: number) => formatMoney(minor, order.currency, ctx.market.locale);
  const dateTime = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium", timeStyle: "short" });
  const tone = statusTone(order.status);

  return (
    <>
      <p>
        <Link className="link-btn" href={href(ctx.market, "/account/orders")}>
          ← {t("allOrders")}
        </Link>
      </p>
      <header className="step__head">
        <h2 className="h3">{t("orderNumber", { number: order.number })}</h2>
        <span className={`status${tone ? ` status--${tone}` : ""}`} data-testid="order-status">
          {ts.has(statusKey(order.status)) ? ts(statusKey(order.status)) : order.status}
        </span>
      </header>

      <div className="card-list card-list--2">
        <section className="box" aria-labelledby="ship-to">
          <h3 id="ship-to" className="eyebrow">
            {t("shipTo")}
          </h3>
          <p>{isAddress(order.shippingAddress) ? formatAddress(order.shippingAddress) : "—"}</p>
        </section>
        <section className="box" aria-labelledby="paid-with">
          <h3 id="paid-with" className="eyebrow">
            {t("payment")}
          </h3>
          {order.payments.map((p, i) => (
            <p key={i}>
              {p.provider === "cod" ? t("cashOnDelivery") : p.provider} · {money(p.amountMinor)} ·{" "}
              {p.status.toLowerCase().replace(/_/g, " ")}
            </p>
          ))}
        </section>
      </div>

      <section aria-labelledby="items-title">
        <h3 id="items-title" className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
          {t("items")}
        </h3>
        <dl className="summary">
          {order.lines.map((line) => (
            <div className="summary__row" key={line.id}>
              <dt>
                {line.title}
                {line.variantTitle ? ` · ${line.variantTitle}` : ""} × {line.quantity}
              </dt>
              <dd>{money(line.totalMinor)}</dd>
            </div>
          ))}
          <div className="summary__row">
            <dt>{t("subtotal")}</dt>
            <dd>{money(order.subtotalMinor)}</dd>
          </div>
          {order.discountMinor > 0 && (
            <div className="summary__row">
              <dt>{t("discount")}</dt>
              <dd>−{money(order.discountMinor)}</dd>
            </div>
          )}
          <div className="summary__row">
            <dt>{t("shipping")}</dt>
            <dd>{order.shippingMinor ? money(order.shippingMinor) : t("free")}</dd>
          </div>
          {order.taxMinor > 0 && (
            <div className="summary__row">
              <dt>{order.taxInclusive ? t("taxIncluded") : t("tax")}</dt>
              <dd>{money(order.taxMinor)}</dd>
            </div>
          )}
          <div className="summary__row summary__row--total">
            <dt>{t("total")}</dt>
            <dd>{money(order.totalMinor)}</dd>
          </div>
        </dl>
      </section>

      {order.fulfillments.length > 0 && (
        <section aria-labelledby="shipments-title" className="form-grid">
          <h3 id="shipments-title" className="eyebrow">
            {t("shipments")}
          </h3>
          {order.fulfillments.map((f) => (
            <div className="box" key={f.id}>
              <p>
                <strong>{f.status.toLowerCase().replace(/_/g, " ")}</strong>
                {f.carrier ? ` · ${f.carrier}` : ""}
                {f.trackingNumber && (
                  <>
                    {" · "}
                    {t("tracking")}{" "}
                    {f.trackingUrl && /^https?:\/\//i.test(f.trackingUrl) ? (
                      <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer">
                        {f.trackingNumber}
                      </a>
                    ) : (
                      f.trackingNumber
                    )}
                  </>
                )}
              </p>
              {f.shippedAt && (
                <p className="muted">{t("shippedAt", { date: dateTime.format(new Date(f.shippedAt)) })}</p>
              )}
              {f.deliveredAt && (
                <p className="muted">{t("deliveredAt", { date: dateTime.format(new Date(f.deliveredAt)) })}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {(canHaveReturns(order.status) || justRequested) && (
        <section id="returns" aria-labelledby="returns-title" className="form-grid" data-testid="order-returns">
          <h3 id="returns-title" className="eyebrow">
            {tr("title")}
          </h3>
          {justRequested && (
            <p className="notice" role="status" data-testid="return-requested">
              {tr("requested")}
            </p>
          )}
          {returns === null ? (
            <p className="muted">{tr("loadFailed")}</p>
          ) : (
            returns.length > 0 && (
              <ReturnList
                returns={returns}
                market={ctx.market}
                currency={order.currency}
                lines={Object.fromEntries(
                  order.lines.map((l) => [
                    l.id,
                    { title: l.variantTitle ? `${l.title} · ${l.variantTitle}` : l.title },
                  ]),
                )}
              />
            )
          )}
          {canRequestReturn && (
            <p>
              <Link
                className="btn btn--secondary"
                href={href(ctx.market, `/account/orders/${order.id}/return`)}
                data-testid="request-return"
              >
                {tr("request")}
              </Link>
            </p>
          )}
        </section>
      )}

      {order.timeline.length > 0 && (
        <section aria-labelledby="timeline-title">
          <h3 id="timeline-title" className="eyebrow" style={{ marginBottom: "var(--space-4)" }}>
            {t("timeline")}
          </h3>
          <ol className="timeline">
            {order.timeline.map((event, i) => (
              <li key={i}>
                <time dateTime={new Date(event.createdAt).toISOString()}>
                  {dateTime.format(new Date(event.createdAt))}
                </time>
                {event.message}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
