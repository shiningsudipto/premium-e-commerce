"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { artFor } from "../../components/storefront/art";
import { Media } from "../../components/storefront/media";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { bagErrorMessage, useRemoveLineMutation, useSetLineQuantityMutation } from "./cart-api";
import { freeShippingProgress, type Bag, type BagLine } from "./types";

// The bag's lines, shared by the drawer and the bag page. `cart` is RTK Query's cached bag:
// a quantity change updates it at once and settles to the API's repriced cart; a failure rolls
// it back and says why.
export function BagLines({ cart, market, onNavigate }: { cart: Bag; market: MarketRef; onNavigate?: () => void }) {
  const t = useTranslations("cart");
  const [error, setError] = useState("");
  const [setQuantity] = useSetLineQuantityMutation();
  const [remove] = useRemoveLineMutation();
  const lines = cart.lines;
  const money = (minor: number) => formatMoney(minor, cart.currency, market.locale);

  const change = async (line: BagLine, quantity: number) => {
    setError("");
    const arg = { cartId: cart.id, lineId: line.id };
    const result = quantity === 0 ? await remove(arg) : await setQuantity({ ...arg, quantity });
    if (result.error) setError(bagErrorMessage(result.error));
  };

  return (
    <>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <ul className="bag-lines" aria-label={t("items")}>
        {lines.map((line) => {
          const productHref = line.productHandle ? href(market, `/products/${line.productHandle}`) : undefined;
          return (
            <li className="bag-line" key={line.id} data-testid="bag-line">
              <div className="bag-line__media">
                <Media
                  image={line.image}
                  art={artFor(line.title)}
                  tone="mid"
                  alt={line.title}
                  sizes="84px"
                  decorative
                />
              </div>
              <div className="bag-line__body">
                <p className="bag-line__title">
                  {productHref ? (
                    <Link href={productHref} onClick={onNavigate}>
                      {line.title}
                    </Link>
                  ) : (
                    line.title
                  )}
                </p>
                {line.variantTitle && <p className="bag-line__meta">{line.variantTitle}</p>}
                <p className="bag-line__meta">
                  {line.compareAtMinor && line.compareAtMinor > line.unitPriceMinor && (
                    <>
                      <s>{money(line.compareAtMinor)}</s>{" "}
                    </>
                  )}
                  {money(line.unitPriceMinor)}
                </p>
                {line.issues.map((issue) => (
                  <p className="bag-line__issue" key={issue.code}>
                    {issue.message}
                  </p>
                ))}
                <div className="bag-line__row">
                  <div className="qty" role="group" aria-label={t("quantityFor", { title: line.title })}>
                    <button
                      type="button"
                      aria-label={t("decrease")}
                      onClick={() => change(line, line.quantity - 1)}
                      disabled={line.quantity <= 1}
                    >
                      −
                    </button>
                    <output aria-live="polite">{line.quantity}</output>
                    <button
                      type="button"
                      aria-label={t("increase")}
                      onClick={() => change(line, line.quantity + 1)}
                      disabled={line.quantity >= 999}
                    >
                      +
                    </button>
                  </div>
                  <span className="price">{money(line.totalMinor)}</span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => change(line, 0)}
                    aria-label={t("removeItem", { title: line.title })}
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ShippingProgress({ cart, market }: { cart: Bag; market: MarketRef }) {
  const t = useTranslations("cart");
  const progress = freeShippingProgress(cart);
  if (!progress) return null;
  return (
    <div className="ship-progress">
      <span>
        {progress.reached
          ? t("freeShippingReached")
          : t("freeShippingRemaining", { amount: formatMoney(progress.remaining, cart.currency, market.locale) })}
      </span>
      <div
        className="ship-progress__bar"
        role="progressbar"
        aria-label={t("freeShippingProgress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.ratio * 100)}
      >
        <span style={{ width: `${progress.ratio * 100}%` }} />
      </div>
    </div>
  );
}

// Subtotal, discounts, and (once known at checkout) shipping and tax.
export function BagSummary({ cart, market, final }: { cart: Bag; market: MarketRef; final?: boolean }) {
  const t = useTranslations("cart");
  const money = (minor: number) => formatMoney(minor, cart.currency, market.locale);
  const discount = cart.discountMinor + cart.shippingDiscountMinor;
  const shippingKnown = !!cart.selectedShippingRateId;
  return (
    <dl className="summary">
      <div className="summary__row">
        <dt>{t("subtotal")}</dt>
        <dd>{money(cart.subtotalMinor)}</dd>
      </div>
      {discount > 0 && (
        <div className="summary__row">
          <dt>{t("discount")}</dt>
          <dd>−{money(discount)}</dd>
        </div>
      )}
      {final && (
        <div className="summary__row">
          <dt>{t("shipping")}</dt>
          <dd>{shippingKnown ? (cart.shippingMinor ? money(cart.shippingMinor) : t("free")) : t("shippingLater")}</dd>
        </div>
      )}
      {final && cart.taxMinor > 0 && (
        <div className="summary__row">
          <dt>{t("tax")}</dt>
          <dd>{money(cart.taxMinor)}</dd>
        </div>
      )}
      <div className="summary__row summary__row--total">
        <dt>{final ? t("total") : t("estimatedTotal")}</dt>
        <dd>{money(final ? cart.totalMinor : cart.subtotalMinor - cart.discountMinor)}</dd>
      </div>
      {!final && <p className="summary__note">{t("taxNote")}</p>}
    </dl>
  );
}

export function EmptyBag({ market, onNavigate }: { market: MarketRef; onNavigate?: () => void }) {
  const t = useTranslations("cart");
  return (
    <div className="no-results">
      <h2 className="h3">{t("emptyTitle")}</h2>
      <p className="muted">{t("emptyBody")}</p>
      <Link className="btn btn--primary" href={href(market, "/products")} onClick={onNavigate}>
        {t("startShopping")}
      </Link>
    </div>
  );
}
