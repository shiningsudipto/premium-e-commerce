import { describe, expect, it } from "vitest";
import {
  blankCondition,
  changeField,
  parseCountries,
  summarizeRules,
  toDraft,
  toRules,
  validateDraft,
  type DraftRules,
  type SegmentRules,
} from "./rules";

const stored: SegmentRules = {
  match: "any",
  conditions: [
    { field: "total_spent", op: "gte", value: 150000 },
    { field: "order_count", op: "gt", value: 2 },
    { field: "tag", op: "not_has", value: "wholesale" },
    { field: "group", op: "eq", value: "vip" },
    { field: "accepts_marketing", op: "eq", value: true },
    { field: "country", op: "in", value: ["BD", "IN"] },
    { field: "custom_field", key: "tier", op: "neq", value: 3 },
  ],
};

describe("segment rules", () => {
  it("round-trips stored rules through the draft", () => {
    const draft = toDraft(stored, "BDT");
    expect(draft.conditions[0]).toMatchObject({ field: "total_spent", value: "1500.00" });
    expect(draft.conditions[5].value).toBe("BD, IN");
    expect(draft.conditions[6]).toMatchObject({ key: "tier", value: "3", valueType: "number" });
    expect(validateDraft(draft, "BDT")).toEqual({});
    expect(toRules(draft, "BDT")).toEqual(stored);
  });

  it("defaults match to all", () => {
    expect(toDraft({ conditions: [{ field: "has_account", op: "eq", value: false }] }).match).toBe("all");
  });

  it("starts blank conditions with a sensible operator and value", () => {
    expect(blankCondition()).toMatchObject({ field: "tag", op: "has", value: "" });
    expect(blankCondition("has_account")).toMatchObject({ op: "eq", value: "true" });
    expect(blankCondition("order_count").op).toBe("gte");
  });

  it("keeps the operator when the new field supports it", () => {
    const c = { ...blankCondition("order_count"), op: "lt", value: "3" };
    expect(changeField(c, "last_order_days")).toMatchObject({ field: "last_order_days", op: "lt", value: "" });
    expect(changeField(c, "tag")).toMatchObject({ field: "tag", op: "has" });
  });

  it("validates each condition", () => {
    const draft: DraftRules = {
      match: "all",
      conditions: [
        { ...blankCondition("total_spent"), value: "12.345" },
        { ...blankCondition("order_count"), value: "1.5" },
        blankCondition("tag"),
        blankCondition("group"),
        { ...blankCondition("country"), value: "BD, USA" },
        { ...blankCondition("custom_field"), value: "x" },
        { ...blankCondition("custom_field"), key: "score", valueType: "number", value: "abc" },
        { ...blankCondition("tag"), value: "vip" },
      ],
    };
    const errors = validateDraft(draft, "BDT");
    expect(Object.keys(errors).sort()).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
    expect(validateDraft({ match: "all", conditions: [] })).toEqual({ _form: "Add at least one condition" });
  });

  it("parses country lists and custom value types", () => {
    expect(parseCountries(" bd,in  us ")).toEqual(["BD", "IN", "US"]);
    const rules = toRules({
      match: "all",
      conditions: [
        { ...blankCondition("custom_field"), key: " vip ", valueType: "boolean", value: "false" },
        { ...blankCondition("custom_field"), key: "note", valueType: "text", value: " hi " },
      ],
    });
    expect(rules.conditions).toEqual([
      { field: "custom_field", key: "vip", op: "eq", value: false },
      { field: "custom_field", key: "note", op: "eq", value: " hi " },
    ]);
    expect(() => toRules({ match: "all", conditions: [{ ...blankCondition("total_spent"), value: "x" }] })).toThrow();
  });

  it("summarizes in plain English", () => {
    expect(summarizeRules({ match: "all", conditions: [{ field: "tag", op: "has", value: "vip" }] })).toBe(
      'Customers where tag has "vip"',
    );
    const text = summarizeRules(stored, { currency: "BDT", groupName: (h) => (h === "vip" ? "VIP club" : undefined) });
    expect(text).toMatch(/^Customers who match any of: total spent at least /);
    expect(text).toContain("group is VIP club");
    expect(text).toContain("shipping country is one of BD, IN");
    expect(summarizeRules({ match: "all", conditions: [] })).toBe("No conditions yet.");
  });
});
