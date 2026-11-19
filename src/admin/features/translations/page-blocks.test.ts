import { describe, expect, it } from "vitest";
import { buildTranslatedBlocks, fieldKey, matchBlocks, pageTextGroups, savedPageValues } from "./page-blocks";

const source = [
  {
    id: "hero1",
    type: "hero",
    props: {
      heading: "Summer sale",
      subheading: "Up to 30% off",
      ctaLabel: "Shop now",
      ctaHref: "/sale",
      imageMediaId: "m1",
      align: "center",
    },
    settings: { hideOn: ["mobile"] },
  },
  {
    id: "cols",
    type: "columns",
    props: { gap: "md", stackOnMobile: true },
    children: [
      { id: "rt", type: "rich_text", props: { document: "First paragraph.\n\nSecond paragraph." } },
      { id: "img", type: "image", props: { mediaId: "m2", alt: "A tan bag", href: "https://example.com" } },
    ],
  },
  {
    id: "faq1",
    type: "faq",
    props: {
      title: "Questions",
      items: [
        {
          question: "Shipping?",
          answer: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Two days." }] }] },
        },
        { question: "Returns?", answer: "Within 30 days." },
      ],
    },
  },
  { id: "sp", type: "spacer", props: { size: "md" } },
  { id: "grid", type: "product_grid", props: { source: "collection", ref: "new-in", limit: 8 } },
  { id: "html", type: "custom_html", props: { html: "<p>Hi</p>" } },
];

describe("pageTextGroups", () => {
  const groups = pageTextGroups(source);

  it("lists the text props of each block, skipping links, media, enums, numbers and custom HTML", () => {
    expect(groups.map((g) => g.title)).toEqual(["1 · Hero", "2.1 · Rich text", "2.2 · Image", "3 · FAQ"]);
    expect(groups[0]!.fields.map((f) => [f.label, f.source, f.kind, f.max])).toEqual([
      ["Heading", "Summer sale", "text", 200],
      ["Subheading", "Up to 30% off", "long", 500],
      ["Button label", "Shop now", "text", 60],
    ]);
    expect(groups[2]!.fields.map((f) => f.label)).toEqual(["Alt text"]);
  });

  it("walks list items and shows rich text as plain text", () => {
    const faq = groups[3]!;
    expect(faq.fields.map((f) => [f.label, f.source])).toEqual([
      ["Title", "Questions"],
      ["Item 1 · Question", "Shipping?"],
      ["Item 1 · Answer", "Two days."],
      ["Item 2 · Question", "Returns?"],
      ["Item 2 · Answer", "Within 30 days."],
    ]);
    expect(faq.fields[1]!.key).toBe(fieldKey([2], ["items", 0, "question"]));
  });

  it("addresses blocks the way API validation errors do", () => {
    expect(groups.map((g) => g.errorKey)).toEqual([
      "blocks[0]",
      "blocks[1].children[0]",
      "blocks[1].children[1]",
      "blocks[2]",
    ]);
  });

  it("finds text-like props on block types it doesn't know", () => {
    const [group] = pageTextGroups([
      { type: "promo_bar", props: { label: "Free delivery", href: "/x", items: [{ title: "A", url: "/a" }] } },
    ]);
    expect(group!.title).toBe("1 · Promo bar");
    expect(group!.fields.map((f) => [f.label, f.source])).toEqual([
      ["Label", "Free delivery"],
      ["Item 1 · Title", "A"],
    ]);
  });

  it("ignores anything that isn't a block", () => {
    expect(pageTextGroups(null)).toEqual([]);
    expect(pageTextGroups([null, 3, { props: {} }])).toEqual([]);
  });
});

describe("buildTranslatedBlocks", () => {
  const groups = pageTextGroups(source);

  it("copies the English tree and replaces only the translated strings", () => {
    const tree = buildTranslatedBlocks(source, groups, {
      [fieldKey([0], ["heading"])]: " গ্রীষ্মের সেল ",
      [fieldKey([1, 0], ["document"])]: "প্রথম।\r\n\r\nদ্বিতীয়।",
      [fieldKey([2], ["items", 1, "answer"])]: "৩০ দিনের মধ্যে।",
      [fieldKey([0], ["ctaLabel"])]: "   ",
    }) as typeof source;
    expect(tree[0]!.props).toEqual({ ...source[0]!.props, heading: "গ্রীষ্মের সেল" });
    expect(tree[0]!.settings).toEqual({ hideOn: ["mobile"] });
    expect(tree[1]!.children![0]!.props.document).toBe("প্রথম।\n\nদ্বিতীয়।");
    expect(tree[1]!.children![1]).toEqual(source[1]!.children![1]);
    const items = (tree[2]!.props as { items: { question: string; answer: unknown }[] }).items;
    expect(items[1]).toEqual({ question: "Returns?", answer: "৩০ দিনের মধ্যে।" });
    expect(items[0]).toEqual(source[2]!.props.items![0]);
    expect(tree.slice(3)).toEqual(source.slice(3));
    // the English tree itself is untouched
    expect(source[0]!.props.heading).toBe("Summer sale");
  });

  it("returns nothing when no text is translated", () => {
    expect(buildTranslatedBlocks(source, groups, {})).toBeUndefined();
    expect(buildTranslatedBlocks(source, groups, { [fieldKey([0], ["heading"])]: "  " })).toBeUndefined();
  });
});

describe("savedPageValues after the English changed", () => {
  const groups = pageTextGroups(source);
  const translated = buildTranslatedBlocks(source, groups, {
    [fieldKey([0], ["heading"])]: "গ্রীষ্মের সেল",
    [fieldKey([1, 1], ["alt"])]: "একটি ট্যান ব্যাগ",
    [fieldKey([2], ["items", 0, "question"])]: "শিপিং?",
    [fieldKey([2], ["items", 0, "answer"])]: "দুই দিন।",
  })!;

  it("reads back what was translated, and treats English copies as not translated", () => {
    expect(savedPageValues(source, translated, groups)).toEqual({
      [fieldKey([0], ["heading"])]: "গ্রীষ্মের সেল",
      [fieldKey([1, 1], ["alt"])]: "একটি ট্যান ব্যাগ",
      [fieldKey([2], ["items", 0, "question"])]: "শিপিং?",
      [fieldKey([2], ["items", 0, "answer"])]: "দুই দিন।",
    });
    expect(savedPageValues(source, undefined, groups)).toEqual({});
  });

  it("keeps translations of blocks that moved (by id) and leaves new blocks missing", () => {
    const changed = [
      { id: "new", type: "hero", props: { heading: "Brand new" } },
      source[2]!,
      { ...source[1]!, children: [source[1]!.children![1]!] },
      source[0]!,
    ];
    const g = pageTextGroups(changed);
    expect(savedPageValues(changed, translated, g)).toEqual({
      [fieldKey([1], ["items", 0, "question"])]: "শিপিং?",
      [fieldKey([1], ["items", 0, "answer"])]: "দুই দিন।",
      [fieldKey([2, 0], ["alt"])]: "একটি ট্যান ব্যাগ",
      [fieldKey([3], ["heading"])]: "গ্রীষ্মের সেল",
    });
  });

  it("doesn't match list items once the list has a different number of items", () => {
    const faq = source[2]!;
    const items = faq.props.items!;
    const changed = [{ ...faq, props: { ...faq.props, items: [...items, { question: "New?", answer: "Yes." }] } }];
    const g = pageTextGroups(changed);
    // the title isn't translated, and the questions can't be matched
    expect(savedPageValues(changed, translated, g)).toEqual({});
  });

  it("matches blocks without ids by position and type", () => {
    const plain = [
      { type: "hero", props: { heading: "Hello" } },
      { type: "newsletter", props: { heading: "Join", buttonLabel: "Subscribe" } },
    ];
    const g = pageTextGroups(plain);
    const saved = buildTranslatedBlocks(plain, g, {
      [fieldKey([0], ["heading"])]: "হ্যালো",
      [fieldKey([1], ["heading"])]: "যোগ দিন",
    });
    expect(matchBlocks(plain, saved).size).toBe(2);
    // a block of another type took the first place: only the second still matches
    const changed = [
      { type: "countdown", props: { heading: "Ends soon", endsAt: "2026-12-01T00:00:00.000Z" } },
      plain[1]!,
    ];
    expect(savedPageValues(changed, saved, pageTextGroups(changed))).toEqual({
      [fieldKey([1], ["heading"])]: "যোগ দিন",
    });
  });
});
