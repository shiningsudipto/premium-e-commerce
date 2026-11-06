import { describe, expect, it } from "vitest";
import {
  basePrice,
  cleanSeo,
  combinationCount,
  customFieldSchema,
  fromLocalInput,
  moveItem,
  optionLabel,
  publishState,
  readOptions,
  slug,
  splitList,
  toLocalInput,
} from "./product-form";

describe("product editor helpers", () => {
  it("builds a schema per custom field type, like the API validates", () => {
    expect(customFieldSchema({ type: "text", options: [], required: true })).toEqual({
      type: "string",
      maxLength: 10_000,
    });
    expect(customFieldSchema({ type: "number", options: [], required: false })).toEqual({
      anyOf: [{ type: "number" }, { type: "null" }],
    });
    expect(
      customFieldSchema({ type: "select", options: [{ value: "cotton", label: "Cotton" }], required: true }),
    ).toEqual({ type: "string", enum: ["cotton"] });
    expect(customFieldSchema({ type: "multi_select", options: [], required: true })).toEqual({
      type: "array",
      items: { type: "string" },
    });
    expect(customFieldSchema({ type: "boolean", options: [], required: false })).toEqual({ type: "boolean" });
    expect(customFieldSchema({ type: "json", options: [], required: true })).toEqual({});
  });

  it("reads publish state, including scheduled", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(publishState({ status: "ACTIVE", publishAt: "2026-02-01T00:00:00Z" }, now)).toBe("scheduled");
    expect(publishState({ status: "ACTIVE", publishAt: "2025-02-01T00:00:00Z" }, now)).toBe("active");
    expect(publishState({ status: "DRAFT", publishAt: "2026-02-01T00:00:00Z" }, now)).toBe("draft");
    expect(publishState({ status: "ARCHIVED", publishAt: null }, now)).toBe("archived");
  });

  it("reorders, splits and reads stored shapes", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b"], 1, 5)).toEqual(["a", "b"]);
    expect(splitList(" sale, new ,,sale")).toEqual(["sale", "new"]);
    expect(readOptions([{ name: "Size", values: ["S", "M"] }, { bad: true }, "x"])).toEqual([
      { name: "Size", values: ["S", "M"] },
    ]);
    expect(readOptions(null)).toEqual([]);
    expect(optionLabel({ Color: "Red", Size: "M" })).toBe("Red / M");
    expect(
      combinationCount([
        { name: "Color", values: ["Red", "Blue"] },
        { name: "Size", values: ["S", "M", "L"] },
      ]),
    ).toBe(6);
    expect(slug("  Men's Café Shirts! ")).toBe("men-s-cafe-shirts");
    expect(cleanSeo({ title: " T ", description: "", noindex: false })).toEqual({ title: "T" });
  });

  it("round-trips datetime-local values", () => {
    const iso = "2026-03-04T05:06:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(fromLocalInput("")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });

  it("picks the single-unit price of a price list", () => {
    const prices = [
      { priceListId: "pl", currency: "BDT", amountMinor: 900, compareAtMinor: null, minQty: 10 },
      { priceListId: "pl", currency: "BDT", amountMinor: 1000, compareAtMinor: 1200, minQty: 1 },
    ];
    expect(basePrice({ prices }, "pl")?.amountMinor).toBe(1000);
    expect(basePrice({ prices }, "other")).toBeNull();
  });
});
