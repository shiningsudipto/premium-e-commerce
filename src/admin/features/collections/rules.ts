import type { PostV1AdminCollectionsApiArg } from "../../store/api.generated";

// Rule-based collections (spec §5.2): products match when all (or any) conditions hold.
export type CollectionRules = NonNullable<PostV1AdminCollectionsApiArg["body"]["rules"]>;
export type RuleCondition = NonNullable<CollectionRules["conditions"]>[number];
export type Rules = { match: "all" | "any"; conditions: RuleCondition[] };

export const RULE_FIELDS: { value: RuleCondition["field"]; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "vendor", label: "Vendor" },
  { value: "product_type", label: "Product type" },
  { value: "title", label: "Title" },
  { value: "attribute", label: "Attribute" },
];

export const RULE_OPS: { value: RuleCondition["op"]; label: string }[] = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
  { value: "contains", label: "contains" },
];

// The API matches product types and attributes exactly; "contains" only applies to text fields.
export const opsFor = (field: RuleCondition["field"]) =>
  field === "product_type" || field === "attribute" ? RULE_OPS.filter((o) => o.value !== "contains") : RULE_OPS;

export const blankCondition = (): RuleCondition => ({ field: "tag", op: "eq", value: "" });

// Whatever the database holds ({} for manual collections, or older shapes) as a complete rule set.
export function normalizeRules(raw: unknown): Rules {
  const value = (raw && typeof raw === "object" ? raw : {}) as { match?: unknown; conditions?: unknown };
  const fields = RULE_FIELDS.map((f) => f.value as string);
  const ops = RULE_OPS.map((o) => o.value as string);
  const conditions = Array.isArray(value.conditions)
    ? value.conditions.flatMap((c): RuleCondition[] => {
        if (!c || typeof c !== "object") return [];
        const { field, op, value: v, attribute } = c as Record<string, unknown>;
        if (typeof field !== "string" || !fields.includes(field)) return [];
        return [
          {
            field: field as RuleCondition["field"],
            op: typeof op === "string" && ops.includes(op) ? (op as RuleCondition["op"]) : "eq",
            value: typeof v === "string" ? v : String(v ?? ""),
            ...(typeof attribute === "string" && attribute ? { attribute } : {}),
          },
        ];
      })
    : [];
  return { match: value.match === "any" ? "any" : "all", conditions };
}

// Problems per condition index (and "_form" for the set), mirroring what the API refuses.
export function validateRules(rules: Rules): Record<string, string> {
  const errors: Record<string, string> = {};
  if (rules.conditions.length === 0) errors._form = "Add at least one condition";
  if (rules.conditions.length > 20) errors._form = "At most 20 conditions";
  rules.conditions.forEach((c, i) => {
    if (!c.value.trim()) errors[i] = "Enter a value";
    else if (c.field === "attribute" && !c.attribute) errors[i] = "Choose an attribute";
    else if (c.op === "contains" && (c.field === "product_type" || c.field === "attribute"))
      errors[i] = "Use “is” or “is not” for this field";
  });
  return errors;
}

// What is sent: trimmed values, attribute only where it means something.
export function toRulesInput(rules: Rules): CollectionRules {
  return {
    match: rules.match,
    conditions: rules.conditions.map((c) => ({
      field: c.field,
      op: c.op,
      value: c.value.trim(),
      ...(c.field === "attribute" && c.attribute ? { attribute: c.attribute } : {}),
    })),
  };
}

export function summarizeRules(rules: Rules): string {
  if (rules.conditions.length === 0) return "No conditions";
  const label = (c: RuleCondition) => {
    const field =
      c.field === "attribute"
        ? (c.attribute ?? "attribute")
        : RULE_FIELDS.find((f) => f.value === c.field)!.label.toLowerCase();
    const op = RULE_OPS.find((o) => o.value === c.op)!.label;
    return `${field} ${op} “${c.value}”`;
  };
  const parts = rules.conditions.map(label);
  return parts.length === 1
    ? `Products whose ${parts[0]}`
    : `${rules.match === "all" ? "All of" : "Any of"}: ${parts.join(" · ")}`;
}
