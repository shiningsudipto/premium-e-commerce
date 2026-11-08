"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { BagPromoCodes } from "./bag-promo-codes";
import { useBagDispatch } from "./bag-store";
import { BagLines, BagSummary, EmptyBag, ShippingProgress } from "./bag-view";
import { bagApi } from "./cart-api";
import type { Bag } from "./types";

// The bag page: lines on the left, totals and checkout on the right. The server renders it with
// the bag it loaded; that bag seeds RTK Query's cache, which every change then updates.
export function CartPageView({ initial, market }: { initial: Bag | null; market: MarketRef }) {
  const t = useTranslations("cart");
  const dispatch = useBagDispatch();
  // read the cache without fetching: the server already loaded this bag
  const { data } = bagApi.endpoints.getBag.useQueryState();
  // keep the entry while the page is open
  bagApi.endpoints.getBag.useQuerySubscription(undefined, { skip: data === undefined });

  useEffect(() => {
    dispatch(bagApi.util.upsertQueryData("getBag", undefined, initial));
  }, [dispatch, initial]);

  const cart = data === undefined ? initial : data;
  if (!cart || cart.lines.length === 0) return <EmptyBag market={market} />;
  return (
    <div className="cart-page">
      <div>
        <ShippingProgress cart={cart} market={market} />
        <BagLines cart={cart} market={market} />
      </div>
      <aside className="cart-page__aside" aria-label={t("summary")}>
        <BagPromoCodes cart={cart} market={market} />
        <BagSummary cart={cart} market={market} />
        {cart.issues.map((issue) => (
          <p key={issue.code} className="notice notice--error">
            {issue.message}
          </p>
        ))}
        <Link className="btn btn--primary" href={href(market, "/checkout")} data-testid="go-to-checkout">
          {t("checkout")}
        </Link>
        <Link className="btn btn--secondary" href={href(market, "/products")}>
          {t("continueShopping")}
        </Link>
      </aside>
    </div>
  );
}
