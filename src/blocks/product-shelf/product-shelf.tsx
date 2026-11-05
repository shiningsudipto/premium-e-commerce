import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { shop as ShopContent } from "../../content/home";
import { Icon } from "../../components/storefront/icon";
import { ButtonLink, LinkArrow, SectionHead } from "../../components/storefront/primitives";
import { getProducts, type ProductSummary } from "../../lib/catalog";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { ProductCard, ProductGridSkeleton } from "./product-card";
import { ProductTabs } from "./product-tabs";

// 3 · tabs + product_grid: bestsellers and new arrivals from the catalog, two columns on phones
// and four from 1024px. Lists are cached and revalidated with the "products" tag.
export async function ProductShelf({ market, content }: { market: MarketRef; content: typeof ShopContent }) {
  const t = await getTranslations("product");
  return (
    <section
      className="section section--flush-top"
      id="products"
      data-block="tabs+product_grid"
      aria-labelledby="products-title"
    >
      <div className="pt-container">
        <SectionHead
          id="products-title"
          eyebrow={content.eyebrow}
          title={content.title}
          className="section-head--tight"
        />
        <Suspense
          fallback={
            <>
              <div className="grid-tools" aria-hidden="true">
                <div className="tabs">
                  {content.tabs.map((tab) => (
                    <span key={tab.id} className="tab">
                      {tab.label}
                    </span>
                  ))}
                </div>
              </div>
              <ProductGridSkeleton count={content.limit} label={t("loading")} />
            </>
          }
        >
          <ShelfTabs market={market} content={content} />
        </Suspense>
      </div>
    </section>
  );
}

async function ShelfTabs({ market, content }: { market: MarketRef; content: typeof ShopContent }) {
  const [t, lists] = await Promise.all([
    getTranslations("product"),
    Promise.all(content.tabs.map((tab) => getProducts(market, tab.sort, content.limit))),
  ]);
  return (
    <ProductTabs
      label={t("lists")}
      aside={<LinkArrow href={href(market, content.shopAll.path)}>{content.shopAll.label}</LinkArrow>}
      tabs={content.tabs.map((tab, i) => ({
        id: tab.id,
        label: tab.label,
        panel: <ProductGrid market={market} products={lists[i]!} empty={content.empty} />,
      }))}
    />
  );
}

function ProductGrid({
  market,
  products,
  empty,
}: {
  market: MarketRef;
  products: ProductSummary[];
  empty: (typeof ShopContent)["empty"];
}) {
  if (!products.length) {
    return (
      <div className="product-grid">
        <div className="empty">
          <Icon name="empty" />
          <h3 className="h3">{empty.title}</h3>
          <p className="muted empty__body">{empty.body}</p>
          <ButtonLink href={href(market, empty.cta.path)} variant="secondary">
            {empty.cta.label}
          </ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <ul className="product-grid">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} market={market} index={i} />
      ))}
    </ul>
  );
}
