import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "../../blocks/product-shelf/product-card";
import { Icon } from "../../components/storefront/icon";
import { swatchColor } from "../../components/storefront/primitives";
import type { ProductListing as Listing } from "../../lib/catalog";
import {
  activeFilterCount,
  clearFilters,
  toggleFilter,
  toSearchParams,
  type ListingState,
  type Sort,
} from "./listing-query";
import { FilterSheet, SortSelect } from "./listing-controls";
import type { MarketRef } from "../../lib/market";

// A product listing (PLP): filters, sort, active-filter chips, the grid and pagination. Every
// control is a link or a GET form over the URL, so the page works before JavaScript loads and
// each filtered view has its own address.

type Facets = NonNullable<Listing["facets"]>;

const urlFor = (basePath: string, state: ListingState, extra: Record<string, string>) => {
  const qs = toSearchParams(state, extra).toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

export async function ProductListing({
  market,
  listing,
  state,
  basePath,
  extraParams = {},
  sorts = ["featured", "newest", "price_asc", "price_desc", "title_asc"],
}: {
  market: MarketRef;
  listing: Listing;
  state: ListingState;
  // the page's own path, e.g. /en-bd/categories/bags
  basePath: string;
  // params that belong to the page rather than the filters (the search term)
  extraParams?: Record<string, string>;
  sorts?: Sort[];
}) {
  const t = await getTranslations("listing");
  const active = activeFilterCount(state);
  const facets = listing.facets ?? null;
  const panel = facets && <FilterPanel facets={facets} state={state} basePath={basePath} extraParams={extraParams} />;

  return (
    <div className="plp">
      {panel && (
        <aside className="plp__filters" aria-label={t("filters")}>
          {panel}
        </aside>
      )}
      <div>
        <div className="plp__toolbar">
          <div className="plp__toolbar-group">
            {panel && (
              <FilterSheet
                count={active}
                labels={{
                  open: t("filter"),
                  title: t("filters"),
                  close: t("close"),
                  done: t("showResults", { count: listing.total }),
                }}
              >
                {panel}
              </FilterSheet>
            )}
            <p className="page-head__count" aria-live="polite">
              {t("count", { count: listing.total })}
            </p>
          </div>
          <SortSelect
            label={t("sortBy")}
            value={state.sort}
            options={sorts.map((value) => ({ value, label: t(`sort.${value}`) }))}
          />
        </div>

        {active > 0 && (
          <div className="chips" style={{ paddingBlock: "var(--space-4)" }}>
            {Object.entries(state.filters).flatMap(([key, values]) =>
              values.map((value) => (
                <Link
                  key={`${key}=${value}`}
                  className="chip"
                  href={urlFor(basePath, toggleFilter(state, key, value), extraParams)}
                >
                  {value}
                  <Icon name="close" />
                  <span className="sr-only">{t("removeFilter")}</span>
                </Link>
              )),
            )}
            <Link className="chip" href={urlFor(basePath, clearFilters(state), extraParams)}>
              {t("clearAll")}
            </Link>
          </div>
        )}

        {listing.items.length ? (
          <ul className="product-grid" style={{ paddingTop: "var(--space-5)" }}>
            {listing.items.map((product, i) => (
              <ProductCard key={product.id} product={product} market={market} index={i} />
            ))}
          </ul>
        ) : (
          <div className="no-results" style={{ marginTop: "var(--space-5)" }}>
            <h2 className="h3">{t("emptyTitle")}</h2>
            <p className="muted">{active ? t("emptyFiltered") : t("emptyBody")}</p>
            {active > 0 && (
              <Link className="btn btn--secondary" href={urlFor(basePath, clearFilters(state), extraParams)}>
                {t("clearAll")}
              </Link>
            )}
          </div>
        )}

        <Pagination
          basePath={basePath}
          state={state}
          extraParams={extraParams}
          pageCount={listing.pageCount}
          label={t("pages")}
        />
      </div>
    </div>
  );
}

async function FilterPanel({
  facets,
  state,
  basePath,
  extraParams,
}: {
  facets: Facets;
  state: ListingState;
  basePath: string;
  extraParams: Record<string, string>;
}) {
  const t = await getTranslations("listing");
  const groups = [
    ...facets.options.map((o) => ({
      key: `option.${o.name}`,
      label: o.name,
      swatch: /^colou?r$/i.test(o.name),
      values: o.values.map((v) => ({ value: v.value, label: v.value, count: v.count, swatch: null as string | null })),
    })),
    ...facets.attributes.map((a) => ({
      key: `attr.${a.handle}`,
      label: a.label,
      swatch: a.displayType === "swatch",
      values: a.values.map((v) => ({ value: v.value, label: v.label, count: v.count, swatch: v.swatch })),
    })),
  ].filter((g) => g.values.length > 0);

  return (
    <div className="facets">
      <form className="facet" method="get" action={basePath}>
        {/* keep everything but the price range when it's applied */}
        {[...toSearchParams({ ...state, minPrice: undefined, maxPrice: undefined, page: 1 }, extraParams)].map(
          ([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ),
        )}
        <details open={state.minPrice !== undefined || state.maxPrice !== undefined || undefined}>
          <summary>
            {t("price")}
            <Icon name="plus" size="sm" />
          </summary>
          <div className="price-range">
            <input
              className="input"
              type="number"
              name="minPrice"
              inputMode="numeric"
              min={0}
              placeholder={t("min")}
              aria-label={t("minPrice")}
              defaultValue={state.minPrice}
            />
            <span aria-hidden="true">–</span>
            <input
              className="input"
              type="number"
              name="maxPrice"
              inputMode="numeric"
              min={0}
              placeholder={t("max")}
              aria-label={t("maxPrice")}
              defaultValue={state.maxPrice}
            />
            <button className="btn btn--secondary" type="submit" style={{ gridColumn: "1 / -1", minHeight: 40 }}>
              {t("apply")}
            </button>
          </div>
        </details>
      </form>

      <div className="facet">
        <Link
          className="facet__option"
          style={{ minHeight: 52 }}
          href={urlFor(basePath, { ...state, inStock: !state.inStock, page: 1 }, extraParams)}
          aria-current={state.inStock ? "true" : undefined}
        >
          <span className="facet__box" aria-hidden="true">
            {state.inStock && <Icon name="check" size="sm" />}
          </span>
          {t("inStockOnly")}
        </Link>
      </div>

      {groups.map((group) => (
        <details key={group.key} className="facet" open>
          <summary>
            {group.label}
            <Icon name="plus" size="sm" />
          </summary>
          <ul className="facet__options">
            {group.values.map((v) => {
              const selected = state.filters[group.key]?.includes(v.value) ?? false;
              return (
                <li key={v.value}>
                  <Link
                    className="facet__option"
                    href={urlFor(basePath, toggleFilter(state, group.key, v.value), extraParams)}
                    aria-current={selected ? "true" : undefined}
                    rel="nofollow"
                  >
                    {group.swatch ? (
                      <span
                        className="facet__swatch"
                        style={{ background: v.swatch ?? swatchColor(v.value) }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="facet__box" aria-hidden="true">
                        {selected && <Icon name="check" size="sm" />}
                      </span>
                    )}
                    {v.label}
                    {selected && <span className="sr-only">{t("selected")}</span>}
                    <span className="facet__count">{v.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </div>
  );
}

function Pagination({
  basePath,
  state,
  extraParams,
  pageCount,
  label,
}: {
  basePath: string;
  state: ListingState;
  extraParams: Record<string, string>;
  pageCount: number;
  label: string;
}) {
  if (pageCount <= 1) return null;
  // first, last, and two either side of the current page
  const pages = [...new Set([1, state.page - 2, state.page - 1, state.page, state.page + 1, state.page + 2, pageCount])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  return (
    <nav className="pager" aria-label={label}>
      {pages.map((p, i) => (
        <span key={p} style={{ display: "contents" }}>
          {i > 0 && p - pages[i - 1]! > 1 && <span aria-hidden="true">…</span>}
          {p === state.page ? (
            <span aria-current="page">{p}</span>
          ) : (
            <Link href={urlFor(basePath, { ...state, page: p }, extraParams)}>{p}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
