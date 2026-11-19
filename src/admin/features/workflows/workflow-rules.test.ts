import { describe, expect, it } from "vitest";
import {
  blankAction,
  blankForm,
  buildTestData,
  conditionsPayload,
  formFromRule,
  moveItem,
  planActions,
  runStatus,
  setActionType,
  setConditionField,
  setConditionKind,
  summarizeConditions,
  toBody,
  triggerLabel,
  validateForm,
  type Rule,
  type RuleForm,
} from "./workflow-rules";

const TRIGGERS = ["order.placed", "affiliate.fraud_flagged"];

const rule: Rule = {
  id: "r1",
  name: "Big orders",
  trigger: "order.placed",
  conditions: {
    match: "any",
    conditions: [
      { field: "order.totalMinor", op: "gte", value: 100000 },
      { field: "order.shippingCountry", op: "in", value: ["BD", "IN"] },
      { field: "customer.tags", op: "exists", value: false },
    ],
  },
  actions: [
    { type: "tag_order", tag: "big" },
    { type: "notify", to: ["a@x.com", "b@x.com"], subject: "Big {{order.number}}", message: "Look" },
  ],
  isActive: false,
  version: 3,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("rule form round trip", () => {
  it("reads a rule into drafts and writes the same body back", () => {
    const form = formFromRule(rule);
    expect(form.match).toBe("any");
    expect(form.conditions[0]).toEqual({ field: "order.totalMinor", kind: "number", op: "gte", value: "100000" });
    expect(form.conditions[1]!.value).toBe("BD, IN");
    expect(form.conditions[2]!.value).toBe("false");
    expect(form.actions[1]!.values.to).toBe("a@x.com, b@x.com");
    expect(toBody(form)).toEqual({
      name: "Big orders",
      trigger: "order.placed",
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: false,
    });
  });

  it("sends {} for a rule without conditions and always sends isActive", () => {
    const body = toBody({
      ...blankForm("order.placed"),
      name: "x",
      actions: [{ type: "tag_order", values: { tag: "t" } }],
    });
    expect(body.conditions).toEqual({});
    expect(body.isActive).toBe(true);
  });

  it("types values by kind: numbers for number facts, lists split on commas", () => {
    expect(
      conditionsPayload({
        match: "all",
        conditions: [
          { field: "order.itemCount", kind: "number", op: "in", value: "1, 2,3" },
          { field: "event.flag", kind: "boolean", op: "eq", value: "true" },
          { field: "order.status", kind: "string", op: "eq", value: " PAID " },
        ],
      }),
    ).toEqual({
      match: "all",
      conditions: [
        { field: "order.itemCount", op: "in", value: [1, 2, 3] },
        { field: "event.flag", op: "eq", value: true },
        { field: "order.status", op: "eq", value: "PAID" },
      ],
    });
  });

  it("guesses the kind of custom fields from the stored value", () => {
    const form = formFromRule({
      ...rule,
      conditions: { match: "all", conditions: [{ field: "event.threshold", op: "lt", value: 3 }] },
    });
    expect(form.conditions[0]!.kind).toBe("number");
  });
});

describe("editing helpers", () => {
  it("changing the field keeps a fitting operator and resets one that doesn't fit", () => {
    const c = { field: "order.totalMinor", kind: "number" as const, op: "gte" as const, value: "5" };
    expect(setConditionField(c, "order.itemCount")).toEqual({ ...c, field: "order.itemCount" });
    expect(setConditionField(c, "order.tags")).toEqual({
      field: "order.tags",
      kind: "list",
      op: "contains",
      value: "",
    });
    // unknown paths keep the current kind
    expect(setConditionField(c, "event.amount").kind).toBe("number");
    expect(setConditionKind(c, "boolean")).toMatchObject({ kind: "boolean", op: "eq", value: "" });
  });

  it("changing the action type keeps shared fields", () => {
    const hold = { type: "hold_order" as const, values: { reason: "fraud" } };
    expect(setActionType(hold, "suspend_affiliate")).toEqual({
      type: "suspend_affiliate",
      values: { reason: "fraud" },
    });
    expect(setActionType(hold, "notify").values).toEqual({ to: "", subject: "", message: "" });
  });

  it("moves items within bounds", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});

describe("validation", () => {
  const valid: RuleForm = { ...formFromRule(rule) };

  it("accepts a valid rule", () => {
    expect(validateForm(valid, TRIGGERS)).toEqual({});
  });

  it("flags missing names, unknown triggers, bad conditions and action fields", () => {
    const errors = validateForm(
      {
        ...valid,
        name: " ",
        trigger: "order.unknown",
        conditions: [
          { field: "order.total_minor", kind: "number", op: "gte", value: "1" },
          { field: "order.totalMinor", kind: "number", op: "gte", value: "abc" },
          { field: "order.itemCount", kind: "number", op: "in", value: "1, x" },
          { field: "order.status", kind: "string", op: "exists", value: "true" },
        ],
        actions: [
          { type: "notify", values: { to: "a@x.com, nope", subject: "", message: "m" } },
          { type: "call_webhook", values: { url: "ftp://x" } },
          { type: "tag_order", values: { tag: "x".repeat(51) } },
        ],
      },
      TRIGGERS,
    );
    expect(errors).toMatchObject({
      name: "Name is required",
      trigger: "Not a trigger the API offers",
      "conditions.0": expect.stringContaining("dot path"),
      "conditions.1": "Enter a number",
      "conditions.2": "Every value must be a number",
      "actions.0.to": "Check the addresses",
      "actions.0.subject": "Subject is required",
      "actions.1.url": expect.stringContaining("full URL"),
      "actions.2.tag": "At most 50 characters",
    });
    expect(errors["conditions.3"]).toBeUndefined();
  });

  it("needs at least one action and at most ten", () => {
    expect(validateForm({ ...valid, actions: [] }, TRIGGERS).actions).toBe("Add at least one action");
    const many = Array.from({ length: 11 }, () => ({ ...blankAction(), values: { tag: "t" } }));
    expect(validateForm({ ...valid, actions: many }, TRIGGERS).actions).toBe("At most 10 actions");
  });
});

describe("summaries", () => {
  it("describes conditions and triggers in plain words", () => {
    expect(summarizeConditions(rule.conditions)).toBe(
      "Order total is at least 100000 or Shipping country is one of BD, IN or Customer tags is not set",
    );
    expect(summarizeConditions({})).toBe("Every event");
    expect(triggerLabel("affiliate.fraud_flagged")).toBe("Affiliate fraud flagged");
  });
});

describe("dry run", () => {
  it("builds event data from ids and extra JSON", () => {
    expect(buildTestData({ orderId: " o1 ", customerId: "", affiliateId: "a1", extra: '{"segmentId":"s"}' })).toEqual({
      data: { segmentId: "s", orderId: "o1", affiliateId: "a1" },
    });
    expect(buildTestData({ orderId: "", customerId: "", affiliateId: "", extra: "[1]" })).toEqual({
      error: "Extra data must be a JSON object",
    });
    expect(buildTestData({ orderId: "", customerId: "", affiliateId: "", extra: "{" })).toEqual({
      error: "Extra data isn't valid JSON",
    });
  });

  it("predicts actions that would fail for want of an order, customer or affiliate", () => {
    const plan = planActions(
      [
        { type: "tag_order", tag: "x" },
        { type: "suspend_affiliate", reason: "r" },
        { type: "call_webhook", url: "https://x.io" },
      ],
      { order: { id: "o" } },
    );
    expect(plan.map((p) => p.outcome)).toEqual(["run", "fail", "run"]);
    expect(plan[1]!.reason).toBe("the event has no affiliate");
  });
});

describe("run status", () => {
  it("labels runs by match and action outcomes", () => {
    expect(runStatus({ matched: false, result: [] })).toBe("skipped");
    expect(runStatus({ matched: true, result: [{ type: "a", ok: true }] })).toBe("succeeded");
    expect(
      runStatus({
        matched: true,
        result: [
          { type: "a", ok: true },
          { type: "b", ok: false },
        ],
      }),
    ).toBe("partial");
    expect(runStatus({ matched: true, result: [{ type: "b", ok: false, error: "x" }] })).toBe("failed");
  });
});
