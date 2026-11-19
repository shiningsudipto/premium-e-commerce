"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { badgeFor, badgeLabels } from "../../blocks/product-shelf/product-card";
import { artFor } from "../../components/storefront/art";
import { Media, type Tone } from "../../components/storefront/media";
import { Swatches } from "../../components/storefront/primitives";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { QuickAdd } from "../cart/quick-add";
import { HeartButton } from "../wishlist/heart-button";
import type { RecommendedProduct } from "./recommendations-api";

const TONES: Tone[] = ["mid", "warm", "light"];
const NEXT_TONE: Record<Tone, Tone> = { light: "mid", mid: "warm", warm: "light", dark: "mid" };

// The storefront's product card (blocks/product-shelf/product-card.tsx) for shelves the browser
// fills in (recently viewed, the bag's suggestions). ProductCard is a Server Component; this one
// renders the same markup from the same parts, with labels from the client message bundle.
export function RecommendationCard({
  product,
  market,
  index,
}: {
  product: RecommendedProduct;
  market: MarketRef;
  index: number;
}) {
  const t = useTranslations("product");
  const productHref = href(market, `/products/${product.handle}`);
  const art = artFor(product.title, ...product.tags);
  const tone = TONES[index % TONES.length]!;
  const badge = badgeFor(product, badgeLabels(t));
  const price = product.price;
  const onSale = !!price?.compareAtMinor && price.compareAtMinor > price.minMinor;
  const fmt = (minor: number) => formatMoney(minor, price!.currency, market.locale);
  const amount = price
    ? price.minMinor === price.maxMinor
      ? fmt(price.minMinor)
      : t("from", { price: fmt(price.minMinor) })
    : null;
  const colour = product.swatches[0];
  const alt = colour
    ? t("cardAltColour", { title: product.title, colour: colour.toLowerCase() })
    : t("cardAlt", { title: product.title });

  return (
    <li className="card">
      <div className="card__media">
        <Media image={product.images[0]} art={art} tone={tone} alt={alt} sizes="(min-width: 1024px) 25vw, 50vw" />
        <Media
          image={product.images[1]}
          art={art}
          tone={NEXT_TONE[tone]}
          alt=""
          caption={product.images[1] ? undefined : t("secondAngle")}
          flip
          decorative
          className="ph--alt"
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
        {badge && <span className={`badge badge--${badge.kind}`}>{badge.label}</span>}
        <HeartButton
          productId={product.id}
          title={product.title}
          signInHref={href(market, "/account/sign-in")}
          className="card__heart"
        />
        <QuickAdd
          handle={product.handle}
          title={product.title}
          productHref={productHref}
          soldOut={!product.availableForSale}
          labels={{
            add: t("quickAdd"),
            added: t("added"),
            soldOut: t("soldOut"),
            addAria: t("quickAddAria", { title: product.title }),
            soldOutAria: t("soldOutAria", { title: product.title }),
          }}
        />
      </div>
      <div className="card__body">
        <h3 className="card__title">
          <Link className="card__link" href={productHref}>
            {product.title}
          </Link>
        </h3>
        <div className="card__meta">
          <Swatches colours={product.swatches} />
          {amount && (
            <p className={cn("price", onSale && "price--sale")}>
              <span className="sr-only">
                {onSale
                  ? t("salePrice", { price: amount, was: fmt(price!.compareAtMinor!) })
                  : t("price", { price: amount })}
              </span>
              <span aria-hidden="true">{amount}</span>
              {onSale && <s aria-hidden="true">{fmt(price!.compareAtMinor!)}</s>}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// Placeholder cards with the shelf's exact footprint, so a shelf filling in doesn't move the page.
export function ShelfSkeleton({ count }: { count: number }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk-card">
          <div className="sk-media sk" />
          <div className="sk-line sk-line--mid sk" />
          <div className="sk-line sk-line--short sk" />
        </div>
      ))}
    </div>
  );
}
