import { describe, expect, it } from "vitest";
import { countriesLabel, parseCountries, rateConditions } from "./shipping-zones";

const base = {
  type: "FLAT" as const,
  currency: "BDT",
  minSubtotalMinor: null,
  maxSubtotalMinor: null,
  minWeightGrams: null,
  maxWeightGrams: null,
  freeAboveMinor: null,
  minDeliveryDays: null,
  maxDeliveryDays: null,
};

describe("shipping zones", () => {
  it("parses country lists, keeping rest of world", () => {
    expect(parseCountries("bd, IN  *, bd")).toEqual({ countries: ["BD", "IN", "*"], invalid: [] });
    expect(parseCountries("BD, Bangladesh")).toEqual({ countries: ["BD"], invalid: ["BANGLADESH"] });
    expect(countriesLabel(["BD", "*"])).toBe("BD, Rest of world");
  });

  it("describes when a rate applies", () => {
    expect(rateConditions(base)).toBe("Always");
    expect(rateConditions({ ...base, type: "WEIGHT", minWeightGrams: 500, maxWeightGrams: 2000 })).toBe(
      "Weight 500 g – under 2000 g",
    );
    expect(
      rateConditions({ ...base, type: "PRICE", minSubtotalMinor: 100000, minDeliveryDays: 2, maxDeliveryDays: 4 }),
    ).toMatch(/^Subtotal .*1,000\.00 and up · 2–4 days$/);
    expect(rateConditions({ ...base, freeAboveMinor: 500000 })).toMatch(/^free from .*5,000\.00$/);
  });
});
