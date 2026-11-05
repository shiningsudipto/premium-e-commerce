import { describe, expect, it } from "vitest";
import { fallbackChain, loadMessages, mergeMessages } from "./messages";

describe("message fallback chain", () => {
  it("falls back from the requested locale to the market default to English", () => {
    expect(fallbackChain("bn", "en")).toEqual(["bn", "en"]);
    expect(fallbackChain("fr")).toEqual(["en"]);
  });

  it("fills missing keys at any depth", () => {
    expect(mergeMessages({ a: { b: "bn" } }, { a: { b: "en", c: "en" }, d: "en" })).toEqual({
      a: { b: "bn", c: "en" },
      d: "en",
    });
  });

  it("serves Bengali where translated and English elsewhere", async () => {
    const bn = (await loadMessages("bn")) as { product: { quickAdd: string; secondAngle: string } };
    expect(bn.product.quickAdd).toBe("দ্রুত যোগ করুন");
    expect(bn.product.secondAngle).toBe("Second angle");
  });
});
