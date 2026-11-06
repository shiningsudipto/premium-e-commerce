import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/en-bd/checkout", "/x")).toBe("/en-bd/checkout");
    expect(safeNext("/en-bd/account/orders?page=2#top", "/x")).toBe("/en-bd/account/orders?page=2#top");
  });

  it("refuses other sites and odd forms", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(bad, "/fallback")).toBe("/fallback");
    }
  });
});
