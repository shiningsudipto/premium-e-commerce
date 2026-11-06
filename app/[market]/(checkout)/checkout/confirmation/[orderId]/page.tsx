import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ApiError, unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { Icon } from "@/src/components/storefront/icon";
import { formatAddress, isAddress } from "@/src/features/checkout/address";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("confirmedTitle"), robots: { index: false } };
}

type Params = PageProps<"/[market]/checkout/confirmation/[orderId]">["params"];

export default async function ConfirmationPage({ params }: PageProps<"/[market]/checkout/confirmation/[orderId]">) {
  return (
    <div className="pt-container">
      <Suspense>
        <Confirmation params={params} />
      </Suspense>
    </div>
  );
}

// Only the shopper who placed the order can see it: the API checks the session owns it.
async function Confirmation({ params }: { params: Params }) {
  const [{ orderId }, ctx, t] = await Promise.all([params, requestContext(), getTranslations("checkout")]);
  if (!ctx.token) notFound();
  const order = await unwrap(serverApi(ctx).GET("/v1/store/orders/{id}", { params: { path: { id: orderId } } })).catch(
    (err: unknown) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
      throw err;
    },
  );
  if (!order) notFound();
  const money = (minor: number) => formatMoney(minor, order.currency, ctx.market.locale);
  const payment = order.payments[0];

  return (
    <div className="confirm" data-testid="order-confirmation">
      <span className="confirm__mark" aria-hidden="true">
        <Icon name="check" />
      </span>
      <h2 className="h2">{t("confirmedTitle")}</h2>
      <p>{t("confirmedBody", { number: order.number, email: order.email ?? "" })}</p>
      <dl className="summary">
        <div className="summary__row">
          <dt>{t("orderNumber")}</dt>
          <dd data-testid="order-number">{order.number}</dd>
        </div>
        {isAddress(order.shippingAddress) && (
          <div className="summary__row">
            <dt>{t("deliverTo")}</dt>
            <dd style={{ textAlign: "right" }}>{formatAddress(order.shippingAddress)}</dd>
          </div>
        )}
        {payment && (
          <div className="summary__row">
            <dt>{t("payment")}</dt>
            <dd>{payment.provider === "cod" ? t("cashOnDelivery") : payment.provider}</dd>
          </div>
        )}
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
          <dt>{t("shippingCost")}</dt>
          <dd>{order.shippingMinor ? money(order.shippingMinor) : t("free")}</dd>
        </div>
        <div className="summary__row summary__row--total">
          <dt>{t("total")}</dt>
          <dd>{money(order.totalMinor)}</dd>
        </div>
      </dl>
      <div className="buy-row">
        <Link className="btn btn--primary" href={href(ctx.market, "/products")}>
          {t("keepShopping")}
        </Link>
        {ctx.kind === "customer" && (
          <Link className="btn btn--secondary" href={href(ctx.market, `/account/orders/${order.id}`)}>
            {t("viewOrder")}
          </Link>
        )}
      </div>
    </div>
  );
}
