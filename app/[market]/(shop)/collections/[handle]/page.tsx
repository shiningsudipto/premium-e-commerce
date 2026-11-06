import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { RichText } from "@/src/components/storefront/rich-text";
import { ListingSkeleton } from "@/src/features/catalog/listing-skeleton";
import { parseListing, toApiQuery } from "@/src/features/catalog/listing-query";
import { ProductListing } from "@/src/features/catalog/product-listing";
import { getCollection, listProducts } from "@/src/lib/catalog";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: PageProps<"/[market]/collections/[handle]">): Promise<Metadata> {
  const market = await currentMarket();
  const collection = await getCollection(market, (await params).handle);
  if (!collection) return {};
  return {
    title: collection.seo.title ?? collection.title,
    description: collection.seo.description,
    alternates: { canonical: collection.seo.canonical ?? href(market, `/collections/${collection.handle}`) },
    robots: collection.seo.noindex ? { index: false } : undefined,
  };
}

// Collection listing (PLP): manual or rule-based collections share the listing API.
export default async function CollectionPage({ params, searchParams }: PageProps<"/[market]/collections/[handle]">) {
  const market = await currentMarket();
  const { handle } = await params;
  const [collection, t] = await Promise.all([getCollection(market, handle), getTranslations("listing")]);
  if (!collection) notFound();

  return (
    <div className="pt-container">
      <header className="page-head">
        <Breadcrumbs items={[{ label: t("home"), href: href(market) }, { label: collection.title }]} />
        <h1 className="h2">{collection.title}</h1>
        <RichText value={collection.description} className="prose lede" />
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        <CollectionProducts searchParams={searchParams} handle={handle} />
      </Suspense>
    </div>
  );
}

async function CollectionProducts({
  searchParams,
  handle,
}: {
  searchParams: PageProps<"/[market]/collections/[handle]">["searchParams"];
  handle: string;
}) {
  const market = await currentMarket();
  const state = parseListing(await searchParams);
  const listing = await listProducts(market, toApiQuery(state, { collection: handle }, PAGE_SIZE));
  return (
    <ProductListing market={market} listing={listing} state={state} basePath={href(market, `/collections/${handle}`)} />
  );
}
