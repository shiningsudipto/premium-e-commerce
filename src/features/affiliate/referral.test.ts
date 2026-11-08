import { describe, expect, it } from "vitest";
import {
  buildAffiliateLink,
  cleanSearch,
  hasRefParams,
  nextReferral,
  normalizeLinkPath,
  parseReferral,
  readRefParams,
  serializeReferral,
} from "./referral";

const q = (s: string) => new URLSearchParams(s);

describe("referral URL parameters", () => {
  it("reads the code, sub-ID and asset, normalising the code", () => {
    expect(readRefParams(q("ref=anna10&sub=insta%20bio&asset=a_1"))).toEqual({
      code: "ANNA10",
      subId: "insta bio",
      assetId: "a_1",
    });
    expect(readRefParams(q("ref=ANNA"))).toEqual({ code: "ANNA", subId: null, assetId: null });
  });

  it("rejects missing or malformed codes and drops bad extras", () => {
    expect(readRefParams(q("sub=x"))).toBeNull();
    expect(readRefParams(q("ref="))).toBeNull();
    expect(readRefParams(q("ref=<script>"))).toBeNull();
    expect(readRefParams(q(`ref=${"A".repeat(61)}`))).toBeNull();
    expect(readRefParams(q("ref=A&sub=%0A%0A&asset=../x"))).toEqual({ code: "A", subId: null, assetId: null });
    expect(readRefParams(q(`ref=A&sub=${"s".repeat(150)}`))?.subId).toHaveLength(100);
  });

  it("triggers only on ref", () => {
    expect(hasRefParams(q("ref=A"))).toBe(true);
    expect(hasRefParams(q("sub=x"))).toBe(false);
  });

  it("removes ref, sub and asset and keeps everything else", () => {
    expect(cleanSearch(q("ref=A&sub=b"))).toBe("");
    expect(cleanSearch(q("sort=price&ref=A&page=2&asset=x"))).toBe("?sort=price&page=2");
  });
});

describe("referral cookie", () => {
  const now = new Date("2026-11-01T10:00:00.000Z");
  const later = new Date("2026-11-03T10:00:00.000Z");

  it("keeps the first click and replaces the last", () => {
    const one = nextReferral(null, { code: "ANNA", subId: "ig", assetId: null }, now);
    expect(one.first).toEqual(one.last);
    const two = nextReferral(one, { code: "BOB", subId: null, assetId: null }, later);
    expect(two.first).toEqual({ code: "ANNA", subId: "ig", assetId: null, clickedAt: now.toISOString() });
    expect(two.last).toEqual({ code: "BOB", subId: null, assetId: null, clickedAt: later.toISOString() });
  });

  it("round-trips and survives garbage", () => {
    const r = nextReferral(null, { code: "ANNA", subId: null, assetId: "a1" }, now);
    expect(parseReferral(serializeReferral(r))).toEqual(r);
    expect(parseReferral(undefined)).toBeNull();
    expect(parseReferral("not json")).toBeNull();
    expect(parseReferral('{"first":{"code":"x y","clickedAt":"2026-01-01"}}')).toBeNull();
    expect(parseReferral('{"last":{"code":"A","clickedAt":"nope"}}')).toBeNull();
  });

  it("fills a missing half from the other", () => {
    const parsed = parseReferral('{"last":{"code":"A","clickedAt":"2026-11-01T10:00:00.000Z"}}');
    expect(parsed?.first).toEqual(parsed?.last);
  });
});

describe("affiliate link builder", () => {
  const origin = "https://shop.example";

  it("adds ref and sub to a market path", () => {
    expect(buildAffiliateLink({ origin, path: "/en-bd", code: "ANNA" })).toBe("https://shop.example/en-bd?ref=ANNA");
    expect(buildAffiliateLink({ origin, path: "/en-bd/products/bag", code: "ANNA", subId: "yt video" })).toBe(
      "https://shop.example/en-bd/products/bag?ref=ANNA&sub=yt+video",
    );
  });

  it("keeps other params and replaces old referral params", () => {
    expect(buildAffiliateLink({ origin, path: "/en-bd/search?q=bag&ref=OLD&sub=x", code: "ANNA" })).toBe(
      "https://shop.example/en-bd/search?q=bag&ref=ANNA",
    );
  });

  it("accepts only same-site paths", () => {
    expect(normalizeLinkPath("")).toBe("/");
    expect(normalizeLinkPath(" /products/bag ")).toBe("/products/bag");
    expect(normalizeLinkPath("https://evil.example")).toBeNull();
    expect(normalizeLinkPath("//evil.example")).toBeNull();
    expect(normalizeLinkPath("/a b")).toBeNull();
  });
});
