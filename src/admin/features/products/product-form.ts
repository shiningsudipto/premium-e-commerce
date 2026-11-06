import type { JsonSchema } from "../../components/json-schema-form/schema";
import type {
  GetV1AdminCustomFieldsApiResponse,
  GetV1AdminProductsIdApiResponse,
  PostV1AdminProductsApiArg,
} from "../../store/api.generated";

// Pure helpers for the product editor, kept apart from the screen so they can be tested.

type CustomFieldDefinition = GetV1AdminCustomFieldsApiResponse[number];
export type ProductOption = NonNullable<PostV1AdminProductsApiArg["body"]["options"]>[number];
export type Seo = NonNullable<PostV1AdminProductsApiArg["body"]["seo"]>;

// JSON Schema for a custom field definition, matching how the API validates it
// (custom-fields.service fieldSchema): optional fields may also be empty (null).
export function customFieldSchema(def: Pick<CustomFieldDefinition, "type" | "options" | "required">): JsonSchema {
  const choices = Array.isArray(def.options)
    ? (def.options as { value: unknown }[]).map((o) => String(o.value)).filter(Boolean)
    : [];
  let schema: JsonSchema;
  switch (def.type) {
    case "number":
      schema = { type: "number" };
      break;
    case "boolean":
      // a switch is always on or off, so it never needs an empty state
      return { type: "boolean" };
    case "select":
      schema = choices.length ? { type: "string", enum: choices } : { type: "string", maxLength: 10_000 };
      break;
    case "multi_select":
      // an empty list is a valid "nothing chosen"
      return { type: "array", items: choices.length ? { type: "string", enum: choices } : { type: "string" } };
    case "date":
      schema = { type: "string", format: "date", minLength: 10, maxLength: 10, description: "YYYY-MM-DD" };
      break;
    case "url":
      schema = { type: "string", format: "uri", minLength: 1 };
      break;
    case "json":
      return {};
    default:
      schema = { type: "string", maxLength: 10_000 };
  }
  return def.required ? schema : { anyOf: [schema, { type: "null" }] };
}

// Product statuses as staff read them: ACTIVE with a future publishAt is waiting to go live.
export type PublishState = "draft" | "scheduled" | "active" | "archived";

export function publishState(
  p: { status: "DRAFT" | "ACTIVE" | "ARCHIVED"; publishAt: string | null },
  now = new Date(),
): PublishState {
  if (p.status === "ARCHIVED") return "archived";
  if (p.status === "DRAFT") return "draft";
  return p.publishAt && new Date(p.publishAt) > now ? "scheduled" : "active";
}

export const PUBLISH_LABEL: Record<PublishState, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  archived: "Archived",
};

// Moves one item of a list (reordering media, collection products, …).
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

// "a, b ,, c" → ["a", "b", "c"], without duplicates.
export function splitList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

// <input type="datetime-local"> works in local time without a zone; the API takes ISO instants.
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Options as stored ([{ name, values }]); anything else reads as none.
export function readOptions(raw: unknown): ProductOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o): ProductOption[] =>
    o &&
    typeof o === "object" &&
    typeof (o as ProductOption).name === "string" &&
    Array.isArray((o as ProductOption).values)
      ? [{ name: (o as ProductOption).name, values: (o as ProductOption).values.map(String) }]
      : [],
  );
}

// Only filled-in SEO fields are sent, so an empty form doesn't store empty strings.
export function cleanSeo(seo: Seo): Seo {
  const out: Seo = {};
  for (const key of ["title", "description", "canonical", "ogImage"] as const) {
    const v = seo[key]?.trim();
    if (v) out[key] = v;
  }
  if (seo.noindex) out.noindex = true;
  return out;
}

export function readSeo(raw: unknown): Seo {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : undefined);
  return {
    title: text("title"),
    description: text("description"),
    canonical: text("canonical"),
    ogImage: text("ogImage"),
    noindex: s.noindex === true,
  };
}

// Variant option values as a short label ("Red / M").
export function optionLabel(values: unknown): string {
  if (!values || typeof values !== "object") return "";
  return Object.values(values as Record<string, unknown>)
    .map(String)
    .join(" / ");
}

// Number of variants the options describe, for the "generate variants" hint.
export const combinationCount = (options: ProductOption[]) =>
  options.length ? options.reduce((n, o) => n * Math.max(o.values.length, 1), 1) : 0;

export type Product = GetV1AdminProductsIdApiResponse;
type Variant = Product["variants"][number];

// A variant's single-unit price in one price list (tiers with minQty > 1 are kept as they are).
export function basePrice(variant: Pick<Variant, "prices">, priceListId: string | undefined) {
  return variant.prices.find((p) => p.priceListId === priceListId && p.minQty === 1) ?? null;
}

// A URL handle from a name ("Men's Shirts" → "men-s-shirts"), as the API accepts them.
export const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
