import { describe, expect, it } from "vitest";
import { visibleBlocks } from "./blocks";

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

  it("leaves out per-visitor blocks and filters children", () => {
    const blocks = [
      { type: "a", settings: { audience: { loggedIn: true } } },
      { type: "b", settings: { experiment: { key: "x", variant: "1" } } },
      { type: "columns", children: [{ type: "spacer" }, { type: "c", settings: { audience: { segmentIds: ["s"] } } }] },
    ];
    const out = visibleBlocks(blocks, { market: "bd", now });
    expect(out.map((b) => b.type)).toEqual(["columns"]);
    expect(out[0]!.children!.map((b) => b.type)).toEqual(["spacer"]);
  });
});
