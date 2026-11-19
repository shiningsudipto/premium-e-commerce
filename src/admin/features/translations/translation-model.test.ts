import { describe, expect, it } from "vitest";
import { fieldKey } from "./page-blocks";
import { editorHref, editorModel, placeErrors, progress, sameFields, translationStatus } from "./translation-model";

const product = {
  title: "Leather weekender",
  description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Roomy and tough." }] }] },
  seo: { title: "Weekender bag" },
  options: [
    { name: "Colour", values: ["Tan", "Black"] },
    { name: "Size", values: ["M"] },
  ],
};

describe("product model", () => {
  it("shows title, description, options and SEO with the English text", () => {
    const model = editorModel("PRODUCT", product, null);
    expect(model.groups.map((g) => g.title)).toEqual(["Details", "Option: Colour", "Option: Size", "Search engines"]);
    expect(model.groups[0]!.rows.map((r) => [r.key, r.source, r.max])).toEqual([
      ["title", "Leather weekender", 200],
      ["description", "Roomy and tough.", undefined],
    ]);
    expect(model.groups[1]!.rows.map((r) => [r.label, r.source])).toEqual([
      ["Option name", "Colour"],
      ["Value 1", "Tan"],
      ["Value 2", "Black"],
    ]);
    expect(model.groups[3]!.rows.map((r) => [r.key, r.source, r.max])).toEqual([
      ["seo.title", "Weekender bag", 200],
      ["seo.description", "", 500],
    ]);
    expect(model.initial).toEqual({});
    expect(model.build(model.initial)).toEqual({});
  });

  it("builds the PUT fields, keyed by the English option names and values", () => {
    const model = editorModel("PRODUCT", product, null);
    const fields = model.build({
      title: " চামড়ার ব্যাগ ",
      description: "প্রশস্ত।\n\n\n\nমজবুত।",
      "seo.description": "  ",
      "option.0.name": "রং",
      "option.0.value.0": "ট্যান",
      "option.0.value.1": "",
      "option.1.value.0": "মাঝারি",
    });
    expect(fields).toEqual({
      title: "চামড়ার ব্যাগ",
      description: "প্রশস্ত।\n\nমজবুত।",
      options: { Colour: { name: "রং", values: { Tan: "ট্যান" } }, Size: { values: { M: "মাঝারি" } } },
    });
  });

  it("reads a saved translation back into inputs, ignoring options that no longer exist", () => {
    const model = editorModel("PRODUCT", product, {
      title: "চামড়ার ব্যাগ",
      description: "প্রশস্ত।",
      seo: { title: "ব্যাগ" },
      options: { Colour: { name: "রং", values: { Tan: "ট্যান", Red: "লাল" } }, Material: { name: "উপাদান" } },
    });
    expect(model.initial).toEqual({
      title: "চামড়ার ব্যাগ",
      description: "প্রশস্ত।",
      "seo.title": "ব্যাগ",
      "option.0.name": "রং",
      "option.0.value.0": "ট্যান",
    });
    expect(model.build(model.initial)).toEqual({
      title: "চামড়ার ব্যাগ",
      description: "প্রশস্ত।",
      seo: { title: "ব্যাগ" },
      options: { Colour: { name: "রং", values: { Tan: "ট্যান" } } },
    });
  });
});

describe("category, collection and menu models", () => {
  it("uses name for categories and title for collections", () => {
    const category = editorModel("CATEGORY", { name: "Bags", description: "All bags", seo: {} }, { name: "ব্যাগ" });
    expect(category.groups[0]!.rows[0]).toMatchObject({ key: "name", label: "Name", source: "Bags" });
    expect(category.initial).toEqual({ name: "ব্যাগ" });
    expect(category.build({ ...category.initial, "seo.title": "ব্যাগ কিনুন" })).toEqual({
      name: "ব্যাগ",
      seo: { title: "ব্যাগ কিনুন" },
    });

    const collection = editorModel("COLLECTION", { title: "New in", description: null, seo: {} }, null);
    expect(collection.groups[0]!.rows.map((r) => r.key)).toEqual(["title", "description"]);
    expect(collection.build({ title: "নতুন" })).toEqual({ title: "নতুন" });
  });

  it("maps menu labels by their English text", () => {
    const model = editorModel("MENU", { labels: ["Shop", "Bags", "About"] }, { labels: { Bags: "ব্যাগ", Gone: "x" } });
    expect(model.groups[0]!.rows.map((r) => [r.key, r.source, r.max])).toEqual([
      ["label.0", "Shop", 200],
      ["label.1", "Bags", 200],
      ["label.2", "About", 200],
    ]);
    expect(model.initial).toEqual({ "label.1": "ব্যাগ" });
    expect(model.build({ ...model.initial, "label.0": "কেনাকাটা", "label.2": " " })).toEqual({
      labels: { Shop: "কেনাকাটা", Bags: "ব্যাগ" },
    });
  });
});

describe("page model", () => {
  const blocks = [
    { id: "h", type: "hero", props: { heading: "Welcome", ctaHref: "/shop" } },
    { id: "r", type: "rich_text", props: { document: "Hello there." } },
  ];
  const page = { title: "About us", seo: { description: "Who we are" }, blocks };

  it("lists the title, each block's texts and SEO", () => {
    const model = editorModel("PAGE", page, null);
    expect(model.groups.map((g) => g.title)).toEqual(["Details", "1 · Hero", "2 · Rich text", "Search engines"]);
    expect(model.groups[1]!.errorKey).toBe("blocks[0]");
  });

  it("sends the whole translated tree, and nothing when no block text is translated", () => {
    const model = editorModel("PAGE", page, null);
    expect(model.build({ title: "আমাদের সম্পর্কে" })).toEqual({ title: "আমাদের সম্পর্কে" });
    const fields = model.build({ [fieldKey([0], ["heading"])]: "স্বাগতম" });
    expect(fields.blocks).toEqual([{ ...blocks[0], props: { heading: "স্বাগতম", ctaHref: "/shop" } }, blocks[1]]);
  });

  it("reads saved block texts back", () => {
    const saved = {
      title: "আমাদের সম্পর্কে",
      blocks: [{ ...blocks[0], props: { heading: "স্বাগতম", ctaHref: "/shop" } }, blocks[1]],
    };
    const model = editorModel("PAGE", page, saved);
    expect(model.initial).toEqual({ title: "আমাদের সম্পর্কে", [fieldKey([0], ["heading"])]: "স্বাগতম" });
    expect(sameFields(model.build(model.initial), saved)).toBe(true);
  });
});

describe("progress, status, errors", () => {
  it("counts translated rows that have English text", () => {
    const model = editorModel("PRODUCT", { ...product, seo: {} }, null);
    // title, description, 2 option names, 3 values (SEO rows have no English)
    expect(progress(model.groups, { title: "x", "option.0.value.1": " " })).toEqual({ total: 7, done: 1 });
  });

  it("tells missing, translated and outdated apart", () => {
    expect(translationStatus({ translation: null, outdated: false })).toBe("missing");
    expect(translationStatus({ translation: { title: "x" }, outdated: false })).toBe("translated");
    expect(translationStatus({ translation: { title: "x" }, outdated: true })).toBe("outdated");
  });

  it("links to the editor", () => {
    expect(editorHref("PRODUCT", "p_1", "bn")).toBe("/admin/translations/PRODUCT/p_1?locale=bn");
  });

  it("puts API validation errors on their rows and groups", () => {
    const model = editorModel(
      "PAGE",
      {
        title: "T",
        seo: {},
        blocks: [{ type: "columns", props: {}, children: [{ type: "hero", props: { heading: "H" } }] }],
      },
      null,
    );
    const placed = placeErrors(model.groups, {
      title: ["Too long"],
      seo: ["Too long"],
      "blocks[0].children[0].props": "heading: Too big",
      "blocks[0].props": "gap: Invalid",
      _form: ["Unrecognized key"],
    });
    expect(placed.rows).toEqual({ title: "Too long" });
    expect(placed.groups).toEqual({ seo: "Too long", "block-0.0": "heading: Too big" });
    expect(placed.general).toEqual(["blocks[0].props: gap: Invalid", "Unrecognized key"]);
  });

  it("shows options errors once, on the first option", () => {
    const model = editorModel("PRODUCT", product, null);
    expect(placeErrors(model.groups, { options: ["Too long"] }).groups).toEqual({ "option-0": "Too long" });
  });
});
