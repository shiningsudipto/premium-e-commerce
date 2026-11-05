import { getTranslations } from "next-intl/server";
import { market } from "next/root-params";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";
import { getStoreConfig } from "@/src/lib/store-data";

// Placeholder home page until the block-based home arrives in Phase 1. It's fully cached:
// the store name changes when the worker revalidates the "config" tag.
export default async function HomePage() {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const [config, t] = await Promise.all([getStoreConfig(ref), getTranslations("home")]);
  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-24 sm:px-6 sm:py-32">
      <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">{t("eyebrow")}</p>
      <h1 data-testid="store-name" className="max-w-3xl text-5xl leading-[1.05] tracking-tight sm:text-7xl">
        {t("title", { store: config.storeName })}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t("lede")}</p>
    </section>
  );
}
