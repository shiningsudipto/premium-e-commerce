import { plainToRichText, richTextToPlain } from "./rich-text";

// Translating a page's block tree. Every text prop of the English (published) tree becomes a field;
// the translated tree is a copy of the English tree with just those strings replaced, so its
// structure, IDs, links, media and settings stay identical. When the English tree changed after a
// translation was saved, translated strings are kept for blocks that still exist (matched by block
// `id`, else by position and type); everything else shows as not translated yet.

export type FieldKind = "text" | "long" | "rich";

export type PageTextField = {
  // the form key: `b:<block path>:<prop path>`
  key: string;
  blockPath: number[];
  propPath: (string | number)[];
  label: string;
  kind: FieldKind;
  max?: number;
  // the English text (plain text for rich text)
  source: string;
};

export type PageBlockGroup = {
  id: string;
  // "2.1 · Rich text"
  title: string;
  // how API validation errors address this block: `blocks[1].children[0]`
  errorKey: string;
  fields: PageTextField[];
};

type RawBlock = { id?: unknown; type: string; props: Record<string, unknown>; children?: unknown };

type PropSpec = { path: string; label: string; kind: FieldKind; max?: number; item?: string };

// The text props of each registered block (premium-ec-backend content/blocks.schemas.ts). IDs,
// links, handles, media, enums, numbers, switches, custom HTML and settings aren't translated.
const BLOCK_TEXT: Record<string, PropSpec[]> = {
  hero: [
    { path: "heading", label: "Heading", kind: "text", max: 200 },
    { path: "subheading", label: "Subheading", kind: "long", max: 500 },
    { path: "ctaLabel", label: "Button label", kind: "text", max: 60 },
  ],
  rich_text: [{ path: "document", label: "Text", kind: "rich" }],
  image: [
    { path: "alt", label: "Alt text", kind: "text", max: 300 },
    { path: "caption", label: "Caption", kind: "text", max: 300 },
  ],
  video: [],
  carousel: [{ path: "slides[].heading", label: "Heading", kind: "text", max: 200, item: "Slide" }],
  product_grid: [{ path: "title", label: "Title", kind: "text", max: 200 }],
  collection_list: [{ path: "title", label: "Title", kind: "text", max: 200 }],
  recommendations: [{ path: "title", label: "Title", kind: "text", max: 200 }],
  testimonial: [
    { path: "items[].quote", label: "Quote", kind: "long", max: 1000, item: "Testimonial" },
    { path: "items[].author", label: "Author", kind: "text", max: 100, item: "Testimonial" },
  ],
  faq: [
    { path: "title", label: "Title", kind: "text", max: 200 },
    { path: "items[].question", label: "Question", kind: "text", max: 300, item: "Item" },
    { path: "items[].answer", label: "Answer", kind: "rich", item: "Item" },
  ],
  countdown: [{ path: "heading", label: "Heading", kind: "text", max: 200 }],
  newsletter: [
    { path: "heading", label: "Heading", kind: "text", max: 200 },
    { path: "body", label: "Text", kind: "long", max: 500 },
    { path: "buttonLabel", label: "Button label", kind: "text", max: 40 },
  ],
  tabs: [
    { path: "items[].title", label: "Title", kind: "text", max: 100, item: "Tab" },
    { path: "items[].content", label: "Content", kind: "rich", item: "Tab" },
  ],
  accordion: [
    { path: "items[].title", label: "Title", kind: "text", max: 200, item: "Item" },
    { path: "items[].content", label: "Content", kind: "rich", item: "Item" },
  ],
  columns: [],
  spacer: [],
  section_ref: [],
  custom_html: [],
};

export const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero",
  rich_text: "Rich text",
  image: "Image",
  video: "Video",
  carousel: "Carousel",
  product_grid: "Product grid",
  collection_list: "Collection list",
  recommendations: "Recommendations",
  testimonial: "Testimonials",
  faq: "FAQ",
  countdown: "Countdown",
  newsletter: "Newsletter sign-up",
  tabs: "Tabs",
  accordion: "Accordion",
  columns: "Columns",
  spacer: "Spacer",
  section_ref: "Global section",
  custom_html: "Custom HTML",
};

// Blocks this editor doesn't know yet: string props with these names count as text.
const TEXT_KEYS: Record<string, string> = {
  heading: "Heading",
  subheading: "Subheading",
  title: "Title",
  body: "Text",
  text: "Text",
  label: "Label",
  caption: "Caption",
  alt: "Alt text",
  quote: "Quote",
  question: "Question",
  answer: "Answer",
  description: "Description",
  ctaLabel: "Button label",
  buttonLabel: "Button label",
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

const humanize = (s: string) => {
  const words = s
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const blockLabel = (type: string) => BLOCK_LABELS[type] ?? humanize(type);

function readBlocks(raw: unknown): RawBlock[] {
  return (Array.isArray(raw) ? raw : []).filter(
    (b): b is RawBlock => isRecord(b) && typeof b.type === "string" && (b.props === undefined || isRecord(b.props)),
  );
}

const propsOf = (b: RawBlock): Record<string, unknown> => (isRecord(b.props) ? b.props : {});

// The specs that apply to a block: its registered text props, or text-like string props.
function specsFor(block: RawBlock): PropSpec[] {
  const known = BLOCK_TEXT[block.type];
  if (known) return known;
  const specs: PropSpec[] = [];
  for (const [key, value] of Object.entries(propsOf(block))) {
    if (typeof value === "string" && TEXT_KEYS[key])
      specs.push({ path: key, label: TEXT_KEYS[key], kind: "long", max: 500 });
    if (Array.isArray(value) && value.some(isRecord)) {
      const itemKeys = new Set(value.filter(isRecord).flatMap((item) => Object.keys(item).filter((k) => TEXT_KEYS[k])));
      for (const k of itemKeys)
        specs.push({ path: `${key}[].${k}`, label: TEXT_KEYS[k]!, kind: "long", max: 500, item: "Item" });
    }
  }
  return specs;
}

const sourceText = (value: unknown, kind: FieldKind) =>
  kind === "rich" ? richTextToPlain(value) : typeof value === "string" ? value.trim() : "";

// The prop paths a spec addresses in one block's props, with their values.
function expand(
  spec: PropSpec,
  props: Record<string, unknown>,
): { path: (string | number)[]; label: string; value: unknown }[] {
  const [list, key] = spec.path.split("[].");
  if (key === undefined) return [{ path: [spec.path], label: spec.label, value: props[spec.path] }];
  const items = props[list!];
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, i) =>
    isRecord(item)
      ? [{ path: [list!, i, key], label: `${spec.item ?? "Item"} ${i + 1} · ${spec.label}`, value: item[key] }]
      : [],
  );
}

export const fieldKey = (blockPath: number[], propPath: (string | number)[]) =>
  `b:${blockPath.join(".")}:${propPath.join(".")}`;

// Every text of the English tree, grouped by block (blocks without text are left out).
export function pageTextGroups(sourceBlocks: unknown): PageBlockGroup[] {
  const groups: PageBlockGroup[] = [];
  const walk = (list: unknown, parent: number[], parentKey: string) => {
    readBlocks(list).forEach((block, i) => {
      const blockPath = [...parent, i];
      const errorKey = parent.length ? `${parentKey}.children[${i}]` : `blocks[${i}]`;
      const fields = specsFor(block)
        .flatMap((spec, order) =>
          expand(spec, propsOf(block)).flatMap(({ path, label, value }) => {
            const source = sourceText(value, spec.kind);
            if (!source) return [];
            const field: PageTextField = {
              key: fieldKey(blockPath, path),
              blockPath,
              propPath: path,
              label,
              kind: spec.kind,
              max: spec.max,
              source,
            };
            // plain props first, then list items one by one (question 1, answer 1, question 2…)
            return [{ field, item: path.length > 1 ? (path[1] as number) : -1, order }];
          }),
        )
        .sort((a, b) => a.item - b.item || a.order - b.order)
        .map((f) => f.field);
      if (fields.length) {
        groups.push({
          id: blockPath.join("."),
          title: `${blockPath.map((n) => n + 1).join(".")} · ${blockLabel(block.type)}`,
          errorKey,
          fields,
        });
      }
      if (block.children) walk(block.children, blockPath, errorKey);
    });
  };
  walk(sourceBlocks, [], "");
  return groups;
}

// ── Matching a saved translation to the current English tree ──

const pathKey = (path: number[]) => path.join(".");

function indexById(list: unknown, out = new Map<string, RawBlock>()): Map<string, RawBlock> {
  for (const block of readBlocks(list)) {
    if (typeof block.id === "string" && block.id) out.set(block.id, block);
    if (block.children) indexById(block.children, out);
  }
  return out;
}

// For each English block (by its path), the block of the translated tree that translates it.
export function matchBlocks(sourceBlocks: unknown, translatedBlocks: unknown): Map<string, RawBlock> {
  const byId = indexById(translatedBlocks);
  const matches = new Map<string, RawBlock>();
  const walk = (source: unknown, translated: RawBlock[] | undefined, parent: number[]) => {
    readBlocks(source).forEach((block, i) => {
      const path = [...parent, i];
      let match: RawBlock | undefined;
      if (typeof block.id === "string" && block.id) {
        // IDs are unique in a tree, so a block that moved still finds its translation
        const candidate = byId.get(block.id);
        if (candidate?.type === block.type) match = candidate;
      } else {
        const candidate = translated?.[i];
        const candidateHasId = typeof candidate?.id === "string" && !!candidate.id;
        if (candidate && !candidateHasId && candidate.type === block.type) match = candidate;
      }
      if (match) matches.set(pathKey(path), match);
      if (block.children) walk(block.children, match ? readBlocks(match.children) : undefined, path);
    });
  };
  walk(sourceBlocks, readBlocks(translatedBlocks), []);
  return matches;
}

function blockAt(list: unknown, path: number[]): RawBlock | undefined {
  let current: RawBlock | undefined;
  let level: unknown = list;
  for (const i of path) {
    current = readBlocks(level)[i];
    if (!current) return undefined;
    level = current.children;
  }
  return current;
}

function getIn(value: unknown, path: (string | number)[]): unknown {
  let current = value;
  for (const step of path) {
    if (Array.isArray(current) && typeof step === "number") current = current[step];
    else if (isRecord(current) && typeof step === "string") current = current[step];
    else return undefined;
  }
  return current;
}

// The Bangla text already saved for each field, as plain text. A string equal to the English is
// one that was left untranslated (the translated tree carries the English text there). Items of a
// list (FAQ questions, slides) only match when the list still has as many items as before.
export function savedPageValues(
  sourceBlocks: unknown,
  translatedBlocks: unknown,
  groups: PageBlockGroup[],
): Record<string, string> {
  if (!Array.isArray(translatedBlocks) || !translatedBlocks.length) return {};
  const matches = matchBlocks(sourceBlocks, translatedBlocks);
  const values: Record<string, string> = {};
  for (const group of groups) {
    for (const field of group.fields) {
      const translatedBlock = matches.get(pathKey(field.blockPath));
      const sourceBlock = blockAt(sourceBlocks, field.blockPath);
      if (!translatedBlock || !sourceBlock) continue;
      if (field.propPath.length > 1) {
        const list = field.propPath[0] as string;
        const a = propsOf(sourceBlock)[list];
        const b = propsOf(translatedBlock)[list];
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) continue;
      }
      const text = sourceText(getIn(propsOf(translatedBlock), field.propPath), field.kind);
      if (text && text !== field.source) values[field.key] = text;
    }
  }
  return values;
}

// ── Building the translated tree ──

function setIn(target: Record<string, unknown>, path: (string | number)[], value: unknown) {
  let current: unknown = target;
  for (let i = 0; i < path.length - 1; i++) {
    current = (current as Record<string | number, unknown>)[path[i]!];
    if (!current || typeof current !== "object") return;
  }
  (current as Record<string | number, unknown>)[path[path.length - 1]!] = value;
}

// A copy of the English tree with the translated strings in place, or undefined when nothing is
// translated (the page then shows in English).
export function buildTranslatedBlocks(
  sourceBlocks: unknown,
  groups: PageBlockGroup[],
  values: Record<string, string>,
): unknown[] | undefined {
  const tree = JSON.parse(JSON.stringify(Array.isArray(sourceBlocks) ? sourceBlocks : [])) as unknown[];
  let translated = 0;
  for (const group of groups) {
    for (const field of group.fields) {
      const raw = values[field.key] ?? "";
      const value = field.kind === "rich" ? plainToRichText(raw) : raw.trim() || undefined;
      if (!value) continue;
      const block = blockAt(tree, field.blockPath);
      if (!block) continue;
      if (!isRecord(block.props)) block.props = {};
      setIn(block.props, field.propPath, value);
      translated++;
    }
  }
  return translated ? tree : undefined;
}
