import { describe, expect, it } from "vitest";
import {
  blankForm,
  blankSimForm,
  formFromPromotion,
  hasErrors,
  lineBreakdown,
  parseCodes,
  parseInteger,
  reasonInfo,
  statusTransitions,
  toCreateBody,
  toSimulateBody,
  toUpdateBody,
  validateForm,
  validateGenerate,
  validateSim,
  type Promotion,
  type Simulation,
} from "./promotion-form";

const stored: Promotion = {
  id: "p1",
  name: "Summer",
  description: null,
  type: "CODE",
  status: "ACTIVE",
  effectiveStatus: "SCHEDULED",
  priority: 5,
  stopFurther: true,
  exclusivityGroup: "seasonal",
  combinesWithSalePrices: false,
  conditions: { type: "subtotal", min: 50000 },
  actions: [{ type: "percent_off", percent: 20, target: "order", filter: {} }],
  startsAt: null,
  endsAt: null,
  usageLimit: 100,
  usageCount: 3,
  perCustomerLimit: null,
  maxDiscountMinor: 150050,
  version: 4,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  _count: { codes: 2, redemptions: 3 },
};

describe("promotion form", () => {
  it("parses integers strictly", () => {
    expect(parseInteger("")).toBeNull();
    expect(parseInteger(" 12 ")).toBe(12);
    expect(parseInteger("1.5")).toBeNaN();
    expect(parseInteger("-3")).toBeNaN();
    expect(parseInteger("-3", { signed: true })).toBe(-3);
  });

  it("round-trips a stored promotion into the update payload", () => {
    const form = formFromPromotion(stored, "BDT");
    expect(form.maxDiscount).toBe("1500.50");
    expect(form.conditions).toEqual({ type: "all", conditions: [{ type: "subtotal", min: 50000 }] });
    expect(hasErrors(validateForm(form, "BDT"))).toBe(false);
    const body = toUpdateBody(form, "BDT", stored.version);
    expect(body).toMatchObject({
      name: "Summer",
      description: null,
      priority: 5,
      stopFurther: true,
      exclusivityGroup: "seasonal",
      combinesWithSalePrices: false,
      usageLimit: 100,
      perCustomerLimit: null,
      maxDiscountMinor: 150050,
      startsAt: null,
      version: 4,
    });
    expect(body).not.toHaveProperty("type");
  });

  it("flags bad fields", () => {
    const form = {
      ...blankForm(),
      priority: "x",
      usageLimit: "0",
      maxDiscount: "1.234",
      startsAt: "2026-05-02T10:00",
      endsAt: "2026-05-01T10:00",
      actions: [],
    };
    const errors = validateForm(form, "BDT");
    expect(Object.keys(errors.fields).sort()).toEqual(["endsAt", "maxDiscount", "name", "priority", "usageLimit"]);
    expect(errors.actions._form).toBeDefined();
  });

  it("creates with the type and nulls for empty limits", () => {
    const body = toCreateBody({ ...blankForm("CODE"), name: " Ten off " }, "BDT");
    expect(body).toMatchObject({
      name: "Ten off",
      type: "CODE",
      conditions: {},
      usageLimit: null,
      maxDiscountMinor: null,
      exclusivityGroup: null,
    });
  });

  it("offers the status changes the API allows", () => {
    expect(statusTransitions("DRAFT")).toEqual(["ACTIVE", "ARCHIVED"]);
    expect(statusTransitions("ACTIVE")).toEqual(["DRAFT", "ARCHIVED"]);
    expect(statusTransitions("ARCHIVED")).toEqual([]);
  });
});

describe("codes", () => {
  it("splits, upper-cases and dedupes a pasted list, separating invalid codes", () => {
    expect(parseCodes("save10\nSAVE10, vip-2026  x\nab space!")).toEqual({
      codes: ["SAVE10", "VIP-2026"],
      invalid: ["X", "AB", "SPACE!"],
    });
  });

  it("validates the generator", () => {
    expect(validateGenerate({ count: "50", prefix: "SUM-", length: "8", usageLimit: "" })).toEqual({});
    expect(
      Object.keys(validateGenerate({ count: "0", prefix: "bad prefix", length: "4", usageLimit: "-1" })).sort(),
    ).toEqual(["count", "length", "prefix", "usageLimit"]);
  });
});

describe("simulator", () => {
  const form = {
    ...blankSimForm(),
    lines: [
      { variantId: "v1", label: "Tee / M", quantity: "2", unitPrice: "500", compareAt: "" },
      { variantId: "v2", label: "Cap", quantity: "1", unitPrice: "250.50", compareAt: "300" },
    ],
    codes: "save10 vip",
    country: "bd",
    shipping: "60",
  };

  it("validates the sample cart", () => {
    expect(validateSim(form, "BDT")).toEqual({});
    expect(validateSim(blankSimForm(), "BDT")._form).toBeDefined();
    expect(
      validateSim({ ...form, lines: [{ ...form.lines[0]!, quantity: "0" }], country: "BGD" }, "BDT"),
    ).toMatchObject({ "0": expect.any(String), country: expect.any(String) });
  });

  it("builds the request in minor units", () => {
    expect(toSimulateBody(form, "BDT", ["p1"])).toEqual({
      currency: "BDT",
      lines: [
        { variantId: "v1", quantity: 2, unitPriceMinor: 50000, compareAtMinor: null },
        { variantId: "v2", quantity: 1, unitPriceMinor: 25050, compareAtMinor: 30000 },
      ],
      codes: ["SAVE10", "VIP"],
      customerId: null,
      country: "BD",
      shippingRateId: null,
      shippingMinor: 6000,
      promotionIds: ["p1"],
    });
    expect(toSimulateBody(form, "BDT")).not.toHaveProperty("promotionIds");
  });

  it("breaks the result down per line with promotion names", () => {
    const result: Simulation = {
      lines: [
        { key: "line-0", discountMinor: 10000, allocations: [{ promotionId: "p1", amountMinor: 10000 }] },
        { key: "line-1", discountMinor: 0, allocations: [] },
      ],
      itemsDiscountMinor: 10000,
      shippingDiscountMinor: 0,
      totalDiscountMinor: 10000,
      applied: [
        {
          promotionId: "p1",
          name: "Summer",
          code: null,
          codeId: null,
          itemsMinor: 10000,
          shippingMinor: 0,
          amountMinor: 10000,
        },
      ],
      rejected: [],
      codes: [],
    };
    const [first, second] = lineBreakdown(result, form.lines, "BDT");
    expect(first).toMatchObject({ label: "Tee / M", totalMinor: 100000, discountMinor: 10000, afterMinor: 90000 });
    expect(first!.allocations).toEqual([{ promotionId: "p1", amountMinor: 10000, name: "Summer" }]);
    expect(second).toMatchObject({ totalMinor: 25050, discountMinor: 0 });
  });

  it("explains reasons, including unknown ones", () => {
    expect(reasonInfo("NOT_FOUND").label).toBe("Code not found");
    expect(reasonInfo("SOMETHING_NEW")).toEqual({ label: "SOMETHING_NEW", help: "" });
  });
});
