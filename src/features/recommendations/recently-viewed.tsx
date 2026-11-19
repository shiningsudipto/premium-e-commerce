"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import type { MarketRef } from "../../lib/market";
import { readRecent, recordView } from "./recently-viewed-store";
import { RecommendationCard } from "./recommendation-card";
import type { RecommendedProduct } from "./recommendations-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CHANNEL = process.env.NEXT_PUBLIC_CHANNEL ?? "web";

// "Recently viewed": the pieces this browser looked at, newest first. The IDs live in
// localStorage and the cards are fetched by the browser after the page has loaded, so the cached
// page is the same for everyone. It renders nothing until there is something to show and is
// always placed below the page's own content, so filling in never moves what the shopper sees.
//
// On a product page, pass `productId`: the view is recorded and that product left out of the strip.
export function RecentlyViewed({
  market,
  productId,
  title,
  limit = 8,
  className = "related",
}: {
  market: MarketRef;
  productId?: string;
  title?: string;
  limit?: number;
  className?: string;
}) {
  const t = useTranslations("recommendations");
  const headingId = useId();
  const [items, setItems] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    const ids = (productId ? recordView(productId) : readRecent()).filter((id) => id !== productId).slice(0, limit);
    // (the list only grows, so a strip that showed something never needs clearing here)
    if (!ids.length) return;
    const controller = new AbortController();
    const q = new URLSearchParams({ placement: "recently_viewed", productIds: ids.join(","), limit: String(limit) });
    fetch(`${API_URL}/v1/store/recommendations?${q}`, {
      headers: { "x-market": market.market, "x-locale": market.locale, "x-channel": CHANNEL },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: RecommendedProduct[] }>) : null))
      .then((data) => setItems(data?.items ?? []))
      .catch(() => {
        // a strip that can't load is simply left out
      });
    return () => controller.abort();
  }, [productId, limit, market.market, market.locale]);

  if (!items.length) return null;
  return (
    <section className={`rec-strip ${className}`} aria-labelledby={headingId} data-testid="recently-viewed">
      <h2 id={headingId} className="h3 rec-strip__title">
        {title ?? t("recentlyViewed")}
      </h2>
      <ul className="rec-strip__list">
        {items.map((p, i) => (
          <RecommendationCard key={p.id} product={p} market={market} index={i} />
        ))}
      </ul>
    </section>
  );
}
