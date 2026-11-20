import { describe, expect, it } from "vitest";
import {
  activityCsv,
  activityParamChanges,
  parseActivityParams,
  percent,
  SIGNAL_INFO,
  SIGNAL_ORDER,
  type ActivityItem,
} from "./activity-logic";

const params = (q: string) => new URLSearchParams(q);

describe("product activity filters", () => {
  it("reads filters from the URL, ignoring junk", () => {
    expect(parseActivityParams(params(""))).toEqual({
      q: "",
      categoryId: null,
      collectionId: null,
      signal: null,
      minViews: 0,
      sort: "views",
      limit: 50,
    });
    expect(
      parseActivityParams(params("q=bag&category=c1&hint=popular&minViews=20&sort=addRate&limit=100")),
    ).toMatchObject({
      q: "bag",
      categoryId: "c1",
      signal: "popular",
      minViews: 20,
      sort: "addRate",
      limit: 100,
    });
    expect(parseActivityParams(params("hint=nope&sort=price&limit=7&minViews=-3"))).toMatchObject({
      signal: null,
      sort: "views",
      limit: 50,
      minViews: 0,
    });
  });

  it("writes only non-default filters back to the URL", () => {
    expect(activityParamChanges({ q: "  ", sort: "views", limit: 50, minViews: 0 })).toEqual({
      q: null,
      sort: null,
      limit: null,
      minViews: null,
    });
    expect(activityParamChanges({ q: "wallet", categoryId: "c2", signal: "added_not_bought", sort: "adds" })).toEqual({
      q: "wallet",
      category: "c2",
      hint: "added_not_bought",
      sort: "adds",
    });
  });
});

describe("product activity output", () => {
  it("formats rates", () => {
    expect(percent(null)).toBe("–");
    expect(percent(0.1234)).toBe("12.3%");
  });

  it("explains every hint, with a next step", () => {
    for (const s of SIGNAL_ORDER) {
      expect(SIGNAL_INFO[s].meaning.length).toBeGreaterThan(10);
      expect(SIGNAL_INFO[s].action.length).toBeGreaterThan(10);
    }
  });

  it("exports CSV with quoting", () => {
    const item: ActivityItem = {
      productId: "p1",
      title: 'Bag, "Tan"',
      handle: "bag-tan",
      status: "ACTIVE",
      imageUrl: null,
      views: 40,
      viewers: 30,
      adds: 6,
      adders: 5,
      addedUnits: 7,
      customers: 2,
      unitsSold: 0,
      available: null,
      addRate: 5 / 30,
      signals: ["added_not_bought"],
    };
    const [head, row] = activityCsv([item]).split("\n");
    expect(head).toContain("Add rate %");
    expect(row).toBe('"Bag, ""Tan""",bag-tan,40,30,6,5,7,16.7,0,2,,"Added, not bought"');
  });
});
