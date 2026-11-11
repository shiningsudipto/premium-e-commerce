// Column mapping for product imports: which of the file's columns feeds which import field.
// The API takes { "<file column>": "<field>" }; a file column named exactly like a field is
// read as that field even when it isn't in the mapping.

// handle and sku are needed on every row, title on a product's first row (the API's checks)
export const REQUIRED_FIELDS = ["handle", "title", "sku"] as const;

export const FIELD_LABELS: Record<string, string> = {
  handle: "Handle",
  title: "Title",
  description: "Description",
  vendor: "Vendor",
  tags: "Tags",
  status: "Status",
  option1_name: "Option 1 name",
  option1_value: "Option 1 value",
  option2_name: "Option 2 name",
  option2_value: "Option 2 value",
  option3_name: "Option 3 name",
  option3_value: "Option 3 value",
  sku: "SKU",
  price: "Price",
  compare_at_price: "Compare-at price",
  cost: "Cost",
  weight_grams: "Weight (grams)",
  barcode: "Barcode",
  stock: "Stock",
  categories: "Categories",
};

export const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

// lowercase words joined by underscores: "Variant Compare-At Price" → "variant_compare_at_price"
export const normaliseHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Common names for each field, including Shopify's export headers.
const ALIASES: Record<string, string[]> = {
  handle: ["product_handle", "slug", "url_handle"],
  title: ["name", "product_name", "product_title"],
  description: ["body", "body_html", "product_description", "details"],
  vendor: ["brand", "manufacturer"],
  tags: ["tag", "keywords"],
  status: ["product_status", "state"],
  option1_name: ["option_1_name"],
  option1_value: ["option_1_value"],
  option2_name: ["option_2_name"],
  option2_value: ["option_2_value"],
  option3_name: ["option_3_name"],
  option3_value: ["option_3_value"],
  sku: ["variant_sku", "sku_code", "item_sku"],
  price: ["variant_price", "unit_price", "sale_price"],
  compare_at_price: ["variant_compare_at_price", "compare_price", "compare_at", "msrp", "rrp", "list_price"],
  cost: ["cost_per_item", "unit_cost", "cost_price", "variant_cost"],
  weight_grams: ["variant_grams", "grams", "weight", "weight_g", "weight_in_grams"],
  barcode: ["variant_barcode", "ean", "upc", "gtin"],
  stock: ["variant_inventory_qty", "inventory", "inventory_qty", "quantity", "qty", "on_hand", "stock_quantity"],
  categories: ["category", "collections", "product_category"],
};

export type Mapping = Record<string, string>; // file column → field ("" = not imported)

const exactField = (header: string, fields: readonly string[]) =>
  fields.find((f) => normaliseHeader(f) === normaliseHeader(header));

function matchField(header: string, fields: readonly string[]): string | undefined {
  const key = normaliseHeader(header);
  return exactField(header, fields) ?? fields.find((f) => ALIASES[f]?.includes(key));
}

// Suggests a field for each file column by name. Each field is used once: the first column
// that matches it wins, and exact names win over aliases.
export function autoMap(headers: string[], fields: readonly string[]): Mapping {
  const mapping: Mapping = Object.fromEntries(headers.map((h) => [h, ""]));
  const taken = new Set<string>();
  const exact = headers.filter((h) => exactField(h, fields));
  for (const h of [...exact, ...headers.filter((x) => !exact.includes(x))]) {
    const field = matchField(h, fields);
    if (field && !taken.has(field)) {
      mapping[h] = field;
      taken.add(field);
    }
  }
  return mapping;
}

// A column named exactly like a field is always read as that field by the API.
export const isFixedColumn = (header: string, fields: readonly string[]) => fields.includes(header);

export type MappingIssue = { kind: "missing"; field: string } | { kind: "duplicate"; field: string; columns: string[] };

export function mappingIssues(mapping: Mapping, fields: readonly string[]): MappingIssue[] {
  const byField = new Map<string, string[]>();
  for (const [column, mapped] of Object.entries(mapping)) {
    // what the API will actually read the column as
    const field = mapped || (isFixedColumn(column, fields) ? column : "");
    if (field) byField.set(field, [...(byField.get(field) ?? []), column]);
  }
  const issues: MappingIssue[] = [];
  for (const field of REQUIRED_FIELDS) if (!byField.has(field)) issues.push({ kind: "missing", field });
  for (const [field, columns] of byField) if (columns.length > 1) issues.push({ kind: "duplicate", field, columns });
  return issues;
}

export function describeIssue(issue: MappingIssue): string {
  return issue.kind === "missing"
    ? `Choose a column for ${fieldLabel(issue.field)} (required).`
    : `${fieldLabel(issue.field)} is chosen for more than one column (${issue.columns.join(", ")}).`;
}

// The body's mapping: only columns that are renamed onto a field.
export function mappingForApi(mapping: Mapping): Record<string, string> {
  return Object.fromEntries(Object.entries(mapping).filter(([column, field]) => field && field !== column));
}

// The API numbers rows as in a spreadsheet: the header is row 1, the first data row is row 2.
// In a JSON file that row is the array's first item.
export const rowLabel = (row: number, format: string) => (format === "json" ? `Item ${row - 1}` : `Row ${row}`);
