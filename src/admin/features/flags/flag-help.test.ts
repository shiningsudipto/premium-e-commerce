import { describe, expect, it } from "vitest";
import { FLAG_HELP } from "./flag-help";

// The built-in flags (premium-ec-backend/src/core/flags.ts launchFlags) each explain themselves,
// and only flags whose feature exists are marked live.
const LAUNCH_FLAGS = [
  "reviews",
  "qna",
  "loyalty",
  "gift_cards",
  "subscriptions",
  "b2b",
  "affiliates",
  "split_shipments",
  "cart_reservation",
  "social_proof",
  "live_chat",
  "ar_viewer",
  "appointments",
  "product_compare",
  "gift_registry",
  "popup_builder",
  "realtime_dashboard",
];

describe("feature flag help", () => {
  it("covers every built-in flag", () => {
    for (const key of LAUNCH_FLAGS) expect(FLAG_HELP[key], key).toBeDefined();
  });

  it("marks only built features as live", () => {
    const live = Object.entries(FLAG_HELP)
      .filter(([, h]) => h.status === "live")
      .map(([k]) => k)
      .sort();
    expect(live).toEqual(["affiliates", "qna", "reviews"]);
  });

  it.each(Object.entries(FLAG_HELP))("%s is complete and well formed", (_key, h) => {
    expect(h.what.length).toBeGreaterThan(10);
    expect(h.why.length).toBeGreaterThan(10);
    expect(h.effects.length).toBeGreaterThan(0);
    for (const t of [h.what, h.why, h.recommended, h.caution ?? "", ...h.effects]) {
      expect((t.match(/`/g) ?? []).length % 2, t).toBe(0);
      expect((t.match(/\*\*/g) ?? []).length % 2, t).toBe(0);
    }
  });
});
