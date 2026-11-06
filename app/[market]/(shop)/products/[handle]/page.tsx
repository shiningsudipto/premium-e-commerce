import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ProductCard, ProductGridSkeleton } from "@/src/blocks/product-shelf/product-card";
import { Breadcrumbs, type Crumb } from "@/src/components/storefront/breadcrumbs";
import { isEmptyRichText, plainText, RichText } from "@/src/components/storefront/rich-text";
import { ProductView } from "@/src/features/product/product-view";
import { getProduct, getRecommendations, type ProductDetail } from "@/src/lib/catalog";
import { currentMarket } from "@/src/lib/current-market";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";
import type { MarketRef } from "@/src/lib/market";
import { toMajorUnits } from "@/src/lib/money";

type Seo = { title?: string; description?: string; canonical?: string; noindex?: boolean; ogImage?: string };
const seoOf = (product: ProductDetail): Seo =>
  (product.seo && typeof product.seo === "object" ? product.seo : {}) as Seo;

export async function generateMetadata({ params }: PageProps<"/[market]/products/[handle]">): Promise<Metadata> {
  const market = await currentMarket();
  const product = await getProduct(market, (await params).handle);
  if (!product) return {};
  const seo = seoOf(product);
  const description = seo.description ?? (plainText(product.description) || undefined);
  const image = seo.ogImage ?? product.media[0]?.url;
  return {
    title: seo.title ?? product.title,
    description,
    alternates: { canonical: seo.canonical ?? href(market, `/products/${product.handle}`) },
    robots: seo.noindex ? { index: false } : undefined,
    openGraph: { title: product.title, description, images: image ? [image] : undefined, type: "website" },
  };
}

// Product page (plan B.2). Everything here is cached per product and revalidated by the API's
// `product:handle:…` tag; live stock is fetched by the browser so the page itself stays static.
export default async function ProductPage({ params }: PageProps<"/[market]/products/[handle]">) {
  const market = await currentMarket();
  const { handle } = await params;
  const [product, t] = await Promise.all([getProduct(market, handle), getTranslations("product")]);
  if (!product) notFound();

  const category = product.categories[0];
  const crumbs: Crumb[] = [
    { label: t("home"), href: href(market) },
    ...(category ? [{ label: category.name, href: href(market, `/categories/${category.handle}`) }] : []),
    { label: product.title },
  ];
  const details = Object.values(product.customFields).filter(
    (f) => typeof f.value === "string" || typeof f.value === "number",
  );

  return (
    <div className="pt-container pdp">
      <div className="page-head">
        <Breadcrumbs items={crumbs} label={t("breadcrumbs")} />
      </div>
      <ProductJsonLd product={product} market={market} />
      <ProductView product={product} market={market}>
        {!isEmptyRichText(product.description) && <RichText value={product.description} className="prose pdp__desc" />}
        {(details.length > 0 || product.vendor) && (
          <div className="pdp__details">
            <details open>
              <summary>{t("details")}</summary>
              <dl>
                {product.vendor && (
                  <>
                    <dt>{t("brand")}</dt>
                    <dd>{product.vendor}</dd>
                  </>
                )}
                {details.map((f) => (
                  <div key={f.label} style={{ display: "contents" }}>
                    <dt>{f.label}</dt>
                    <dd>{String(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>
        )}
      </ProductView>
      <section className="related" aria-labelledby="related-title">
        <h2 id="related-title" className="h3" style={{ marginBottom: "var(--space-6)" }}>
          {t("related")}
        </h2>
        <Suspense fallback={<ProductGridSkeleton count={4} label={t("loading")} />}>
          <Related market={market} productId={product.id} />
        </Suspense>
      </section>
    </div>
  );
}

async function Related({ market, productId }: { market: MarketRef; productId: string }) {
  const [items, t] = await Promise.all([
    getRecommendations(market, "related", productId, 4),
    getTranslations("product"),
  ]);
  if (!items.length) return <p className="muted">{t("noRelated")}</p>;
  return (
    <ul className="product-grid">
      {items.map((p, i) => (
        <ProductCard key={p.id} product={p} market={market} index={i} />
      ))}
    </ul>
  );
}

// Product, Offer and AggregateRating for rich results. Availability here is the cached view;
// search engines re-crawl often enough for that to be fine.
function ProductJsonLd({ product, market }: { product: ProductDetail; market: MarketRef }) {
  const url = new URL(href(market, `/products/${product.handle}`), env.SITE_URL).toString();
  const priced = product.variants.filter((v) => v.price);
  const availability = (v: ProductDetail["variants"][number]) =>
    v.stock === "preorder"
      ? "https://schema.org/PreOrder"
      : v.stock === "backorder"
        ? "https://schema.org/BackOrder"
        : v.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock";
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainText(product.description, 500) || undefined,
    image: product.media.map((m) => m.url),
    sku: product.variants[0]?.sku,
    url,
    ...(product.vendor ? { brand: { "@type": "Brand", name: product.vendor } } : {}),
    offers: priced.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.title,
      url: `${url}?variant=${v.id}`,
      price: toMajorUnits(v.price!.amountMinor, v.price!.currency),
      priceCurrency: v.price!.currency,
      availability: availability(v),
      itemCondition: "https://schema.org/NewCondition",
    })),
    ...(product.rating.count > 0 && product.rating.average
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.average,
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
