// The subset of JSON Schema the API emits for settings, block props and adapter config
// (z.toJSONSchema), plus pure helpers for the form generator. The API validates again on save;
// these checks only give earlier, field-level feedback.

export type JsonSchema = {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object" | "null";
  title?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  default?: unknown;
};

export type FieldKind =
  | { kind: "boolean" }
  | { kind: "enum"; options: string[] }
  | { kind: "text"; inputType: "text" | "email" | "url"; multiline: boolean }
  | { kind: "number"; integer: boolean }
  | { kind: "string-list" }
  | { kind: "enum-list"; options: string[] }
  | { kind: "object"; properties: Record<string, JsonSchema>; required: string[] }
  | { kind: "nullable"; inner: JsonSchema }
  | { kind: "json" };

// Larger than this, Zod's "any integer" bound is noise to show to people.
const SAFE_MAX = 2 ** 52;

export function nullableInner(schema: JsonSchema): JsonSchema | null {
  const variants = schema.anyOf ?? schema.oneOf;
  if (!variants || variants.length !== 2) return null;
  const nonNull = variants.filter((v) => v.type !== "null");
  return nonNull.length === 1 ? nonNull[0]! : null;
}

// Which control renders a schema. Anything unrecognized falls back to a JSON editor.
export function fieldKind(schema: JsonSchema, opts: { multilineKeys?: boolean } = {}): FieldKind {
  const inner = nullableInner(schema);
  if (inner) return { kind: "nullable", inner };
  if (schema.enum && schema.enum.every((v) => typeof v === "string"))
    return { kind: "enum", options: schema.enum as string[] };
  switch (schema.type) {
    case "boolean":
      return { kind: "boolean" };
    case "string":
      return {
        kind: "text",
        inputType: schema.format === "email" ? "email" : schema.format === "uri" ? "url" : "text",
        multiline:
          !!opts.multilineKeys || (schema.maxLength === undefined && !schema.format && schema.minLength === undefined),
      };
    case "integer":
    case "number":
      return { kind: "number", integer: schema.type === "integer" };
    case "array":
      if (schema.items?.enum?.every((v) => typeof v === "string"))
        return { kind: "enum-list", options: schema.items.enum as string[] };
      if (schema.items?.type === "string") return { kind: "string-list" };
      return { kind: "json" };
    case "object":
      return schema.properties
        ? { kind: "object", properties: schema.properties, required: schema.required ?? [] }
        : { kind: "json" };
    default:
      return { kind: "json" };
  }
}

export function bounds(schema: JsonSchema): { min?: number; max?: number } {
  const min = schema.minimum ?? (schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum : undefined);
  const max = schema.maximum ?? schema.exclusiveMaximum;
  return { min, max: max !== undefined && Math.abs(max) < SAFE_MAX ? max : undefined };
}

export function describeBounds(schema: JsonSchema): string | null {
  const { min, max } = bounds(schema);
  if (min !== undefined && max !== undefined) return `${min}–${max}`;
  if (min !== undefined) return `at least ${min}`;
  if (max !== undefined) return `at most ${max}`;
  return null;
}

// Errors per path ("" for the value itself, "a.b" for nested fields).
export function validate(schema: JsonSchema, value: unknown, path = ""): Record<string, string> {
  const errors: Record<string, string> = {};
  const fail = (message: string) => (errors[path] = message);
  const inner = nullableInner(schema);
  if (inner) return value === null ? {} : validate(inner, value, path);

  if (schema.enum && !schema.enum.includes(value)) {
    fail("Choose one of the options");
    return errors;
  }
  switch (schema.type) {
    case "boolean":
      if (typeof value !== "boolean") fail("Must be on or off");
      break;
    case "string": {
      if (typeof value !== "string") {
        fail("Must be text");
        break;
      }
      if (schema.minLength !== undefined && value.length < schema.minLength)
        fail(schema.minLength === 1 ? "Required" : `At least ${schema.minLength} characters`);
      else if (schema.maxLength !== undefined && value.length > schema.maxLength)
        fail(`At most ${schema.maxLength} characters`);
      else if (schema.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail("Enter an email address");
      else if (schema.format === "uri" && !URL.canParse(value)) fail("Enter a full URL");
      break;
    }
    case "integer":
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        fail("Enter a number");
        break;
      }
      if (schema.type === "integer" && !Number.isInteger(value)) fail("Enter a whole number");
      const { min, max } = bounds(schema);
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum)
        fail(`Must be more than ${schema.exclusiveMinimum}`);
      else if (min !== undefined && value < min) fail(`Must be ${describeBounds(schema)}`);
      else if (max !== undefined && value > max) fail(`Must be ${describeBounds(schema)}`);
      break;
    }
    case "array": {
      if (!Array.isArray(value)) {
        fail("Must be a list");
        break;
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`At most ${schema.maxItems} items`);
      if (schema.minItems !== undefined && value.length < schema.minItems) fail(`At least ${schema.minItems} items`);
      if (schema.items)
        value.forEach((item, i) =>
          Object.assign(errors, validate(schema.items!, item, `${path}${path ? "." : ""}${i}`)),
        );
      break;
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail("Must be an object");
        break;
      }
      const record = value as Record<string, unknown>;
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        const childPath = `${path}${path ? "." : ""}${key}`;
        if (record[key] === undefined) {
          if (schema.required?.includes(key)) errors[childPath] = "Required";
          continue;
        }
        Object.assign(errors, validate(sub, record[key], childPath));
      }
      break;
    }
  }
  return errors;
}

// A starting value for an empty field of this schema.
export function emptyValue(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  if (nullableInner(schema)) return null;
  if (schema.enum?.length) return schema.enum[0];
  switch (schema.type) {
    case "boolean":
      return false;
    case "string":
      return "";
    case "integer":
    case "number":
      return bounds(schema).min ?? 0;
    case "array":
      return [];
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties ?? {})
          .filter(([key]) => schema.required?.includes(key))
          .map(([key, sub]) => [key, emptyValue(sub)]),
      );
    default:
      return null;
  }
}

// "affiliate.cookie_days" → "Cookie days"; also used for nested property names.
export function humanize(key: string): string {
  const last = key.split(".").pop() ?? key;
  const words = last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
