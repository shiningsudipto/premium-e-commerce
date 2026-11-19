import { describe, expect, it } from "vitest";
import { nextSort, overviewQuery, periodFrom, periodOf, sortOf, subIdRows } from "./subids";

const rows = [
  { subId: "ig", clicks: 30, conversions: 3 },
  { subId: null, clicks: 60, conversions: 2 },
  { subId: "yt", clicks: 10, conversions: 2 },
  { subId: "mail", clicks: 0, conversions: 1 },
];

describe("overview period and sub-ID sorting", () => {
  it("reads the period, falling back to 30 days", () => {
    expect(periodOf({ period: "7" })).toBe(7);
    expect(periodOf({ period: "90" })).toBe(90);
    expect(periodOf({ period: "365" })).toBe(30);
    expect(periodOf({ period: ["7", "90"] })).toBe(30);
    expect(periodOf({})).toBe(30);
  });

  it("computes the stats range start", () => {
    expect(periodFrom(7, new Date("2026-11-13T12:00:00Z"))).toBe("2026-11-06T12:00:00.000Z");
  });

  it("reads the sort with sensible default directions", () => {
    expect(sortOf({})).toEqual({ key: "clicks", dir: "desc" });
    expect(sortOf({ sort: "subId" })).toEqual({ key: "subId", dir: "asc" });
    expect(sortOf({ sort: "rate", dir: "asc" })).toEqual({ key: "rate", dir: "asc" });
    expect(sortOf({ sort: "drop table" })).toEqual({ key: "clicks", dir: "desc" });
  });

  it("flips the direction on the current column and resets on a new one", () => {
    expect(nextSort({ key: "clicks", dir: "desc" }, "clicks")).toEqual({ key: "clicks", dir: "asc" });
    expect(nextSort({ key: "clicks", dir: "asc" }, "subId")).toEqual({ key: "subId", dir: "asc" });
    expect(nextSort({ key: "subId", dir: "asc" }, "conversions")).toEqual({ key: "conversions", dir: "desc" });
  });

  it("builds query strings that leave defaults out", () => {
    expect(overviewQuery(30, { key: "clicks", dir: "desc" })).toBe("");
    expect(overviewQuery(7, { key: "clicks", dir: "desc" })).toBe("?period=7");
    expect(overviewQuery(90, { key: "rate", dir: "asc" })).toBe("?period=90&sort=rate&dir=asc");
  });

  it("adds conversion rate and click share, and sorts", () => {
    const byClicks = subIdRows(rows, { key: "clicks", dir: "desc" });
    expect(byClicks.map((r) => r.subId)).toEqual([null, "ig", "yt", "mail"]);
    expect(byClicks[0]).toMatchObject({ rate: 2 / 60, share: 0.6 });
    // no clicks: no rate (orders can arrive without a counted click)
    expect(byClicks[3]).toMatchObject({ rate: null, share: 0 });

    expect(subIdRows(rows, { key: "rate", dir: "desc" }).map((r) => r.subId)).toEqual(["yt", "ig", null, "mail"]);
    expect(subIdRows(rows, { key: "subId", dir: "asc" }).map((r) => r.subId)).toEqual([null, "ig", "mail", "yt"]);
    // ties on conversions: busiest first
    expect(subIdRows(rows, { key: "conversions", dir: "desc" }).map((r) => r.subId)).toEqual([
      "ig",
      null,
      "yt",
      "mail",
    ]);
  });

  it("handles a period without clicks", () => {
    expect(subIdRows([{ subId: "x", clicks: 0, conversions: 0 }], { key: "clicks", dir: "desc" })[0]).toMatchObject({
      share: 0,
      rate: null,
    });
  });
});
