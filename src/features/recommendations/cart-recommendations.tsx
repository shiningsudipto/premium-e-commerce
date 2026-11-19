"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { MarketRef } from "../../lib/market";
import type { Bag } from "../cart/types";
import { RecommendationCard, ShelfSkeleton } from "./recommendation-card";
import { useGetRecommendationsQuery } from "./recommendations-api";

const LIMIT = 4;

// "You may also like" under the bag: bought together with what's in it, then what's trending.
// Fetched by the browser from the bag's products and refreshed when they change; the previous
// suggestions stay up while new ones load. Placeholders hold the shelf's space until the first
// answer, so the page doesn't jump.
export function CartRecommendations({ cart, market }: { cart: Bag; market: MarketRef }) {
  const t = useTranslations("recommendations");
  const productIds = useMemo(
    () => [...new Set(cart.lines.map((l) => l.productId).filter((id): id is string => !!id))].sort(),
    [cart.lines],
  );
  const { data, isLoading, isError } = useGetRecommendationsQuery({ placement: "cart", productIds, limit: LIMIT });

  if (isError || (!isLoading && !data?.length)) return null;
  return (
    <section className="related cart-recs" aria-labelledby="cart-recs-title" data-testid="cart-recommendations">
      <h2 id="cart-recs-title" className="h3" style={{ marginBottom: "var(--space-6)" }}>
        {t("youMayAlsoLike")}
      </h2>
      {data?.length ? (
        <ul className="product-grid">
          {data.map((p, i) => (
            <RecommendationCard key={p.id} product={p} market={market} index={i} />
          ))}
        </ul>
      ) : (
        <>
          <p className="sr-only">{t("loading")}</p>
          <ShelfSkeleton count={LIMIT} />
        </>
      )}
    </section>
  );
}
