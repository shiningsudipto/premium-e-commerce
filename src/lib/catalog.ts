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

export type ProductListing = paths["/v1/store/products"]["get"]["responses"]["200"]["content"]["application/json"];
export type ListingApiQuery = NonNullable<paths["/v1/store/products"]["get"]["parameters"]["query"]> &
  Record<string, string | number | undefined>;
export type Category = paths["/v1/store/categories/{handle}"]["get"]["responses"]["200"]["content"]["application/json"];
export type CategoryNode =
  paths["/v1/store/categories"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type Collection =
  paths["/v1/store/collections/{handle}"]["get"]["responses"]["200"]["content"]["application/json"];

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

// A listing page (PLP): products with facets for a category, collection or the whole catalog.
// The query object is part of the cache key, so each filter combination is cached on its own.
export async function listProducts(market: MarketRef, query: ListingApiQuery): Promise<ProductListing> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");
  return unwrap(serverApi({ market }).GET("/v1/store/products", { params: { query } }));
}

const notFoundAsNull = async <T>(load: () => Promise<T>): Promise<T | null> => {
  try {
    return await load();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
};

export async function getCategory(market: MarketRef, handle: string): Promise<Category | null> {
  "use cache";
  cacheTag(`category:${handle}`, "categories");
  cacheLife("hours");
  return notFoundAsNull(() =>
    unwrap(serverApi({ market }).GET("/v1/store/categories/{handle}", { params: { path: { handle } } })),
  );
}

export async function getCategoryTree(market: MarketRef): Promise<CategoryNode[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");
  return unwrap(serverApi({ market }).GET("/v1/store/categories"));
}

export async function getCollection(market: MarketRef, handle: string): Promise<Collection | null> {
  "use cache";
  cacheTag(`collection:${handle}`);
  cacheLife("hours");
  return notFoundAsNull(() =>
    unwrap(serverApi({ market }).GET("/v1/store/collections/{handle}", { params: { path: { handle } } })),
  );
}

// The child categories of a category (for "Shop by" links on its listing page).
export function childrenOf(tree: CategoryNode[], handle: string): CategoryNode[] {
  for (const node of tree) {
    if (node.handle === handle) return node.children;
    const found = childrenOf(node.children, handle);
    if (found.length) return found;
  }
  return [];
}

export type Recommendations =
  paths["/v1/store/recommendations"]["get"]["responses"]["200"]["content"]["application/json"];
export type RecommendationPlacement = paths["/v1/store/recommendations"]["get"]["parameters"]["query"]["placement"];

// Related products for a product page. Shared by every visitor, so cached with the catalog;
// an API failure leaves the shelf out rather than breaking the page.
export async function getRecommendations(
  market: MarketRef,
  placement: RecommendationPlacement,
  productId: string,
  limit = 4,
): Promise<ProductSummary[]> {
  "use cache";
  cacheTag("products", `product:${productId}`);
  cacheLife("hours");
  try {
    const result = await unwrap(
      serverApi({ market }).GET("/v1/store/recommendations", { params: { query: { placement, productId, limit } } }),
    );
    return result.items;
  } catch {
    return [];
  }
}
