import { describe, expect, it } from "vitest";
import { detectFormat, parseCsv, summariseFile, tableToCsv, toCsv } from "./csv";
import { errorsCsv, isFinished, jobOutcome, pollingInterval, POLL_MS, type DataJob } from "./jobs";
import { autoMap, mappingForApi, mappingIssues, normaliseHeader, rowLabel } from "./mapping";

const FIELDS = [
  "handle",
  "title",
  "description",
  "vendor",
  "tags",
  "status",
  "option1_name",
  "option1_value",
  "option2_name",
  "option2_value",
  "option3_name",
  "option3_value",
  "sku",
  "price",
  "compare_at_price",
  "cost",
  "weight_grams",
  "barcode",
  "stock",
  "categories",
];

describe("CSV parsing", () => {
  it("reads quoted fields with commas, doubled quotes and line breaks", () => {
    const text = '﻿handle,title,description\r\nshirt,"Shirt, linen","Say ""hi""\nsecond line"\r\n\r\npants,Pants,\n';
    expect(parseCsv(text)).toEqual([
      ["handle", "title", "description"],
      ["shirt", "Shirt, linen", 'Say "hi"\nsecond line'],
      ["pants", "Pants", ""],
    ]);
  });

  it("handles a last row without a newline and skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("CSV writing", () => {
  it("quotes what needs quoting and round-trips through the parser", () => {
    const rows = [
      ["a", "b"],
      ['x, "y"', "line\nbreak"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
    expect(toCsv([[1, null, true]])).toBe("1,,true\r\n");
  });

  it("neutralises text that a spreadsheet would run as a formula, but not negative numbers", () => {
    expect(toCsv([["=SUM(A1)", "@x", "-5", "-x", -3]])).toBe("'=SUM(A1),'@x,-5,'-x,-3\r\n");
  });

  it("builds a table from column definitions", () => {
    const csv = tableToCsv(
      [
        { header: "name", value: (r: { n: string; v: number }) => r.n },
        { header: "value", value: (r) => r.v },
      ],
      [{ n: "a", v: 1 }],
    );
    expect(csv).toBe("name,value\r\na,1\r\n");
  });
});

describe("file summary", () => {
  it("detects the format from the name, then the content", () => {
    expect(detectFormat("p.JSON", "")).toBe("json");
    expect(detectFormat("p.csv", "[")).toBe("csv");
    expect(detectFormat("upload", "  [{}]")).toBe("json");
    expect(detectFormat("upload", "handle,title")).toBe("csv");
  });

  it("summarises a CSV file's columns, row count and samples", () => {
    const s = summariseFile("csv", "Handle,Title\nshirt,Shirt\npants,Pants\n");
    expect(s).toEqual({
      ok: true,
      format: "csv",
      headers: ["Handle", "Title"],
      rowCount: 2,
      sample: [
        { Handle: "shirt", Title: "Shirt" },
        { Handle: "pants", Title: "Pants" },
      ],
    });
  });

  it("explains files it can't use", () => {
    expect(summariseFile("csv", "")).toMatchObject({ ok: false, message: "The file is empty." });
    expect(summariseFile("csv", "a,b\n")).toMatchObject({ ok: false });
    expect(summariseFile("csv", "a,a\n1,2")).toMatchObject({ ok: false, message: expect.stringContaining('"a"') });
    expect(summariseFile("json", "{")).toMatchObject({ ok: false, message: "This isn't valid JSON." });
    expect(summariseFile("json", '{"a":1}')).toMatchObject({ ok: false });
  });

  it("collects the keys of every JSON row", () => {
    const s = summariseFile(
      "json",
      JSON.stringify([
        { handle: "a", price: 10 },
        { handle: "b", sku: "B", price: null },
      ]),
    );
    expect(s).toMatchObject({ ok: true, headers: ["handle", "price", "sku"], rowCount: 2 });
    if (s.ok) expect(s.sample[1]).toEqual({ handle: "b", price: "", sku: "B" });
  });
});

describe("column mapping", () => {
  it("normalises header names", () => {
    expect(normaliseHeader("  Variant Compare-At Price ")).toBe("variant_compare_at_price");
    expect(normaliseHeader("Body (HTML)")).toBe("body");
    expect(normaliseHeader("Option1 Name")).toBe("option_1_name");
  });

  it("matches Shopify-style headers to fields", () => {
    const headers = [
      "Handle",
      "Title",
      "Body (HTML)",
      "Option1 Name",
      "Option1 Value",
      "Variant SKU",
      "Variant Price",
      "Variant Grams",
      "Variant Inventory Qty",
      "Cost per item",
      "Image Src",
    ];
    expect(autoMap(headers, FIELDS)).toEqual({
      Handle: "handle",
      Title: "title",
      "Body (HTML)": "description",
      "Option1 Name": "option1_name",
      "Option1 Value": "option1_value",
      "Variant SKU": "sku",
      "Variant Price": "price",
      "Variant Grams": "weight_grams",
      "Variant Inventory Qty": "stock",
      "Cost per item": "cost",
      "Image Src": "",
    });
  });

  it("gives each field to one column, preferring exact names over aliases", () => {
    expect(autoMap(["Variant SKU", "sku"], FIELDS)).toEqual({ "Variant SKU": "", sku: "sku" });
    expect(autoMap(["quantity", "qty"], FIELDS)).toEqual({ quantity: "stock", qty: "" });
  });

  it("flags missing required fields and fields chosen twice", () => {
    expect(mappingIssues({ Name: "title", Code: "sku" }, FIELDS)).toEqual([{ kind: "missing", field: "handle" }]);
    // a column named like a field is read as that field even when unmapped
    expect(mappingIssues({ handle: "", title: "", Code: "sku", sku: "" }, FIELDS)).toEqual([
      { kind: "duplicate", field: "sku", columns: ["Code", "sku"] },
    ]);
    expect(mappingIssues({ handle: "", title: "", sku: "" }, FIELDS)).toEqual([]);
  });

  it("sends only renamed columns", () => {
    expect(mappingForApi({ handle: "handle", Name: "title", Extra: "" })).toEqual({ Name: "title" });
  });

  it("labels rows as the API numbers them", () => {
    expect(rowLabel(2, "csv")).toBe("Row 2");
    expect(rowLabel(2, "json")).toBe("Item 1");
  });
});

const job = (over: Partial<DataJob>): DataJob => ({
  id: "j1",
  kind: "IMPORT",
  entity: "products",
  format: "csv",
  status: "COMPLETED",
  dryRun: true,
  report: {},
  createdById: null,
  startedAt: null,
  finishedAt: null,
  createdAt: "2026-11-08T10:00:00.000Z",
  ...over,
});

describe("jobs", () => {
  it("polls until the job has finished", () => {
    expect(isFinished("RUNNING")).toBe(false);
    expect(pollingInterval(undefined)).toBe(POLL_MS);
    expect(pollingInterval({ status: "PENDING" })).toBe(POLL_MS);
    expect(pollingInterval({ status: "COMPLETED" })).toBe(0);
    expect(pollingInterval({ status: "FAILED" })).toBe(0);
  });

  it("sums up a job in one line", () => {
    expect(jobOutcome(job({ report: { rows: 4, errors: 0 } }))).toBe("4 rows ready to import");
    expect(jobOutcome(job({ report: { rows: 4, errors: 2 } }))).toBe("2 problems found in 4 rows");
    expect(jobOutcome(job({ dryRun: false, status: "FAILED", report: { errors: 1, applied: false } }))).toBe(
      "Not imported: 1 problem found",
    );
    expect(
      jobOutcome(job({ dryRun: false, report: { applied: true, imported: 3, failed: [{ handle: "x", ok: false }] } })),
    ).toBe("3 products imported, 1 failed");
    expect(jobOutcome(job({ kind: "EXPORT", report: { bytes: 2048 } }))).toBe("File ready (2.0 KB)");
    expect(jobOutcome(job({ status: "FAILED", report: { error: "boom" } }))).toBe("boom");
    expect(jobOutcome(job({ status: "PENDING" }))).toBe("Waiting for the worker");
  });

  it("writes the validation report as CSV", () => {
    const csv = errorsCsv(
      [
        { row: 3, field: "sku", message: "sku is required" },
        { row: 4, message: "bad, row" },
      ],
      "csv",
    );
    expect(parseCsv(csv)).toEqual([
      ["row", "location", "field", "column", "message"],
      ["3", "Row 3", "SKU", "sku", "sku is required"],
      ["4", "Row 4", "", "", "bad, row"],
    ]);
    expect(parseCsv(errorsCsv([{ row: 2, message: "m" }], "json"))[1]!.slice(0, 2)).toEqual(["1", "Item 1"]);
  });
});
