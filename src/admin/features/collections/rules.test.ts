import { describe, expect, it } from "vitest";
import { normalizeRules, summarizeRules, toRulesInput, validateRules } from "./rules";

describe("collection rules", () => {
  it("normalizes what the database holds", () => {
    expect(normalizeRules({})).toEqual({ match: "all", conditions: [] });
    expect(normalizeRules(null)).toEqual({ match: "all", conditions: [] });
    expect(
      normalizeRules({
        match: "any",
        conditions: [
          { field: "vendor", op: "contains", value: "Acme" },
          { field: "price" },
          { field: "tag", op: "??", value: 5 },
        ],
      }),
    ).toEqual({
      match: "any",
      conditions: [
        { field: "vendor", op: "contains", value: "Acme" },
        { field: "tag", op: "eq", value: "5" },
      ],
    });
  });

  it("validates and summarizes", () => {
    expect(validateRules({ match: "all", conditions: [] })).toEqual({ _form: "Add at least one condition" });
    expect(
      validateRules({
        match: "all",
        conditions: [
          { field: "tag", op: "eq", value: " " },
          { field: "attribute", op: "eq", value: "red" },
          { field: "product_type", op: "contains", value: "tee" },
        ],
      }),
    ).toEqual({ 0: "Enter a value", 1: "Choose an attribute", 2: "Use “is” or “is not” for this field" });
    expect(summarizeRules({ match: "all", conditions: [{ field: "tag", op: "eq", value: "sale" }] })).toBe(
      "Products whose tag is “sale”",
    );
    expect(
      summarizeRules({
        match: "any",
        conditions: [
          { field: "vendor", op: "contains", value: "Acme" },
          { field: "attribute", op: "neq", value: "red", attribute: "color" },
        ],
      }),
    ).toBe("Any of: vendor contains “Acme” · color is not “red”");
  });

  it("sends trimmed conditions with the attribute only where it applies", () => {
    expect(
      toRulesInput({
        match: "all",
        conditions: [
          { field: "tag", op: "eq", value: " sale ", attribute: "stale" },
          { field: "attribute", op: "eq", value: "red", attribute: "color" },
        ],
      }),
    ).toEqual({
      match: "all",
      conditions: [
        { field: "tag", op: "eq", value: "sale" },
        { field: "attribute", op: "eq", value: "red", attribute: "color" },
      ],
    });
  });
});
