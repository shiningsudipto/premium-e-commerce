import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, unwrap } from "../api/errors";
import { serverApi } from "../api/server";
import type { paths } from "../api/schema";
import { visibleBlocks, type CmsBlock } from "../blocks/cms/blocks";
import type { MarketRef } from "./market";

type ApiPage = paths["/v1/store/pages/{handle}"]["get"]["responses"]["200"]["content"]["application/json"];

export type CmsPage = Omit<ApiPage, "blocks" | "sections"> & {
  blocks: CmsBlock[];
  sections: Record<string, CmsBlock[]>;
};

export type PageSeo = { title?: string; description?: string; canonical?: string; noindex?: boolean; ogImage?: string };
export const pageSeo = (page: Pick<CmsPage, "seo">): PageSeo =>
  (page.seo && typeof page.seo === "object" ? page.seo : {}) as PageSeo;

async function fetchPage(market: MarketRef, handle: string, preview?: string): Promise<CmsPage | null> {
  try {
    const page = await unwrap(
      serverApi({ market }).GET("/v1/store/pages/{handle}", {
        params: { path: { handle }, query: preview ? { preview } : {} },
      }),
    );
    // only "PAGE" kinds are pages; "SECTION" is a reusable block group
    if (page.kind !== "PAGE") return null;
    // market and schedule rules apply to the page and to the global sections it includes
    const rules = { market: market.market, now: new Date() };
    return {
      ...page,
      blocks: visibleBlocks(page.blocks, rules),
      sections: Object.fromEntries(
        Object.entries(page.sections).map(([key, blocks]) => [key, visibleBlocks(blocks, rules)]),
      ),
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Published pages are shared by everyone; minutes-long caching keeps scheduled blocks close to
// their start and end times. Publishing sends page:{handle}; a global section sends
// section:{handle}, so each page is also tagged with the sections it includes. Hand-picked
// product cards carry prices and stock, so those pages follow the catalog's tag too.
export async function getPage(market: MarketRef, handle: string): Promise<CmsPage | null> {
  "use cache";
  cacheTag(`page:${handle}`, "pages");
  cacheLife("minutes");
  const page = await fetchPage(market, handle);
  if (page) {
    for (const section of Object.keys(page.sections)) cacheTag(`section:${section}`);
    if (Object.keys(page.products).length) cacheTag("products");
  }
  return page;
}

// A draft opened from the admin's preview link (Draft Mode, see app/api/preview). Never cached.
export const getPagePreview = (market: MarketRef, handle: string, token: string) => fetchPage(market, handle, token);
