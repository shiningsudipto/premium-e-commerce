import { describe, expect, it } from "vitest";
import { addTags, confirmationMatches, confirmationPhrase, exportFileName, MAX_TAGS, sameTags } from "./tags";

describe("customer tags", () => {
  it("adds comma-separated tags without duplicates", () => {
    expect(addTags(["vip"], " wholesale, vip ,, b2b ")).toEqual({ tags: ["vip", "wholesale", "b2b"], rejected: [] });
    expect(addTags([], "VIP, vip").tags).toEqual(["VIP", "vip"]);
  });

  it("rejects over-long tags and tags past the limit", () => {
    expect(addTags([], "x".repeat(51)).rejected).toHaveLength(1);
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(addTags(full, "one-more")).toEqual({ tags: full, rejected: ["one-more"] });
  });

  it("compares tag lists in order", () => {
    expect(sameTags(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameTags(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameTags(["a"], ["a", "b"])).toBe(false);
  });
});

describe("privacy confirmation", () => {
  it("asks for the email, or a fixed word without one", () => {
    expect(confirmationPhrase("ana@example.com")).toBe("ana@example.com");
    expect(confirmationPhrase(null)).toBe("ANONYMIZE");
    expect(confirmationPhrase("  ")).toBe("ANONYMIZE");
    expect(confirmationMatches(" ANA@example.com ", "ana@example.com")).toBe(true);
    expect(confirmationMatches("ana@example", "ana@example.com")).toBe(false);
  });

  it("names export files by customer and date", () => {
    expect(exportFileName("c1", new Date("2026-03-04T10:00:00Z"))).toBe("customer-c1-2026-03-04.json");
  });
});
