import { describe, expect, it } from "vitest";
import { fallbackChain, loadMessages, mergeMessages, type Messages } from "./messages";

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

  it("loads every part of the Bangla catalogue", async () => {
    const bn = (await loadMessages("bn")) as Record<string, Record<string, unknown>>;
    expect(bn.product!.quickAdd).toBe("দ্রুত যোগ করুন"); // bn.json
    expect(bn.promotions!.label).toBe("প্রোমো কোড"); // bn.growth.json
    expect((bn.affiliate!.dashboard as { title: string }).title).toBe("অ্যাফিলিয়েট ড্যাশবোর্ড"); // bn.affiliate.json
    expect(bn.reviews!.title).toBe("রিভিউ"); // bn.community.json
  });

  it("serves English for any key the Bangla catalogue doesn't have yet", async () => {
    const [en, bn] = await Promise.all([loadMessages("en"), loadMessages("bn")]);
    const keys = (m: Messages, prefix = ""): string[] =>
      Object.entries(m).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    // every English key resolves in Bangla, translated or not
    expect(keys(bn)).toEqual(expect.arrayContaining(keys(en)));
  });
});
