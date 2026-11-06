import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, unwrap } from "../api/errors";
import { serverApi } from "../api/server";
import type { paths } from "../api/schema";
import { visibleBlocks, type CmsBlock } from "../blocks/cms/blocks";
import type { MarketRef } from "./market";

export type CmsPage = Omit<
  paths["/v1/store/pages/{handle}"]["get"]["responses"]["200"]["content"]["application/json"],
  "blocks"
> & { blocks: CmsBlock[] };

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
    return { ...page, blocks: visibleBlocks(page.blocks, { market: market.market, now: new Date() }) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Published pages are shared by everyone; minutes-long caching keeps scheduled blocks close to
// their start and end times. Publishing sends the page:… tag.
export async function getPage(market: MarketRef, handle: string): Promise<CmsPage | null> {
  "use cache";
  cacheTag(`page:${handle}`, "pages");
  cacheLife("minutes");
  return fetchPage(market, handle);
}

// Draft previews from the admin (?preview=token) are never cached.
export const getPagePreview = (market: MarketRef, handle: string, token: string) => fetchPage(market, handle, token);
