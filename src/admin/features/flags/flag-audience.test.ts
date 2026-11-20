import { describe, expect, it } from "vitest";
import { describeAudience } from "./flag-audience";

const names = {
  markets: new Map([["bd", "Bangladesh"]]),
  channels: new Map([["web", "Web store"]]),
  groups: new Map([["g1", "VIP"]]),
};
const on = { enabled: true, killSwitch: false };

describe("flag audience summary", () => {
  it("no targeting means everyone", () => {
    expect(describeAudience({}, names, on)).toEqual({ headline: "Everyone.", conditions: [] });
  });

  it("lists every condition by name, all of which must match", () => {
    const s = describeAudience(
      { markets: ["bd"], channels: ["web"], groups: ["g1"], customerIds: ["c1", "c2"], percentage: 20 },
      names,
      on,
    );
    expect(s.headline).toBe("Only shoppers who match all of these:");
    expect(s.conditions).toEqual([
      "Shopping in Bangladesh",
      "Using Web store",
      "Signed in, in customer group VIP",
      "Signed in as one of 2 chosen customers",
      "Among a fixed 20% of shoppers (visitors who haven't started a session are left out)",
    ]);
  });

  it("100% isn't a partial rollout", () => {
    expect(describeAudience({ percentage: 100 }, names, on).conditions).toEqual([]);
  });

  it("says nobody sees it when the flag is off or the kill switch is on", () => {
    expect(describeAudience({ markets: ["bd"] }, names, { enabled: false, killSwitch: false }).headline).toMatch(
      /^Nobody: the flag is off/,
    );
    expect(describeAudience({ markets: ["bd"] }, names, { enabled: true, killSwitch: true })).toEqual({
      headline: "Nobody: the kill switch is on.",
      conditions: [],
    });
  });
});
