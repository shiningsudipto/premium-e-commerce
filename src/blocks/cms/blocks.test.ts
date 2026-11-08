import { describe, expect, it } from "vitest";
import { matchesAudience, personalAudience, visibleBlocks, type Visitor } from "./blocks";

const now = new Date("2026-11-06T12:00:00Z");

describe("visibleBlocks", () => {
  it("drops malformed entries and keeps plain blocks, including unknown types", () => {
    const out = visibleBlocks([{ type: "hero", props: {} }, "junk", { props: {} }, { type: "future_block" }], {
      market: "bd",
      now,
    });
    expect(out.map((b) => b.type)).toEqual(["hero", "future_block"]);
    expect(visibleBlocks(null, { market: "bd", now })).toEqual([]);
  });

  it("applies market and schedule rules", () => {
    const blocks = [
      { type: "a", settings: { audience: { markets: ["us"] } } },
      { type: "b", settings: { audience: { markets: ["bd"] } } },
      { type: "c", settings: { schedule: { startsAt: "2026-12-01T00:00:00Z" } } },
      { type: "d", settings: { schedule: { endsAt: "2026-11-01T00:00:00Z" } } },
      { type: "e", settings: { schedule: { startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" } } },
    ];
    expect(visibleBlocks(blocks, { market: "bd", now }).map((b) => b.type)).toEqual(["b", "e"]);
  });

  it("keeps per-visitor blocks for the render to decide, drops experiment variants, filters children", () => {
    const blocks = [
      { type: "a", settings: { audience: { loggedIn: true } } },
      { type: "b", settings: { experiment: { key: "x", variant: "1" } } },
      { type: "columns", children: [{ type: "spacer" }, { type: "c", settings: { audience: { segmentIds: ["s"] } } }] },
    ];
    const out = visibleBlocks(blocks, { market: "bd", now });
    expect(out.map((b) => b.type)).toEqual(["a", "columns"]);
    expect(out[1]!.children!.map((b) => b.type)).toEqual(["spacer", "c"]);
  });
});

describe("personalAudience", () => {
  it("is null for blocks everyone sees", () => {
    expect(personalAudience({ type: "a" })).toBeNull();
    expect(personalAudience({ type: "a", settings: { audience: { markets: ["bd"], segmentIds: [] } } })).toBeNull();
  });

  it("keeps only the visitor-dependent conditions", () => {
    expect(
      personalAudience({
        type: "a",
        settings: { audience: { markets: ["bd"], loggedIn: false, segmentIds: ["vip"] } },
      }),
    ).toEqual({ loggedIn: false, segmentIds: ["vip"] });
  });
});

describe("matchesAudience", () => {
  const guest: Visitor = { signedIn: false, isNew: true, segmentIds: [] };
  const vip: Visitor = { signedIn: true, isNew: false, segmentIds: ["vip", "bd-buyers"] };

  it("checks signed-in state and new visitors", () => {
    expect(matchesAudience({ loggedIn: true }, guest)).toBe(false);
    expect(matchesAudience({ loggedIn: true }, vip)).toBe(true);
    expect(matchesAudience({ loggedIn: false }, guest)).toBe(true);
    expect(matchesAudience({ newVisitors: true }, guest)).toBe(true);
    expect(matchesAudience({ newVisitors: true }, vip)).toBe(false);
  });

  it("needs any one of the segments, and every condition together", () => {
    expect(matchesAudience({ segmentIds: ["other", "vip"] }, vip)).toBe(true);
    expect(matchesAudience({ segmentIds: ["vip"] }, guest)).toBe(false);
    expect(matchesAudience({ segmentIds: ["vip"], newVisitors: true }, vip)).toBe(false);
  });
});
