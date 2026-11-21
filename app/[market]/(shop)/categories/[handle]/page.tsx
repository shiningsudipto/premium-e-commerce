import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { RichText } from "@/src/components/storefront/rich-text";
import { ListingSkeleton } from "@/src/features/catalog/listing-skeleton";
import { parseListing, toApiQuery } from "@/src/features/catalog/listing-query";
import { ProductListing } from "@/src/features/catalog/product-listing";
import { getCategory, listProducts } from "@/src/lib/catalog";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: PageProps<"/[market]/categories/[handle]">): Promise<Metadata> {
  const market = await currentMarket();
  const category = await getCategory(market, (await params).handle);
  if (!category) return {};
  return {
    title: category.seo.title ?? category.name,
    description: category.seo.description,
    alternates: { canonical: category.seo.canonical ?? href(market, `/categories/${category.handle}`) },
    robots: category.seo.noindex ? { index: false } : undefined,
  };
}

// Category listing (PLP). The header is cached with the category; the product grid depends on the
// filters in the URL and streams in behind its skeleton.
export default async function CategoryPage({ params, searchParams }: PageProps<"/[market]/categories/[handle]">) {
  const market = await currentMarket();
  const { handle } = await params;
  const [category, t] = await Promise.all([getCategory(market, handle), getTranslations("listing")]);
  if (!category) notFound();
  const basePath = href(market, `/categories/${handle}`);

  return (
    <div className="pt-container">
      <header className="page-head">
        <Breadcrumbs
          items={[
            { label: t("home"), href: href(market) },
            ...category.breadcrumbs.map((b) => ({ label: b.name, href: href(market, `/categories/${b.handle}`) })),
            { label: category.name },
          ]}
        />
        <h1 className="h2">{category.name}</h1>
        <RichText value={category.description} className="prose lede" />
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        <CategoryProducts searchParams={searchParams} handle={handle} basePath={basePath} />
      </Suspense>
    </div>
  );
}

async function CategoryProducts({
  searchParams,
  handle,
  basePath,
}: {
  searchParams: PageProps<"/[market]/categories/[handle]">["searchParams"];
  handle: string;
  basePath: string;
}) {
  const market = await currentMarket();
  const state = parseListing(await searchParams);
  const listing = await listProducts(market, toApiQuery(state, { category: handle }, PAGE_SIZE));
  return <ProductListing market={market} listing={listing} state={state} basePath={basePath} />;
}
