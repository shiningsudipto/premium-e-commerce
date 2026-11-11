import { describe, expect, it } from "vitest";
import {
  blockIdAtPath,
  cleanSettings,
  cleanValue,
  countBlocks,
  defaultProps,
  duplicateBlock,
  findBlock,
  hasRoom,
  insertBlock,
  marketSegments,
  MAX_CHILDREN,
  moveBlock,
  moveBy,
  pageErrors,
  pageState,
  parsePropErrors,
  previewPath,
  readBlocks,
  removeBlock,
  toApiBlocks,
  updateBlock,
  validateTree,
  type Block,
  type BlockDef,
} from "./block-tree";

const ids = () => {
  let n = 0;
  return () => `new${++n}`;
};

const tree = (): Block[] => [
  { id: "a", type: "hero", props: { heading: "A" } },
  {
    id: "cols",
    type: "columns",
    props: {},
    children: [
      { id: "c1", type: "rich_text", props: {} },
      { id: "c2", type: "image", props: { mediaId: "m1" } },
    ],
  },
  { id: "b", type: "spacer", props: {} },
];

const order = (list: Block[]) => list.map((b) => b.id);

const heroDef: BlockDef = {
  type: "hero",
  label: "Hero",
  group: "content",
  container: false,
  permission: null,
  defaults: { heading: "Headline", align: "center" },
  schema: {
    type: "object",
    properties: {
      heading: { type: "string", maxLength: 200 },
      subheading: { type: "string", maxLength: 500 },
      align: { type: "string", enum: ["left", "center", "right"], default: "center" },
    },
    required: ["heading"],
  },
};

const carouselDef: BlockDef = {
  type: "carousel",
  label: "Carousel",
  group: "content",
  container: false,
  permission: null,
  defaults: { autoplaySeconds: 0 },
  schema: {
    type: "object",
    properties: {
      slides: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          properties: { mediaId: { type: "string" }, heading: { type: "string", maxLength: 200 } },
          required: ["mediaId"],
        },
      },
      autoplaySeconds: { type: "integer", minimum: 0, maximum: 30 },
    },
    required: ["slides"],
  },
};

describe("reading the stored tree", () => {
  it("drops non-blocks and gives every block a unique id", () => {
    const read = readBlocks(
      [{ type: "hero", props: { heading: "x" } }, "junk", { id: "dup", type: "a" }, { id: "dup", type: "b" }, null],
      ids(),
    );
    expect(read.map((b) => [b.id, b.type])).toEqual([
      ["new1", "hero"],
      ["dup", "a"],
      ["new2", "b"],
    ]);
    expect(readBlocks("nope")).toEqual([]);
  });

  it("keeps children and settings", () => {
    const read = readBlocks(
      [{ id: "c", type: "columns", settings: { hideOn: ["mobile"] }, children: [{ type: "x" }] }],
      ids(),
    );
    expect(read[0]).toEqual({
      id: "c",
      type: "columns",
      props: {},
      settings: { hideOn: ["mobile"] },
      children: [{ id: "new1", type: "x", props: {} }],
    });
  });
});

describe("tree operations", () => {
  it("finds blocks at any depth", () => {
    expect(findBlock(tree(), "c2")).toMatchObject({ parentId: "cols", index: 1, siblings: 2 });
    expect(findBlock(tree(), "b")).toMatchObject({ parentId: null, index: 2 });
    expect(findBlock(tree(), "zzz")).toBeNull();
  });

  it("inserts, updates and removes", () => {
    const t = insertBlock(tree(), "cols", 0, { id: "n", type: "spacer", props: {} });
    expect(order(findBlock(t, "cols")!.block.children!)).toEqual(["n", "c1", "c2"]);
    const u = updateBlock(t, "c2", (b) => ({ ...b, props: { mediaId: "m2" } }));
    expect(findBlock(u, "c2")!.block.props).toEqual({ mediaId: "m2" });
    expect(order(removeBlock(u, "cols"))).toEqual(["a", "b"]);
    expect(countBlocks(tree())).toBe(5);
  });

  it("refuses to overfill a container", () => {
    let t: Block[] = [{ id: "cols", type: "columns", props: {}, children: [] }];
    for (let i = 0; i < MAX_CHILDREN; i++) t = insertBlock(t, "cols", i, { id: `x${i}`, type: "spacer", props: {} });
    expect(hasRoom(t, "cols")).toBe(false);
    expect(insertBlock(t, "cols", 0, { id: "y", type: "spacer" })).toBe(t);
    expect(moveBlock([...t, { id: "z", type: "spacer" }], "z", "cols", 0)).toHaveLength(2);
  });

  it("moves with up/down within the siblings only", () => {
    expect(order(moveBy(tree(), "b", -1))).toEqual(["a", "b", "cols"]);
    expect(order(moveBy(tree(), "a", -1))).toEqual(["a", "cols", "b"]);
    expect(order(findBlock(moveBy(tree(), "c1", 1), "cols")!.block.children!)).toEqual(["c2", "c1"]);
  });

  it("drag-and-drop places the block before the drop target, across lists", () => {
    // same list, downwards: index counts positions before the move
    expect(order(moveBlock(tree(), "a", null, 3))).toEqual(["cols", "b", "a"]);
    expect(order(moveBlock(tree(), "b", null, 0))).toEqual(["b", "a", "cols"]);
    // into a container
    const t = moveBlock(tree(), "a", "cols", 1);
    expect(order(t)).toEqual(["cols", "b"]);
    expect(order(findBlock(t, "cols")!.block.children!)).toEqual(["c1", "a", "c2"]);
    // out of a container
    expect(order(moveBlock(tree(), "c1", null, 0))).toEqual(["c1", "a", "cols", "b"]);
  });

  it("won't move a block inside itself", () => {
    const t = tree();
    expect(moveBlock(t, "cols", "cols", 0)).toBe(t);
    const nested: Block[] = [{ id: "o", type: "columns", children: [{ id: "i", type: "columns", children: [] }] }];
    expect(moveBlock(nested, "o", "i", 0)).toBe(nested);
  });

  it("duplicates with fresh ids, right after the original", () => {
    const { tree: t, id } = duplicateBlock(tree(), "cols", ids());
    expect(id).toBe("new1");
    expect(order(t)).toEqual(["a", "cols", "new1", "b"]);
    expect(order(findBlock(t, "new1")!.block.children!)).toEqual(["new2", "new3"]);
    // the copy is independent of the original
    expect(findBlock(t, "new3")!.block.props).not.toBe(findBlock(t, "c2")!.block.props);
  });
});

describe("schema-driven props", () => {
  it("starts a new block from its defaults and required lists", () => {
    expect(defaultProps(heroDef)).toEqual({ heading: "Headline", align: "center" });
    expect(defaultProps(carouselDef)).toEqual({ slides: [], autoplaySeconds: 0 });
  });

  it("leaves out optional text left empty, at any depth", () => {
    const schema = carouselDef.schema;
    expect(
      cleanValue(schema, { slides: [{ mediaId: "", heading: "" }], autoplaySeconds: Number.NaN, extra: undefined }),
    ).toEqual({ slides: [{ mediaId: "" }] });
  });

  it("drops empty settings", () => {
    expect(
      cleanSettings({ hideOn: [], audience: { markets: [] }, schedule: {}, experiment: { key: " ", variant: "" } }),
    ).toBe(undefined);
    expect(
      cleanSettings({
        hideOn: ["mobile"],
        audience: { loggedIn: false },
        schedule: { endsAt: "2030-01-01T00:00:00.000Z" },
      }),
    ).toEqual({
      hideOn: ["mobile"],
      audience: { loggedIn: false },
      schedule: { endsAt: "2030-01-01T00:00:00.000Z" },
    });
  });

  it("prepares the tree for the API", () => {
    const out = toApiBlocks(
      [
        { id: "h", type: "hero", props: { heading: "Hi", subheading: "" }, settings: { hideOn: [] } },
        { id: "c", type: "columns", props: {}, children: [] },
      ],
      [heroDef],
    );
    expect(out).toEqual([
      { id: "h", type: "hero", props: { heading: "Hi" } },
      { id: "c", type: "columns", props: {} },
    ]);
  });

  it("validates props and settings per block before saving", () => {
    const errors = validateTree(
      [
        { id: "h", type: "hero", props: {} },
        { id: "k", type: "carousel", props: { slides: [] }, settings: { experiment: { key: "x", variant: "" } } },
        { id: "ok", type: "hero", props: { heading: "Fine" } },
      ],
      [heroDef, carouselDef],
    );
    expect(errors.h).toEqual({ heading: "Required" });
    expect(errors.k).toMatchObject({ slides: "At least 1 items", "settings.experiment": expect.any(String) });
    expect(errors.ok).toBeUndefined();
  });
});

describe("API errors", () => {
  it("splits prop messages by path", () => {
    expect(parsePropErrors("heading: Invalid input; slides.0.mediaId: Required")).toEqual({
      heading: "Invalid input",
      "slides.0.mediaId": "Required",
    });
    expect(parsePropErrors(": Invalid object")).toEqual({ "": "Invalid object" });
  });

  it("finds the block an API path points at", () => {
    expect(blockIdAtPath(tree(), "blocks[1].children[1].props")).toBe("c2");
    expect(blockIdAtPath(tree(), "blocks[2]")).toBe("b");
    expect(blockIdAtPath(tree(), "blocks[9]")).toBeNull();
    expect(blockIdAtPath(tree(), "seo")).toBeNull();
  });

  it("maps a block validation response onto blocks", () => {
    const error = {
      status: 400,
      data: {
        code: "VALIDATION_FAILED",
        message: "Some blocks are invalid",
        details: {
          "blocks[0].props": "heading: Invalid input",
          "blocks[1].children[0]": "unknown block type x",
          "blocks[2].children": "spacer can't contain blocks",
        },
      },
    };
    expect(pageErrors(error, tree())).toEqual({
      fields: {},
      general: [],
      blocks: {
        a: { heading: "Invalid input" },
        c1: { "": "unknown block type x" },
        b: { "": "spacer can't contain blocks" },
      },
    });
  });

  it("maps request validation onto page fields", () => {
    const error = {
      status: 400,
      data: {
        code: "VALIDATION_FAILED",
        message: "Invalid body",
        details: { fieldErrors: { handle: ["lowercase letters, numbers and dashes"] }, formErrors: ["bad"] },
      },
    };
    expect(pageErrors(error, [])).toEqual({
      fields: { handle: "lowercase letters, numbers and dashes" },
      blocks: {},
      general: ["bad"],
    });
    expect(pageErrors({ status: 409, data: { code: "VERSION_CONFLICT", message: "x" } }, [])).toEqual({
      fields: {},
      blocks: {},
      general: [],
    });
  });
});

describe("publishing & preview", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  it("reads the page state", () => {
    expect(pageState({ status: "DRAFT", publishAt: null }, now)).toBe("draft");
    expect(pageState({ status: "DRAFT", publishAt: "2030-02-01T00:00:00Z" }, now)).toBe("scheduled");
    expect(pageState({ status: "ACTIVE", publishAt: null }, now)).toBe("live");
    expect(pageState({ status: "ARCHIVED", publishAt: "2030-02-01T00:00:00Z" }, now)).toBe("archived");
  });

  it("builds the storefront preview URL", () => {
    expect(previewPath({ handle: "about", token: "t.o+k" })).toBe("/api/preview?handle=about&token=t.o%2Bk");
    expect(previewPath({ handle: "about", token: "tok" }, "en-bd")).toBe(
      "/api/preview?handle=about&token=tok&market=en-bd",
    );
  });

  it("lists market segments, default market first", () => {
    expect(
      marketSegments([
        { handle: "us", defaultLocale: "en", locales: ["en", "es"], isActive: true, isDefault: false },
        { handle: "old", defaultLocale: "en", locales: ["en"], isActive: false, isDefault: false },
        { handle: "bd", defaultLocale: "bn", locales: ["en", "bn"], isActive: true, isDefault: true },
      ]),
    ).toEqual(["bn-bd", "en-bd", "en-us", "es-us"]);
  });
});
