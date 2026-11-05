import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ApiError, unwrap } from "../api/errors";
import { serverApi } from "../api/server";
import type { paths } from "../api/schema";
import { href } from "./links";
import type { MarketRef } from "./market";

// Catalog and navigation reads for storefront pages. Cached per market and revalidated by the
// tags premium-ec-backend's worker sends (products, product:handle:…, menu:…).

export type ProductSummary =
  paths["/v1/store/products"]["get"]["responses"]["200"]["content"]["application/json"]["items"][number];
export type ProductDetail =
  paths["/v1/store/products/{handle}"]["get"]["responses"]["200"]["content"]["application/json"];
export type ProductSort = NonNullable<NonNullable<paths["/v1/store/products"]["get"]["parameters"]["query"]>["sort"]>;

export async function getProducts(market: MarketRef, sort: ProductSort, pageSize: number) {
  "use cache";
  cacheTag("products");
  cacheLife("hours");
  const page = await unwrap(serverApi({ market }).GET("/v1/store/products", { params: { query: { sort, pageSize } } }));
  return page.items;
}

export async function getProduct(market: MarketRef, handle: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(`product:handle:${handle}`, "products");
  cacheLife("hours");
  try {
    return await unwrap(serverApi({ market }).GET("/v1/store/products/{handle}", { params: { path: { handle } } }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Menus are stored as JSON the merchant edits; only well-formed items are rendered.
export type MenuLink = { label: string; href: string; children: MenuLink[] };
type RawMenuItem = { label?: unknown; type?: unknown; ref?: unknown; url?: unknown; children?: unknown };

const ROUTES: Record<string, string> = {
  category: "/categories/",
  collection: "/collections/",
  page: "/pages/",
  product: "/products/",
};

export function toMenuLinks(items: unknown, market: MarketRef): MenuLink[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw: RawMenuItem) => {
    if (typeof raw?.label !== "string" || typeof raw.type !== "string") return [];
    let target: string | null = null;
    if (raw.type === "url" && typeof raw.url === "string") target = raw.url;
    else if (ROUTES[raw.type] && typeof raw.ref === "string") target = href(market, `${ROUTES[raw.type]}${raw.ref}`);
    if (!target) return [];
    return [{ label: raw.label, href: target, children: toMenuLinks(raw.children, market) }];
  });
}

export async function getMenu(market: MarketRef, handle: string): Promise<MenuLink[]> {
  "use cache";
  cacheTag(`menu:${handle}`);
  cacheLife("hours");
  try {
    const menu = await unwrap(serverApi({ market }).GET("/v1/store/menus/{handle}", { params: { path: { handle } } }));
    return toMenuLinks(menu.items, market);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

// The colour option of a product, if it has one ("Color" or "Colour").
export function colourValues(product: Pick<ProductDetail, "options">): string[] {
  return product.options.find((o) => /^colou?r$/i.test(o.name))?.values ?? [];
}
