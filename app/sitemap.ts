import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { unwrap } from "@/src/api/errors";
import { serverApi } from "@/src/api/server";
import { env } from "@/src/lib/env";
import { allSegments, parseMarketSegment } from "@/src/lib/market";
import { getMarkets } from "@/src/lib/store-data";

type Kind = "products" | "categories" | "collections" | "pages";
const PATHS: Record<Kind, string> = {
  products: "/products/",
  categories: "/categories/",
  collections: "/collections/",
  pages: "/pages/",
};
// a sitemap file holds at most 50,000 URLs; stop well short of that per kind
const MAX_PER_KIND = 10_000;

// Every published product, category, collection and page in every market and language
// (spec §5.10), with hreflang alternates between the language versions of each URL.
async function entries(kind: Kind) {
  "use cache";
  cacheTag("sitemap", kind);
  cacheLife("hours");
  const market = parseMarketSegment(env.DEFAULT_MARKET)!;
  const out: { handle: string; updatedAt: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await unwrap(
      serverApi({ market }).GET("/v1/store/sitemap/{kind}", {
        params: { path: { kind }, query: { limit: 1000, ...(cursor ? { cursor } : {}) } },
      }),
    );
    out.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && out.length < MAX_PER_KIND);
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const segments = await getMarkets()
    .then(allSegments)
    .catch(() => [env.DEFAULT_MARKET]);
  const url = (segment: string, path: string) => new URL(`/${segment}${path}`, env.SITE_URL).toString();
  const alternates = (path: string) => ({
    languages: Object.fromEntries(segments.map((s) => [parseMarketSegment(s)?.locale ?? s, url(s, path)])),
  });

  const fixed = ["", "/products"].flatMap((path) =>
    segments.map((s) => ({
      url: url(s, path),
      changeFrequency: "daily" as const,
      priority: path ? 0.8 : 1,
      alternates: alternates(path),
    })),
  );

  const kinds = Object.keys(PATHS) as Kind[];
  const lists = await Promise.all(kinds.map((k) => entries(k).catch(() => [])));
  const dynamic = kinds.flatMap((kind, i) =>
    lists[i]!.flatMap((item) => {
      const path = `${PATHS[kind]}${item.handle}`;
      return segments.map((s) => ({
        url: url(s, path),
        lastModified: item.updatedAt,
        priority: kind === "products" ? 0.7 : 0.6,
        alternates: alternates(path),
      }));
    }),
  );
  return [...fixed, ...dynamic];
}
