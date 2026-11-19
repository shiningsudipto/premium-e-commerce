import { describe, expect, it } from "vitest";
import {
  batchActions,
  buildAsset,
  buildReferences,
  buildResolve,
  fraudEvidence,
  payoutMethodText,
  percent,
  staffLabel,
} from "./ops-logic";

describe("fraud review", () => {
  it("shows each kind's evidence numbers", () => {
    expect(fraudEvidence("HIGH_REFUND_RATE", { orders: 10, refunded: 4, rate: 0.4 })).toEqual([
      { label: "Orders (30 days)", value: "10" },
      { label: "Refunded", value: "4" },
      { label: "Refund rate", value: "40%" },
    ]);
    expect(fraudEvidence("CLICK_SPIKE", { clicks: 1500 })).toEqual([
      { label: "Clicks", value: "1,500" },
      { label: "Orders", value: "0" },
    ]);
    expect(fraudEvidence("SELF_REFERRAL", { code: "ANN10", source: "link" })).toHaveLength(2);
    expect(fraudEvidence("MARGIN_CAP", { lines: [{}, {}] })).toEqual([{ label: "Capped lines", value: "2" }]);
    expect(fraudEvidence("OTHER", {})).toEqual([]);
  });

  it("builds a resolution; confirming needs a reason", () => {
    expect(buildResolve({ outcome: "DISMISSED", note: "" })).toEqual({
      ok: true,
      body: { status: "DISMISSED", suspend: false },
    });
    expect(buildResolve({ outcome: "CONFIRMED", note: "" }).ok).toBe(false);
    expect(buildResolve({ outcome: "SUSPEND", note: " Fake clicks " })).toEqual({
      ok: true,
      body: { status: "CONFIRMED", note: "Fake clicks", suspend: true },
    });
  });
});

describe("payout batches", () => {
  const owner = ["*"];
  const admin = ["affiliates.read", "affiliates.payouts.prepare"];
  const viewer = ["affiliates.read"];

  it("offers approval to the Owner only, explaining why otherwise", () => {
    expect(batchActions("DRAFT", owner).approve).toEqual({ allowed: true, reason: null });
    expect(batchActions("DRAFT", admin).approve).toMatchObject({ allowed: false });
    expect(batchActions("DRAFT", admin).approve?.reason).toMatch(/Owner/);
    expect(batchActions("APPROVED", owner).approve).toBeNull();
  });

  it("follows the payout state machine", () => {
    expect(batchActions("DRAFT", owner).markPaid).toBeNull();
    expect(batchActions("APPROVED", owner).markPaid?.allowed).toBe(true);
    expect(batchActions("PROCESSING", owner).cancel).toBeNull();
    expect(batchActions("APPROVED", admin).cancel?.allowed).toBe(true);
    expect(batchActions("PAID", owner)).toMatchObject({ approve: null, markPaid: null, cancel: null });
    expect(batchActions("PAID", viewer).export?.allowed).toBe(false);
    expect(batchActions("DRAFT", undefined).approve?.allowed).toBe(false);
  });

  it("collects references, skipping empty ones", () => {
    expect(buildReferences({ a: " TX1 ", b: "" }, ["a", "b"])).toEqual({ ok: true, references: { a: "TX1" } });
    expect(buildReferences({}, ["a"]).ok).toBe(false);
    expect(buildReferences({ a: "x".repeat(201) }, ["a"]).ok).toBe(false);
    expect(buildReferences({ z: "TX" }, ["a"]).ok).toBe(false);
  });

  it("shows masked payout methods and staff", () => {
    expect(
      payoutMethodText({
        method: "mobile_wallet",
        payoutMethod: { type: "mobile_wallet", label: "bKash", masked: "•••• 5678" },
      }),
    ).toBe("bKash •••• 5678");
    expect(payoutMethodText({ method: "manual", payoutMethod: null })).toBe("No payout method on file");
    expect(payoutMethodText({ method: "bank", payoutMethod: null })).toBe("Bank transfer");
    expect(staffLabel("me", "me")).toBe("You");
    expect(staffLabel("clxyz1234567890", "me")).toBe("Staff …567890");
    expect(staffLabel(null, "me")).toBe("—");
  });
});

describe("marketing assets", () => {
  const base = {
    title: "Spring banner",
    kind: "banner" as const,
    mediaId: "m1",
    body: "",
    productId: "",
    isActive: true,
  };

  it("needs media for banners and text for copy", () => {
    expect(buildAsset(base)).toEqual({
      ok: true,
      body: { title: "Spring banner", kind: "banner", mediaId: "m1", body: null, productId: null, isActive: true },
    });
    expect(buildAsset({ ...base, mediaId: "" })).toMatchObject({ ok: false, errors: { mediaId: expect.any(String) } });
    expect(buildAsset({ ...base, kind: "copy", mediaId: "" })).toMatchObject({
      ok: false,
      errors: { body: expect.any(String) },
    });
    expect(buildAsset({ ...base, title: " " })).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
  });

  it("formats rates", () => {
    expect(percent(0)).toBe("0%");
    expect(percent(0.025)).toBe("2.5%");
    expect(percent(0.5)).toBe("50%");
  });
});
