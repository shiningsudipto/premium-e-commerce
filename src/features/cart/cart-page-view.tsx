"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { BagLines, BagSummary, EmptyBag, ShippingProgress } from "./bag-view";
import type { Bag } from "./types";

// The bag page: lines on the left, totals and checkout on the right.
export function CartPageView({ initial, market }: { initial: Bag | null; market: MarketRef }) {
  const t = useTranslations("cart");
  const [cart, setCart] = useState(initial);
  if (!cart || cart.lines.length === 0) return <EmptyBag market={market} />;
  return (
    <div className="cart-page">
      <div>
        <ShippingProgress cart={cart} market={market} />
        <BagLines cart={cart} market={market} onCart={setCart} />
      </div>
      <aside className="cart-page__aside" aria-label={t("summary")}>
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
