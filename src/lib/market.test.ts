import { describe, expect, it } from "vitest";
import { allSegments, parseMarketSegment, pickSegment, resolveSegment, type MarketInfo } from "./market";

const markets: MarketInfo[] = [
  { handle: "bd", defaultLocale: "en", locales: ["en", "bn"], countries: ["BD"] },
  { handle: "in", defaultLocale: "en", locales: ["en"], countries: ["IN"] },
];

describe("market segments", () => {
  it("parses {locale}-{market}", () => {
    expect(parseMarketSegment("bn-bd")).toEqual({ segment: "bn-bd", locale: "bn", market: "bd" });
    expect(parseMarketSegment("products")).toBeNull();
    expect(parseMarketSegment("EN-BD")).toBeNull();
  });

  it("only accepts markets that exist with a locale they offer", () => {
    expect(resolveSegment("bn-bd", markets)?.market).toBe("bd");
    expect(resolveSegment("bn-in", markets)).toBeNull();
    expect(resolveSegment("en-us", markets)).toBeNull();
    expect(allSegments(markets)).toEqual(["en-bd", "bn-bd", "en-in"]);
  });

  it("picks the remembered market, then the visitor's country, then the default", () => {
    expect(pickSegment({ cookie: "bn-bd", country: "IN" }, markets, "en-bd")).toBe("bn-bd");
    expect(pickSegment({ cookie: "xx-yy", country: "in" }, markets, "en-bd")).toBe("en-in");
    expect(pickSegment({ country: "US" }, markets, "en-bd")).toBe("en-bd");
  });
});
