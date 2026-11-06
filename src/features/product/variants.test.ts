import { describe, expect, it } from "vitest";
import {
  choose,
  findVariant,
  initialVariant,
  orderMedia,
  valueState,
  withLiveStock,
  type VariantLike,
} from "./variants";

const v = (id: string, colour: string, size: string, availableForSale = true): VariantLike => ({
  id,
  optionValues: { Colour: colour, Size: size },
  availableForSale,
  stock: availableForSale ? "in_stock" : "out_of_stock",
});

const variants = [v("a", "Oxblood", "S", false), v("b", "Oxblood", "M"), v("c", "Cream", "M"), v("d", "Cream", "L")];

describe("variant selection", () => {
  it("finds the exact combination only", () => {
    expect(findVariant(variants, { Colour: "Cream", Size: "M" })?.id).toBe("c");
    expect(findVariant(variants, { Colour: "Cream", Size: "S" })).toBeUndefined();
    expect(findVariant(variants, { Colour: "Cream" })).toBeUndefined();
  });

  it("starts on the linked variant, else the first buyable one", () => {
    expect(initialVariant(variants, "d")?.id).toBe("d");
    expect(initialVariant(variants, "nope")?.id).toBe("b");
    expect(initialVariant(variants)?.id).toBe("b");
  });

  it("keeps other choices when it can, otherwise moves to the nearest buyable variant", () => {
    expect(choose(variants, { Colour: "Oxblood", Size: "M" }, "Colour", "Cream")?.id).toBe("c");
    // Cream doesn't come in S: stay on Cream, pick a size that exists
    expect(choose(variants, { Colour: "Oxblood", Size: "S" }, "Colour", "Cream")?.id).toMatch(/[cd]/);
    expect(choose(variants, { Colour: "Cream", Size: "M" }, "Size", "L")?.id).toBe("d");
  });

  it("marks values as available, sold out or missing", () => {
    const sel = { Colour: "Oxblood", Size: "M" };
    expect(valueState(variants, sel, "Size", "S")).toBe("sold_out");
    expect(valueState(variants, sel, "Size", "L")).toBe("missing");
    expect(valueState(variants, sel, "Size", "M")).toBe("available");
  });

  it("lays live stock over cached variants", () => {
    const live = withLiveStock(variants, [{ variantId: "b", availableForSale: false, stock: "out_of_stock" }]);
    expect(live.find((x) => x.id === "b")?.availableForSale).toBe(false);
    expect(live.find((x) => x.id === "c")?.availableForSale).toBe(true);
    expect(withLiveStock(variants, null)).toBe(variants);
  });

  it("puts the chosen variant's images first", () => {
    const media = [
      { id: "1", variantIds: [] },
      { id: "2", variantIds: ["c"] },
    ];
    expect(orderMedia(media, "c").map((m) => m.id)).toEqual(["2", "1"]);
    expect(orderMedia(media, "b").map((m) => m.id)).toEqual(["1", "2"]);
  });
});
