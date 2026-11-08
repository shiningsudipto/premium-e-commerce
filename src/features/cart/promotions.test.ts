import { describe, expect, it } from "vitest";
import { appliedByCode, explainCode } from "./promotions";

describe("explainCode", () => {
  it("applied codes need no explanation", () => {
    expect(explainCode({ status: "applied" })).toEqual({ key: "applied" });
  });

  it("turns unmet spend conditions into an amount the shopper can act on", () => {
    expect(
      explainCode({ status: "rejected", reason: "CONDITIONS_NOT_MET", detail: "subtotal must be at least 5000" }),
    ).toEqual({ key: "spendAtLeast", amountMinor: 5000 });
    expect(
      explainCode({
        status: "rejected",
        reason: "CONDITIONS_NOT_MET",
        detail: "qualifying items must total at least 12000",
      }),
    ).toEqual({ key: "qualifyingAmount", amountMinor: 12000 });
    expect(
      explainCode({ status: "rejected", reason: "CONDITIONS_NOT_MET", detail: "needs 2 qualifying item(s)" }),
    ).toEqual({ key: "qualifyingItems", count: 2 });
  });

  it("picks the first actionable part of an 'or' condition", () => {
    expect(
      explainCode({
        status: "rejected",
        reason: "CONDITIONS_NOT_MET",
        detail: "customer group not eligible or subtotal must be at least 900",
      }),
    ).toEqual({ key: "spendAtLeast", amountMinor: 900 });
  });

  it("falls back to general messages", () => {
    expect(
      explainCode({ status: "rejected", reason: "CONDITIONS_NOT_MET", detail: "shipping country not eligible" }),
    ).toEqual({ key: "notEligible" });
    expect(explainCode({ status: "rejected", reason: "CONDITIONS_NOT_MET" })).toEqual({ key: "conditionsNotMet" });
    expect(explainCode({ status: "rejected", reason: "USAGE_LIMIT_REACHED" })).toEqual({ key: "usedUp" });
    expect(explainCode({ status: "rejected", reason: "EXCLUSIVE_GROUP" })).toEqual({ key: "notCombinable" });
    expect(explainCode({ status: "rejected", reason: "SOMETHING_NEW" })).toEqual({ key: "unavailable" });
  });
});

describe("appliedByCode", () => {
  it("sums the discount per code and ignores automatic promotions", () => {
    const applied = [
      { promotionId: "a", name: "A", code: "SAVE10", itemsMinor: 100, shippingMinor: 0, amountMinor: 100 },
      { promotionId: "b", name: "B", code: "SAVE10", itemsMinor: 0, shippingMinor: 50, amountMinor: 50 },
      { promotionId: "c", name: "Auto", code: null, itemsMinor: 70, shippingMinor: 0, amountMinor: 70 },
    ];
    const totals = appliedByCode({ promotions: { codes: [], applied, rejected: [] } });
    expect([...totals]).toEqual([["SAVE10", 150]]);
  });
});
