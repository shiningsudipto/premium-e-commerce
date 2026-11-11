import { describe, expect, it } from "vitest";
import { parseCsv } from "../data/csv";
import {
  autoInterval,
  customRangeError,
  fillPeriods,
  fromDateInput,
  parseRangeParams,
  periodLabel,
  previousRange,
  resolveRange,
  toDateInput,
} from "./dates";
import { majorUnits, productsCsv, reportFileName, salesCsv, searchCsv, type SalesPoint } from "./report-csv";
import { axisNumber, change, labelIndices, linear, moneyCompact, nearestIndex, niceTicks } from "./scale";

const params = (q: string) => new URLSearchParams(q);

describe("date presets", () => {
  const now = new Date(2026, 10, 8, 15, 30); // 8 Nov 2026, local time

  it("a preset of n days ends today and includes it", () => {
    const r = resolveRange({ preset: "7d" }, now);
    expect(r.from).toEqual(new Date(2026, 10, 2));
    expect(r.to).toEqual(new Date(2026, 10, 8, 23, 59, 59, 999));
    expect(r.days).toBe(7);
    expect(r.label).toBe("Last 7 days");
  });

  it("a custom range covers whole days", () => {
    const r = resolveRange({ preset: "custom", from: "2026-10-01", to: "2026-10-31" }, now);
    expect(r.from).toEqual(new Date(2026, 9, 1));
    expect(r.to).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
    expect(r.days).toBe(31);
  });

  it("the previous period is the same length, just before", () => {
    const prev = previousRange(resolveRange({ preset: "30d" }, now));
    expect(prev.days).toBe(30);
    expect(prev.to).toEqual(new Date(2026, 9, 9, 23, 59, 59, 999));
    expect(prev.from).toEqual(new Date(2026, 8, 10));
  });

  it("reads the URL, falling back to 30 days for anything invalid", () => {
    expect(parseRangeParams(params(""))).toEqual({ preset: "30d" });
    expect(parseRangeParams(params("range=90d"))).toEqual({ preset: "90d" });
    expect(parseRangeParams(params("range=custom&from=2026-10-01&to=2026-10-05"))).toEqual({
      preset: "custom",
      from: "2026-10-01",
      to: "2026-10-05",
    });
    expect(parseRangeParams(params("range=custom&from=2026-10-05&to=2026-10-01"))).toEqual({ preset: "30d" });
    expect(parseRangeParams(params("range=1y"))).toEqual({ preset: "30d" });
  });

  it("validates custom ranges", () => {
    expect(customRangeError("2026-10-01", "2026-10-01")).toBeNull();
    expect(customRangeError("", "2026-10-01")).toBe("Enter both dates.");
    expect(customRangeError("2026-02-30", "2026-03-01")).toBe("Enter both dates.");
    expect(customRangeError("2026-10-02", "2026-10-01")).toMatch(/on or before/);
    expect(customRangeError("2020-01-01", "2026-10-01")).toMatch(/two years/);
  });

  it("converts between date inputs and local dates", () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(fromDateInput("2026-01-05")).toEqual(new Date(2026, 0, 5));
    expect(fromDateInput("5/1/2026")).toBeNull();
  });

  it("picks a grouping with a readable number of points", () => {
    expect(autoInterval(7)).toBe("day");
    expect(autoInterval(31)).toBe("day");
    expect(autoInterval(90)).toBe("week");
    expect(autoInterval(365)).toBe("month");
  });
});

describe("filling empty periods", () => {
  const empty = (period: string) => ({ period, orders: 0 });
  const range = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-04T23:59:59Z") };

  it("puts back days without orders", () => {
    const filled = fillPeriods([{ period: "2026-11-02T00:00:00.000Z", orders: 3 }], range, "day", empty);
    expect(filled).toEqual([
      { period: "2026-11-01T00:00:00.000Z", orders: 0 },
      { period: "2026-11-02T00:00:00.000Z", orders: 3 },
      { period: "2026-11-03T00:00:00.000Z", orders: 0 },
      { period: "2026-11-04T00:00:00.000Z", orders: 0 },
    ]);
  });

  it("starts weeks on Monday and months on the 1st, like date_trunc", () => {
    const weeks = fillPeriods(
      [],
      { from: new Date("2026-11-04T00:00:00Z"), to: new Date("2026-11-20T00:00:00Z") },
      "week",
      empty,
    );
    expect(weeks.map((w) => w.period.slice(0, 10))).toEqual(["2026-11-02", "2026-11-09", "2026-11-16"]);
    const months = fillPeriods(
      [],
      { from: new Date("2026-09-15T00:00:00Z"), to: new Date("2026-11-02T00:00:00Z") },
      "month",
      empty,
    );
    expect(months.map((m) => m.period.slice(0, 10))).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
  });

  it("keeps periods from the API that don't line up", () => {
    const odd = { period: "2026-11-02T06:00:00.000Z", orders: 1 };
    expect(fillPeriods([odd], range, "day", empty)).toContainEqual(odd);
  });

  it("names periods", () => {
    expect(periodLabel("2026-11-02T00:00:00.000Z", "day")).toBe("2 Nov");
    expect(periodLabel("2026-11-02T00:00:00.000Z", "week", true)).toBe("Week of 2 Nov");
    expect(periodLabel("2026-11-01T00:00:00.000Z", "month")).toBe("Nov 2026");
  });
});

describe("chart scales", () => {
  it("makes round ticks from zero past the maximum", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(95)).toEqual([0, 50, 100]);
    expect(niceTicks(1234)).toEqual([0, 500, 1000, 1500]);
    expect(niceTicks(0.3)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("maps values linearly and finds the nearest point", () => {
    const y = linear(0, 100, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(nearestIndex(0, 5, 10, 110)).toBe(0);
    expect(nearestIndex(64, 5, 10, 110)).toBe(2);
    expect(nearestIndex(500, 5, 10, 110)).toBe(4);
    expect(nearestIndex(50, 1, 10, 110)).toBe(0);
  });

  it("spreads x labels evenly and keeps the ends", () => {
    expect(labelIndices(3, 7)).toEqual([0, 1, 2]);
    expect(labelIndices(30, 4)).toEqual([0, 10, 19, 29]);
    expect(labelIndices(0, 4)).toEqual([]);
  });

  it("formats axis numbers in full below 10,000 and compact above", () => {
    expect(axisNumber(2000, 8000)).toBe("2,000");
    expect(axisNumber(20000, 80000)).toBe("20K");
    expect(moneyCompact(1_500_000_00, "USD")).toBe("$1.5M");
    expect(moneyCompact(25_000, "USD")).toBe("$250");
  });

  it("computes change against a previous period", () => {
    expect(change(120, 100)).toBeCloseTo(0.2);
    expect(change(50, 100)).toBeCloseTo(-0.5);
    expect(change(5, 0)).toBeNull();
    expect(change(5, undefined)).toBeNull();
  });
});

describe("report CSV", () => {
  const point: SalesPoint = {
    period: "2026-11-02T00:00:00.000Z",
    orders: 2,
    grossMinor: 370000,
    discountsMinor: 10000,
    shippingMinor: 12000,
    taxMinor: 0,
    netMinor: 372000,
    refundsMinor: 0,
    averageOrderMinor: 186000,
  };

  it("writes money as major units", () => {
    expect(majorUnits(185000, "BDT")).toBe("1850.00");
    expect(majorUnits(1850, "JPY")).toBe("1850");
    expect(majorUnits(null, "BDT")).toBe("");
  });

  it("writes the sales table", () => {
    const rows = parseCsv(salesCsv([point], "day", "BDT"));
    expect(rows[0]).toContain("net_BDT");
    expect(rows[1]!.slice(0, 4)).toEqual(["2026-11-02", "2 Nov", "2", "3700.00"]);
  });

  it("writes products with a blank margin when cost is unknown", () => {
    const rows = parseCsv(
      productsCsv(
        [{ productId: "p1", title: "Shirt", units: 3, revenueMinor: 555000, marginMinor: null, unitsRefunded: 0 }],
        "BDT",
      ),
    );
    expect(rows[1]).toEqual(["p1", "Shirt", "3", "5550.00", "", "0"]);
  });

  it("merges top and zero-result searches", () => {
    const rows = parseCsv(
      searchCsv({
        available: true,
        totalSearches: 10,
        topQueries: [{ query: "shirt", searches: 6, averageResults: 12 }],
        zeroResultQueries: [{ query: "kilt", searches: 2 }],
      }),
    );
    expect(rows.slice(1)).toEqual([
      ["shirt", "6", "12", "0", "no"],
      ["kilt", "2", "0", "2", "yes"],
    ]);
  });

  it("names files after the report and range", () => {
    expect(reportFileName("sales", new Date(2026, 9, 10), new Date(2026, 10, 8))).toBe(
      "sales-2026-10-10-to-2026-11-08.csv",
    );
  });
});
