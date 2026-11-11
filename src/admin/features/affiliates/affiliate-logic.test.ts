import { describe, expect, it } from "vitest";
import {
  buildAdjustment,
  buildRule,
  buildTier,
  composeScopeId,
  describeRule,
  fieldLabel,
  fieldValue,
  linkActions,
  parsePercent,
  payoutActions,
  splitScopeId,
  statusAction,
  statusActions,
  validateReason,
  validateReference,
  type RuleForm,
} from "./affiliate-logic";

describe("affiliate status actions", () => {
  it("follow the API's state machine", () => {
    expect(statusActions("PENDING").map((a) => a.key)).toEqual(["approve", "reject"]);
    expect(statusActions("ACTIVE").map((a) => a.key)).toEqual(["suspend", "close"]);
    expect(statusActions("SUSPENDED").map((a) => [a.key, a.to])).toEqual([["reactivate", "ACTIVE"]]);
    expect(statusActions("REJECTED")).toEqual([]);
    expect(statusActions("CLOSED")).toEqual([]);
  });

  it("require a reason where the affiliate loses something", () => {
    expect(validateReason(statusAction("reject"), "  ")).toMatch(/reason/);
    expect(validateReason(statusAction("reject"), "Spam site")).toBeNull();
    expect(validateReason(statusAction("approve"), "")).toBeNull();
    expect(validateReason(statusAction("approve"), "x".repeat(501))).toMatch(/500/);
  });
});

describe("referral codes", () => {
  it("offer approve/disable for vanity codes and toggles otherwise", () => {
    expect(linkActions("PENDING_APPROVAL")).toEqual(["ACTIVE", "DISABLED"]);
    expect(linkActions("ACTIVE")).toEqual(["DISABLED"]);
    expect(linkActions("DISABLED")).toEqual(["ACTIVE"]);
  });
});

describe("payout actions", () => {
  it("only offer valid moves", () => {
    expect(payoutActions("DRAFT")).toEqual(["approve", "cancel"]);
    expect(payoutActions("APPROVED")).toEqual(["markPaid", "cancel"]);
    expect(payoutActions("FAILED")).toEqual(["cancel"]);
    expect(payoutActions("PROCESSING")).toEqual([]);
    expect(payoutActions("PAID")).toEqual([]);
    expect(payoutActions("CANCELLED")).toEqual([]);
  });

  it("respect permissions", () => {
    const prepareOnly = (p: string) => p === "affiliates.payouts.prepare";
    expect(payoutActions("DRAFT", prepareOnly)).toEqual(["cancel"]);
    expect(payoutActions("APPROVED", prepareOnly)).toEqual(["cancel"]);
  });

  it("need a reference to mark paid", () => {
    expect(validateReference(" ")).toMatch(/reference/);
    expect(validateReference("BKASH-123")).toBeNull();
  });
});

describe("adjustments", () => {
  const base = { direction: "add" as const, amount: "150.50", reason: "Launch week", currency: "BDT" };

  it("sign the amount by kind and label the reason", () => {
    expect(buildAdjustment({ ...base, kind: "bonus" })).toEqual({
      ok: true,
      body: { amountMinor: 15050, currency: "BDT", reason: "Bonus: Launch week" },
    });
    const penalty = buildAdjustment({ ...base, kind: "penalty", direction: "add" });
    expect(penalty.ok && penalty.body.amountMinor).toBe(-15050);
    const correction = buildAdjustment({ ...base, kind: "correction", direction: "deduct" });
    expect(correction.ok && correction.body).toMatchObject({ amountMinor: -15050, reason: "Correction: Launch week" });
  });

  it("reject zero, malformed amounts and short reasons", () => {
    expect(buildAdjustment({ ...base, kind: "bonus", amount: "0" })).toMatchObject({ ok: false });
    expect(buildAdjustment({ ...base, kind: "bonus", amount: "-5" })).toMatchObject({ ok: false });
    expect(buildAdjustment({ ...base, kind: "bonus", amount: "1.234" })).toMatchObject({ ok: false });
    const short = buildAdjustment({ ...base, kind: "bonus", reason: "x" });
    expect(!short.ok && short.errors.reason).toBeTruthy();
  });
});

describe("commission rules", () => {
  const form = (over: Partial<RuleForm> = {}): RuleForm => ({
    scope: "program",
    parts: { targetId: "", affiliateId: "", productId: "" },
    type: "percent",
    percent: "10",
    amount: "",
    tiers: [],
    appliesTo: "all",
    priority: "",
    isActive: true,
    activeFrom: "",
    activeTo: "",
    currency: "BDT",
    ...over,
  });

  it("compose and split scope IDs like the API stores them", () => {
    const parts = { targetId: " cat1 ", affiliateId: "aff1", productId: "prod1" };
    expect(composeScopeId("program", parts)).toBe("");
    expect(composeScopeId("category", parts)).toBe("cat1");
    expect(composeScopeId("affiliate_product", parts)).toBe("aff1:prod1");
    expect(splitScopeId("affiliate_product", "aff1:prod1")).toMatchObject({ affiliateId: "aff1", productId: "prod1" });
    expect(splitScopeId("tier", "t1").targetId).toBe("t1");
    expect(splitScopeId("program", "").targetId).toBe("");
  });

  it("parse percents strictly", () => {
    expect(parsePercent("12.5")).toBe(12.5);
    expect(parsePercent("100")).toBe(100);
    expect(parsePercent("101")).toBeNaN();
    expect(parsePercent("-1")).toBeNaN();
    expect(parsePercent("abc")).toBeNaN();
  });

  it("build a program percent rule", () => {
    expect(buildRule(form())).toEqual({
      ok: true,
      body: {
        scope: "program",
        scopeId: "",
        rule: { type: "percent", appliesTo: "all", percent: 10 },
        priority: 0,
        isActive: true,
        activeFrom: null,
        activeTo: null,
      },
    });
  });

  it("build fixed and tiered rules in minor units", () => {
    const fixed = buildRule(
      form({
        scope: "product",
        parts: { targetId: "p1", affiliateId: "", productId: "" },
        type: "fixed_per_item",
        amount: "50",
      }),
    );
    expect(fixed.ok && fixed.body).toMatchObject({
      scopeId: "p1",
      rule: { type: "fixed_per_item", amountMinor: 5000 },
    });
    const tiered = buildRule(
      form({
        type: "tiered",
        tiers: [
          { minSales: "0", percent: "5" },
          { minSales: "10000", percent: "8" },
        ],
      }),
    );
    expect(tiered.ok && tiered.body.rule.tiers).toEqual([
      { minSalesMinor: 0, percent: 5 },
      { minSalesMinor: 1000000, percent: 8 },
    ]);
  });

  it("flag missing targets, bad values and reversed dates", () => {
    const r = buildRule(
      form({
        scope: "tier",
        type: "percent",
        percent: "200",
        priority: "1.5",
        activeFrom: "2026-05-02",
        activeTo: "2026-05-01",
      }),
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["activeTo", "percent", "priority", "targetId"]);
    const ap = buildRule(form({ scope: "affiliate_product" }));
    expect(!ap.ok && Object.keys(ap.errors).sort()).toEqual(["affiliateId", "productId"]);
  });

  it("describe rules in plain English", () => {
    expect(describeRule({ type: "percent", percent: 10, appliesTo: "all" }, "BDT")).toBe("10% of the sale");
    expect(describeRule({ type: "fixed_per_order", amountMinor: 5000, appliesTo: "first_order" }, "USD")).toBe(
      "$50.00 per order (first orders only)",
    );
    expect(
      describeRule(
        {
          type: "tiered",
          tiers: [
            { minSalesMinor: 100000, percent: 8 },
            { minSalesMinor: 0, percent: 5 },
          ],
        },
        "USD",
      ),
    ).toBe("5% from $0.00, 8% from $1,000.00");
  });
});

describe("tiers", () => {
  const base = {
    handle: "partner",
    name: "Partner",
    rewardType: "CASH" as const,
    autoApprove: false,
    isDefault: false,
    position: "",
    minSales: "",
    currency: "BDT",
  };

  it("build the API body", () => {
    expect(buildTier({ ...base, minSales: "5000" })).toEqual({
      ok: true,
      body: {
        handle: "partner",
        name: "Partner",
        rewardType: "CASH",
        autoApprove: false,
        isDefault: false,
        position: 0,
        minSalesMinor: 500000,
      },
    });
    expect(buildTier(base)).toMatchObject({ ok: true, body: { minSalesMinor: null } });
  });

  it("validate handle, name and amounts", () => {
    const r = buildTier({ ...base, handle: "Bad Handle", name: " ", minSales: "abc" });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["handle", "minSales", "name"]);
  });
});

describe("application answers", () => {
  it("label keys and format values", () => {
    expect(fieldLabel("audience_size")).toBe("Audience size");
    expect(fieldLabel("promotionMethods")).toBe("Promotion methods");
    expect(fieldValue(true)).toBe("Yes");
    expect(fieldValue(["a", "b"])).toBe("a, b");
    expect(fieldValue(null)).toBe("—");
    expect(fieldValue(1200)).toBe("1200");
  });
});
