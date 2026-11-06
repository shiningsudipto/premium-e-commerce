import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { ListingSkeleton } from "@/src/features/catalog/listing-skeleton";
import { parseListing, toApiQuery } from "@/src/features/catalog/listing-query";
import { ProductListing } from "@/src/features/catalog/product-listing";
import { listProducts } from "@/src/lib/catalog";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("listing");
  return { title: t("allProducts") };
}

// Every product, with the same filters as a category.
export default async function AllProductsPage({ searchParams }: PageProps<"/[market]/products">) {
  const market = await currentMarket();
  const t = await getTranslations("listing");
  return (
    <div className="pt-container">
      <header className="page-head">
        <Breadcrumbs items={[{ label: t("home"), href: href(market) }, { label: t("allProducts") }]} />
        <h1 className="h2">{t("allProducts")}</h1>
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        <AllProducts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AllProducts({ searchParams }: { searchParams: PageProps<"/[market]/products">["searchParams"] }) {
  const market = await currentMarket();
  const state = parseListing(await searchParams);
  const listing = await listProducts(market, toApiQuery(state, {}, PAGE_SIZE));
  return <ProductListing market={market} listing={listing} state={state} basePath={href(market, "/products")} />;
}
