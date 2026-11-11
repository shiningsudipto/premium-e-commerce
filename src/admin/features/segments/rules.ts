import type { GetV1AdminSegmentsApiResponse, PostV1AdminSegmentsApiArg } from "../../store/api.generated";
import { DEFAULT_CURRENCY, formatMoney, inputToMinor, minorToInput } from "../../lib/money";

// Segment rule builder (spec §6.6). The API stores { match, conditions: [{ field, op, value }] };
// the editor works on a draft where every value is text, so half-typed input survives, and
// converts back (and validates) on save.
export type SegmentRules = PostV1AdminSegmentsApiArg["body"]["rules"];
export type SegmentCondition = SegmentRules["conditions"][number];
export type StoredRules = GetV1AdminSegmentsApiResponse[number]["rules"];
export type SegmentField = SegmentCondition["field"];
export type CustomValueType = "text" | "number" | "boolean";

export type DraftCondition = {
  field: SegmentField;
  op: string;
  // text as typed: amounts in major units, "true"/"false", comma-separated country codes
  value: string;
  // custom_field only
  key: string;
  valueType: CustomValueType;
};
export type DraftRules = { match: "all" | "any"; conditions: DraftCondition[] };

type FieldKind = "money" | "number" | "text" | "group" | "boolean" | "countries" | "custom";
type Op = { value: string; label: string };

const NUMERIC_OPS: Op[] = [
  { value: "gte", label: "at least" },
  { value: "gt", label: "more than" },
  { value: "lte", label: "at most" },
  { value: "lt", label: "less than" },
  { value: "eq", label: "exactly" },
];
const IS_OPS: Op[] = [
  { value: "eq", label: "is" },
  { value: "neq", label: "is not" },
];

export const SEGMENT_FIELDS: { value: SegmentField; label: string; kind: FieldKind; ops: Op[]; unit?: string }[] = [
  { value: "total_spent", label: "Total spent", kind: "money", ops: NUMERIC_OPS },
  { value: "order_count", label: "Number of orders", kind: "number", ops: NUMERIC_OPS, unit: "orders" },
  { value: "last_order_days", label: "Days since last order", kind: "number", ops: NUMERIC_OPS, unit: "days" },
  { value: "created_days", label: "Days since first seen", kind: "number", ops: NUMERIC_OPS, unit: "days" },
  {
    value: "tag",
    label: "Tag",
    kind: "text",
    ops: [
      { value: "has", label: "has" },
      { value: "not_has", label: "doesn't have" },
    ],
  },
  { value: "group", label: "Customer group", kind: "group", ops: IS_OPS },
  { value: "accepts_marketing", label: "Accepts marketing", kind: "boolean", ops: [{ value: "eq", label: "is" }] },
  { value: "has_account", label: "Has an account", kind: "boolean", ops: [{ value: "eq", label: "is" }] },
  {
    value: "country",
    label: "Shipping country",
    kind: "countries",
    ops: [
      { value: "in", label: "is one of" },
      { value: "not_in", label: "is none of" },
    ],
  },
  { value: "custom_field", label: "Custom field", kind: "custom", ops: IS_OPS },
];

export const MAX_CONDITIONS = 30;

export const fieldDef = (field: SegmentField) => SEGMENT_FIELDS.find((f) => f.value === field) ?? SEGMENT_FIELDS[0];

export const blankCondition = (field: SegmentField = "tag"): DraftCondition => ({
  field,
  op: fieldDef(field).ops[0].value,
  value: fieldDef(field).kind === "boolean" ? "true" : "",
  key: "",
  valueType: "text",
});

// Switching field keeps the operator when the new field has it; the value starts over.
export function changeField(condition: DraftCondition, field: SegmentField): DraftCondition {
  const next = blankCondition(field);
  return fieldDef(field).ops.some((o) => o.value === condition.op) ? { ...next, op: condition.op } : next;
}

export const parseCountries = (text: string) =>
  text
    .split(/[\s,]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

// The stored rules as an editable draft.
export function toDraft(rules: StoredRules | SegmentRules, currency = DEFAULT_CURRENCY): DraftRules {
  return {
    match: rules.match ?? "all",
    conditions: rules.conditions.map((c): DraftCondition => {
      const base = { ...blankCondition(c.field), op: c.op };
      switch (c.field) {
        case "total_spent":
          return { ...base, value: minorToInput(c.value, currency) };
        case "order_count":
        case "last_order_days":
        case "created_days":
          return { ...base, value: String(c.value) };
        case "accepts_marketing":
        case "has_account":
          return { ...base, value: String(c.value) };
        case "country":
          return { ...base, value: c.value.join(", ") };
        case "custom_field":
          return {
            ...base,
            key: c.key,
            value: String(c.value),
            valueType: typeof c.value === "number" ? "number" : typeof c.value === "boolean" ? "boolean" : "text",
          };
        default:
          return { ...base, value: c.value };
      }
    }),
  };
}

const isWholeNumber = (text: string) => /^\d+$/.test(text.trim());
const isNumber = (text: string) => text.trim() !== "" && Number.isFinite(Number(text.trim()));

// One message per broken condition (keyed by index), plus "_form" for the rule set as a whole.
export function validateDraft(draft: DraftRules, currency = DEFAULT_CURRENCY): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.conditions.length === 0) errors._form = "Add at least one condition";
  if (draft.conditions.length > MAX_CONDITIONS) errors._form = `Use at most ${MAX_CONDITIONS} conditions`;
  draft.conditions.forEach((c, i) => {
    const def = fieldDef(c.field);
    if (!def.ops.some((o) => o.value === c.op)) errors[i] = "Choose a comparison";
    else if (def.kind === "money") {
      const minor = inputToMinor(c.value, currency);
      if (minor === null || Number.isNaN(minor)) errors[i] = "Enter an amount, like 1500";
    } else if (def.kind === "number") {
      if (!isWholeNumber(c.value)) errors[i] = "Enter a whole number";
    } else if (def.kind === "text" || def.kind === "group") {
      if (!c.value.trim()) errors[i] = def.kind === "group" ? "Choose a group" : "Enter a tag";
    } else if (def.kind === "boolean") {
      if (c.value !== "true" && c.value !== "false") errors[i] = "Choose yes or no";
    } else if (def.kind === "countries") {
      const codes = parseCountries(c.value);
      if (!codes.length) errors[i] = "Enter at least one country code, like BD";
      else if (codes.some((code) => !/^[A-Z]{2}$/.test(code)))
        errors[i] = "Use two-letter country codes, separated by commas";
    } else if (def.kind === "custom") {
      if (!c.key.trim()) errors[i] = "Enter the custom field key";
      else if (c.valueType === "number" && !isNumber(c.value)) errors[i] = "Enter a number";
      else if (c.valueType === "boolean" && c.value !== "true" && c.value !== "false") errors[i] = "Choose yes or no";
    }
  });
  return errors;
}

// The draft as the API's rule JSON. Call validateDraft first; invalid conditions throw.
export function toRules(draft: DraftRules, currency = DEFAULT_CURRENCY): SegmentRules {
  const conditions = draft.conditions.map((c): SegmentCondition => {
    const value = c.value.trim();
    switch (c.field) {
      case "total_spent": {
        const minor = inputToMinor(value, currency);
        if (minor === null || Number.isNaN(minor)) throw new Error(`Invalid amount: ${c.value}`);
        return { field: c.field, op: c.op as "gte", value: minor };
      }
      case "order_count":
      case "last_order_days":
      case "created_days":
        return { field: c.field, op: c.op as "gte", value: Number(value) };
      case "tag":
        return { field: "tag", op: c.op as "has", value };
      case "group":
        return { field: "group", op: c.op as "eq", value };
      case "accepts_marketing":
      case "has_account":
        return { field: c.field, op: "eq", value: value === "true" };
      case "country":
        return { field: "country", op: c.op as "in", value: parseCountries(value) };
      case "custom_field":
        return {
          field: "custom_field",
          key: c.key.trim(),
          op: c.op as "eq",
          value: c.valueType === "number" ? Number(value) : c.valueType === "boolean" ? value === "true" : c.value,
        };
    }
  });
  return { match: draft.match, conditions };
}

// "Customers who match all of: total spent at least ৳1,500.00; tag has vip"
export function summarizeRules(
  rules: StoredRules | SegmentRules,
  options: { currency?: string; groupName?: (handle: string) => string | undefined } = {},
): string {
  const currency = options.currency ?? DEFAULT_CURRENCY;
  if (!rules.conditions.length) return "No conditions yet.";
  const parts = rules.conditions.map((c) => {
    const def = fieldDef(c.field);
    const op = def.ops.find((o) => o.value === c.op)?.label ?? c.op;
    switch (c.field) {
      case "total_spent":
        return `${def.label.toLowerCase()} ${op} ${formatMoney(c.value, currency)}`;
      case "order_count":
      case "last_order_days":
      case "created_days":
        return `${def.label.toLowerCase()} ${op} ${c.value}`;
      case "accepts_marketing":
      case "has_account":
        return `${def.label.toLowerCase()}: ${c.value ? "yes" : "no"}`;
      case "country":
        return `${def.label.toLowerCase()} ${op} ${c.value.join(", ")}`;
      case "group":
        return `group ${op} ${options.groupName?.(c.value) ?? c.value}`;
      case "custom_field":
        return `custom field "${c.key}" ${op} ${String(c.value)}`;
      default:
        return `${def.label.toLowerCase()} ${op} "${c.value}"`;
    }
  });
  const joiner = (rules.match ?? "all") === "all" ? "all" : "any";
  return parts.length === 1 ? `Customers where ${parts[0]}` : `Customers who match ${joiner} of: ${parts.join("; ")}`;
}
