import { cn } from "@/lib/utils";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { artFor } from "../../components/storefront/art";
import { Media, type Tone } from "../../components/storefront/media";
import { Swatches } from "../../components/storefront/primitives";
import { QuickAdd } from "../../features/cart/quick-add";
import type { ProductSummary } from "../../lib/catalog";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";

const TONES: Tone[] = ["mid", "warm", "light"];
const NEXT_TONE: Record<Tone, Tone> = { light: "mid", mid: "warm", warm: "light", dark: "mid" };

type Badge = { label: string; kind: "sale" | "low" | "new" | "out" };

// Badges from what the listing knows: sold out, on sale (compare-at price), or tagged "new".
export function badgeFor(product: ProductSummary): Badge | null {
  if (!product.availableForSale) return { label: "Sold out", kind: "out" };
  const price = product.price;
  if (price?.compareAtMinor && price.compareAtMinor > price.minMinor) {
    return { label: `−${Math.round((1 - price.minMinor / price.compareAtMinor) * 100)}%`, kind: "sale" };
  }
  if (product.tags.some((t) => t.toLowerCase() === "new")) return { label: "New", kind: "new" };
  return null;
}

// A product card: second angle on hover, badge, quick add, title, colours and price. The whole
// card is one link (the title's ::after covers it), with quick add above it.
export async function ProductCard({
  product,
  market,
  index,
}: {
  product: ProductSummary;
  market: MarketRef;
  index: number;
}) {
  const t = await getTranslations("product");
  const productHref = href(market, `/products/${product.handle}`);
  const art = artFor(product.title, ...product.tags);
  const tone = TONES[index % TONES.length]!;
  const badge = badgeFor(product);
  const price = product.price;
  const onSale = !!price?.compareAtMinor && price.compareAtMinor > price.minMinor;
  const fmt = (minor: number) => formatMoney(minor, price!.currency, market.locale);
  const amount = price
    ? price.minMinor === price.maxMinor
      ? fmt(price.minMinor)
      : t("from", { price: fmt(price.minMinor) })
    : null;
  const colour = product.swatches[0];
  const alt = `${product.title}${colour ? ` in ${colour.toLowerCase()}` : ""}, front view`;

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

export function ProductGridSkeleton({ count = 8, label }: { count?: number; label: string }) {
  return (
    <>
      <p className="sr-only">{label}</p>
      <div className="product-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="sk-card">
            <div className="sk-media sk" />
            <div className="sk-line sk-line--mid sk" />
            <div className="sk-line sk-line--short sk" />
          </div>
        ))}
      </div>
    </>
  );
}
