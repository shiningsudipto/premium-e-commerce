import type { Metadata } from "next";
import { market } from "next/root-params";
import * as home from "@/src/content/home";
import { CollectionList } from "@/src/blocks/collection-list";
import { Craft, Faq, PromoCards, PromoSplit, Story, Testimonials } from "@/src/blocks/editorial";
import { Hero } from "@/src/blocks/hero";
import { Letters } from "@/src/blocks/letters/letters";
import { Offer } from "@/src/blocks/offer/offer";
import { ProductShelf } from "@/src/blocks/product-shelf/product-shelf";
import { Spotlight } from "@/src/blocks/spotlight/spotlight";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const config = await getStoreConfig(ref);
  return {
    title: { absolute: `${config.storeName} · Handcrafted leather goods` },
    description: home.hero.lede,
  };
}

// Home page (Premium Touch design). Each section is a block with its own props, in the order of
// the design; commerce blocks read the catalog, editorial blocks read src/content/home.ts.
export default async function HomePage() {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const config = await getStoreConfig(ref);
  return (
    <>
      <Hero market={ref} content={home.hero} />
      <CollectionList market={ref} content={home.collections} />
      <ProductShelf market={ref} content={home.shop} />
      <PromoSplit market={ref} currency={config.market.currency} content={home.giftSet} />
      <Craft market={ref} content={home.craft} />
      <Story market={ref} content={home.story} />
      <Spotlight market={ref} content={home.spotlight} />
      <PromoCards market={ref} content={home.services} />
      <Testimonials content={home.reviews} />
      <Offer market={ref} content={home.offer} />
      <Faq market={ref} content={home.faq} />
      <Letters market={ref} storeName={config.storeName} content={home.letters} />
    </>
  );
}
