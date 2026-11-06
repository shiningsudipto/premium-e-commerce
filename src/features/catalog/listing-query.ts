// Listing state lives in the URL (plan B-Phase 1: "filters as URL search params"), so a filtered
// page can be shared, bookmarked and cached. These pure helpers translate between the page's
// search params, the API's query and the links the filter panel renders.

export const SORTS = ["featured", "newest", "price_asc", "price_desc", "title_asc", "relevance"] as const;
export type Sort = (typeof SORTS)[number];

export type ListingState = {
  sort?: Sort;
  page: number;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  // option.Color=Tan,Black and attr.material=leather (the API's filter syntax)
  filters: Record<string, string[]>;
};

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const intOrUndefined = (v: string | undefined) => {
  const n = v === undefined || v === "" ? NaN : Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

export function parseListing(params: Params): ListingState {
  const sort = first(params.sort);
  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!/^(option|attr)\.[\w .-]{1,60}$/.test(key) || value === undefined) continue;
    const values = (Array.isArray(value) ? value : [value])
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) filters[key] = [...new Set(values)];
  }
  return {
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : undefined,
    page: Math.max(1, intOrUndefined(first(params.page)) ?? 1),
    // prices in the URL are whole currency units; the API filters in minor units
    minPrice: intOrUndefined(first(params.minPrice)),
    maxPrice: intOrUndefined(first(params.maxPrice)),
    inStock: first(params.inStock) === "1",
    filters,
  };
}

// The API query for a listing; `scope` adds the category, collection or search term.
export function toApiQuery(state: ListingState, scope: Record<string, string>, pageSize: number, minorUnits = 100) {
  return {
    ...scope,
    ...(state.sort ? { sort: state.sort } : {}),
    page: state.page,
    pageSize,
    ...(state.minPrice !== undefined ? { minPrice: state.minPrice * minorUnits } : {}),
    ...(state.maxPrice !== undefined ? { maxPrice: state.maxPrice * minorUnits } : {}),
    ...(state.inStock ? { inStock: "1" } : {}),
    facets: "1",
    ...Object.fromEntries(Object.entries(state.filters).map(([k, v]) => [k, v.join(",")])),
  };
}

export function toSearchParams(state: ListingState, extra: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams(extra);
  if (state.sort) params.set("sort", state.sort);
  if (state.minPrice !== undefined) params.set("minPrice", String(state.minPrice));
  if (state.maxPrice !== undefined) params.set("maxPrice", String(state.maxPrice));
  if (state.inStock) params.set("inStock", "1");
  for (const key of Object.keys(state.filters).sort()) params.set(key, state.filters[key]!.join(","));
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

// The state after turning one facet value on or off. Changing filters goes back to page 1.
export function toggleFilter(state: ListingState, key: string, value: string): ListingState {
  const current = state.filters[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const filters = { ...state.filters, [key]: next };
  if (!next.length) delete filters[key];
  return { ...state, filters, page: 1 };
}

export const activeFilterCount = (state: ListingState) =>
  Object.values(state.filters).reduce((n, v) => n + v.length, 0) +
  (state.minPrice !== undefined || state.maxPrice !== undefined ? 1 : 0) +
  (state.inStock ? 1 : 0);

export const clearFilters = (state: ListingState): ListingState => ({
  sort: state.sort,
  page: 1,
  inStock: false,
  filters: {},
});
