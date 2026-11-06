import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  clearFilters,
  parseListing,
  toApiQuery,
  toggleFilter,
  toSearchParams,
} from "./listing-query";

describe("listing state in the URL", () => {
  it("reads sort, page, price, stock and facet filters, ignoring anything else", () => {
    const state = parseListing({
      sort: "price_asc",
      page: "3",
      minPrice: "1000",
      maxPrice: "x",
      inStock: "1",
      "option.Color": ["Tan,Black", "Tan"],
      "attr.material": "leather",
      "option.<script>": "x",
      utm_source: "mail",
    });
    expect(state).toEqual({
      sort: "price_asc",
      page: 3,
      minPrice: 1000,
      maxPrice: undefined,
      inStock: true,
      filters: { "option.Color": ["Tan", "Black"], "attr.material": ["leather"] },
    });
    expect(parseListing({ sort: "cheapest", page: "-2" })).toMatchObject({ sort: undefined, page: 1 });
  });

  it("builds the API query, converting prices to minor units", () => {
    const state = parseListing({ minPrice: "500", "option.Color": "Tan" });
    expect(toApiQuery(state, { category: "bags" }, 24)).toEqual({
      category: "bags",
      page: 1,
      pageSize: 24,
      minPrice: 50000,
      facets: "1",
      "option.Color": "Tan",
    });
  });

  it("toggles a facet value and goes back to the first page", () => {
    const state = parseListing({ page: "4", "option.Color": "Tan" });
    const added = toggleFilter(state, "option.Color", "Black");
    expect(added.filters["option.Color"]).toEqual(["Tan", "Black"]);
    expect(added.page).toBe(1);
    const removed = toggleFilter(added, "option.Color", "Tan");
    expect(toggleFilter(removed, "option.Color", "Black").filters).toEqual({});
    expect(activeFilterCount(added)).toBe(2);
  });

  it("writes stable, shareable search params", () => {
    const state = parseListing({ "option.Size": "M", sort: "newest", "attr.material": "leather", page: "2" });
    expect(toSearchParams(state, { q: "bag" }).toString()).toBe(
      "q=bag&sort=newest&attr.material=leather&option.Size=M&page=2",
    );
    expect(toSearchParams(clearFilters(state)).toString()).toBe("sort=newest");
  });
});
