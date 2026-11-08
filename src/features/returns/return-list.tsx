import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { returnTone, type ReturnView } from "./returns";

type Line = { title: string };

// Return requests as cards: number, status, what's coming back and why, and any label,
// tracking or store credit. Used on an order's page (with its line titles) and on the
// account's returns page (with a link to each order).
export async function ReturnList({
  returns,
  market,
  currency,
  lines,
  orders,
}: {
  returns: (ReturnView & { order?: { id: string; number: string; currency: string } })[];
  market: MarketRef;
  // the order's currency, when every return belongs to the same order
  currency?: string;
  // order line titles by order line id, when known
  lines?: Record<string, Line>;
  orders?: boolean;
}) {
  const t = await getTranslations("returns");
  const date = new Intl.DateTimeFormat(market.locale, { dateStyle: "medium" });
  return (
    <ul className="return-list" data-testid="return-list">
      {returns.map((r) => {
        const tone = returnTone(r.status);
        const money = r.order?.currency ?? currency;
        const units = r.lines.reduce((sum, l) => sum + l.quantity, 0);
        return (
          <li key={r.id} className="box return-card" data-testid="return-card">
            <div className="return-card__head">
              <h3 className="return-card__title">
                {r.number !== null ? t("returnNumber", { number: r.number }) : t("returnRequest")}
              </h3>
              <span className={`status${tone ? ` status--${tone}` : ""}`} data-testid="return-status">
                {t(`status.${r.status}`)}
              </span>
            </div>
            <p className="muted return-card__meta">
              <time dateTime={r.createdAt}>{t("requestedOn", { date: date.format(new Date(r.createdAt)) })}</time>
              {" · "}
              {t(`resolution.${r.resolution}.label`)}
              {orders && r.order && (
                <>
                  {" · "}
                  <Link href={href(market, `/account/orders/${r.order.id}`)}>
                    {t("forOrder", { number: r.order.number })}
                  </Link>
                </>
              )}
            </p>
            <p className="return-card__step">{t(`statusHelp.${r.status}`)}</p>
            {lines ? (
              <ul className="return-card__lines">
                {r.lines.map((l) => (
                  <li key={l.id}>
                    {lines[l.orderLineId]?.title ?? t("item")} × {l.quantity}
                    {l.reason && (
                      <span className="muted">
                        {" — "}
                        {t.has(`reasons.${l.reason}`) ? t(`reasons.${l.reason}`) : l.reason}
                      </span>
                    )}
                    {l.acceptedQuantity !== null && l.acceptedQuantity !== l.quantity && (
                      <span className="muted"> ({t("accepted", { count: l.acceptedQuantity })})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t("units", { count: units })}</p>
            )}
            {r.labelUrl && /^https:\/\//i.test(r.labelUrl) && (
              <p>
                <a href={r.labelUrl} target="_blank" rel="noopener noreferrer">
                  {t("label")}
                </a>
              </p>
            )}
            {r.trackingNumber && (
              <p className="muted">{t("tracking", { carrier: r.carrier ?? "none", number: r.trackingNumber })}</p>
            )}
            {r.creditMinor !== null && r.creditMinor > 0 && money && (
              <p>{t("credit", { amount: formatMoney(r.creditMinor, money, market.locale) })}</p>
            )}
            {r.customerNote && <p className="muted return-card__note">{t("yourNote", { note: r.customerNote })}</p>}
          </li>
        );
      })}
    </ul>
  );
}
