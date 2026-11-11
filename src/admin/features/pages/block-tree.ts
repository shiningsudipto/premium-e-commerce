import { validate, emptyValue, type JsonSchema } from "../../components/json-schema-form/schema";
import { apiErrorBody } from "../../store/api-errors";
import type { GetV1AdminBlocksApiResponse, PutV1AdminPagesIdApiArg } from "../../store/api.generated";

// Pure operations on the page builder's block tree (kept apart from the screen so they can be
// tested). Blocks are addressed by their `id`, which the editor assigns when a block has none;
// the API stores it as-is, so ids stay stable across saves. Every operation returns a new tree.

export type Block = PutV1AdminPagesIdApiArg["body"]["blocks"][number];
export type BlockSettings = NonNullable<Block["settings"]>;
export type BlockDef = GetV1AdminBlocksApiResponse[number];

// API limits (blocks.schemas blockTree / blockShape)
export const MAX_BLOCKS = 200;
export const MAX_CHILDREN = 6;
const MAX_ID = 60;

let counter = 0;
export function newBlockId(): string {
  counter = (counter + 1) % 1_000_000;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// The stored tree as the editor works with it: anything that isn't a block is dropped, and every
// block gets a unique id.
export function readBlocks(raw: unknown, makeId: () => string = newBlockId): Block[] {
  const seen = new Set<string>();
  const read = (list: unknown): Block[] =>
    (Array.isArray(list) ? list : []).flatMap((b): Block[] => {
      if (!isRecord(b) || typeof b.type !== "string") return [];
      let id = typeof b.id === "string" && b.id && b.id.length <= MAX_ID ? b.id : makeId();
      while (seen.has(id)) id = makeId();
      seen.add(id);
      const block: Block = { id, type: b.type, props: isRecord(b.props) ? { ...b.props } : {} };
      if (isRecord(b.settings)) block.settings = b.settings as BlockSettings;
      if (Array.isArray(b.children)) block.children = read(b.children);
      return [block];
    });
  return read(raw);
}

export type Location = { block: Block; parentId: string | null; index: number; siblings: number };

export function findBlock(tree: Block[], id: string, parentId: string | null = null): Location | null {
  for (let i = 0; i < tree.length; i++) {
    const block = tree[i]!;
    if (block.id === id) return { block, parentId, index: i, siblings: tree.length };
    const nested = block.children ? findBlock(block.children, id, block.id ?? null) : null;
    if (nested) return nested;
  }
  return null;
}

// Replaces the list holding `parentId`'s children (the top level for null).
function editList(tree: Block[], parentId: string | null, edit: (list: Block[]) => Block[]): Block[] {
  if (parentId === null) return edit(tree);
  return tree.map((b) =>
    b.id === parentId
      ? { ...b, children: edit(b.children ?? []) }
      : b.children
        ? { ...b, children: editList(b.children, parentId, edit) }
        : b,
  );
}

export function updateBlock(tree: Block[], id: string, update: (block: Block) => Block): Block[] {
  return tree.map((b) =>
    b.id === id ? update(b) : b.children ? { ...b, children: updateBlock(b.children, id, update) } : b,
  );
}

export function removeBlock(tree: Block[], id: string): Block[] {
  return tree.filter((b) => b.id !== id).map((b) => (b.children ? { ...b, children: removeBlock(b.children, id) } : b));
}

function listAt(tree: Block[], parentId: string | null): Block[] | null {
  if (parentId === null) return tree;
  const loc = findBlock(tree, parentId);
  return loc ? (loc.block.children ?? []) : null;
}

const limitFor = (parentId: string | null) => (parentId === null ? MAX_BLOCKS : MAX_CHILDREN);

// Whether one more block fits in that list (top level or a container's children).
export function hasRoom(tree: Block[], parentId: string | null): boolean {
  const list = listAt(tree, parentId);
  return !!list && list.length < limitFor(parentId);
}

export function insertBlock(tree: Block[], parentId: string | null, index: number, block: Block): Block[] {
  if (!hasRoom(tree, parentId)) return tree;
  return editList(tree, parentId, (list) => {
    const at = Math.max(0, Math.min(index, list.length));
    return [...list.slice(0, at), block, ...list.slice(at)];
  });
}

function contains(block: Block, id: string): boolean {
  return (block.children ?? []).some((c) => c.id === id || contains(c, id));
}

// Moves a block to `index` in `parentId`'s list, where `index` counts positions before the move
// (dropping on an item places the dragged one before it). A block can't go inside itself, and a
// full list refuses it; either way the tree comes back unchanged.
export function moveBlock(tree: Block[], id: string, parentId: string | null, index: number): Block[] {
  const from = findBlock(tree, id);
  if (!from) return tree;
  if (parentId !== null && (parentId === id || contains(from.block, parentId))) return tree;
  const sameList = from.parentId === parentId;
  if (!sameList && !hasRoom(tree, parentId)) return tree;
  const target = sameList && from.index < index ? index - 1 : index;
  if (sameList && target === from.index) return tree;
  const without = removeBlock(tree, id);
  return editList(without, parentId, (list) => {
    const at = Math.max(0, Math.min(target, list.length));
    return [...list.slice(0, at), from.block, ...list.slice(at)];
  });
}

// Up (-1) or down (+1) among its siblings; out of range is a no-op.
export function moveBy(tree: Block[], id: string, delta: -1 | 1): Block[] {
  const loc = findBlock(tree, id);
  if (!loc) return tree;
  const target = loc.index + delta;
  if (target < 0 || target >= loc.siblings) return tree;
  return editList(tree, loc.parentId, (list) => {
    const next = [...list];
    [next[loc.index], next[target]] = [next[target]!, next[loc.index]!];
    return next;
  });
}

function cloneWithIds(block: Block, makeId: () => string): Block {
  const copy = structuredClone(block);
  const reassign = (b: Block): Block => ({ ...b, id: makeId(), children: b.children?.map(reassign) });
  const out = reassign(copy);
  if (!block.children) delete out.children;
  return out;
}

// A copy (with fresh ids throughout) placed right after the original.
export function duplicateBlock(
  tree: Block[],
  id: string,
  makeId: () => string = newBlockId,
): { tree: Block[]; id: string | null } {
  const loc = findBlock(tree, id);
  if (!loc || !hasRoom(tree, loc.parentId)) return { tree, id: null };
  const copy = cloneWithIds(loc.block, makeId);
  return { tree: insertBlock(tree, loc.parentId, loc.index + 1, copy), id: copy.id ?? null };
}

export function countBlocks(tree: Block[]): number {
  return tree.reduce((n, b) => n + 1 + countBlocks(b.children ?? []), 0);
}

// ---- schema-driven props -------------------------------------------------------------------

export const blockSchema = (def: BlockDef) => def.schema as JsonSchema;

// Props for a newly added block: the registry's defaults, plus a starting value for required
// lists, objects, numbers and choices. Required text stays empty so the form asks for it.
export function defaultProps(def: BlockDef): Record<string, unknown> {
  const schema = blockSchema(def);
  const props: Record<string, unknown> = {};
  for (const key of schema.required ?? []) {
    const sub = schema.properties?.[key];
    // free text and free-form values (rich text) start empty
    if (!sub || (sub.enum === undefined && (sub.type === "string" || sub.type === undefined))) continue;
    props[key] = emptyValue(sub);
  }
  return { ...props, ...structuredClone(def.defaults) };
}

// Optional text left empty is left out rather than stored as "", at any depth.
export function cleanValue(schema: JsonSchema | undefined, value: unknown): unknown {
  if (!schema) return value;
  if (Array.isArray(value) && schema.type === "array") return value.map((item) => cleanValue(schema.items, item));
  if (isRecord(value) && schema.properties) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const required = schema.required?.includes(key);
      if (v === undefined) continue;
      if (v === "" && !required) continue;
      if (typeof v === "number" && Number.isNaN(v) && !required) continue;
      out[key] = cleanValue(schema.properties[key], v);
    }
    return out;
  }
  return value;
}

export function cleanSettings(settings: BlockSettings | undefined): BlockSettings | undefined {
  if (!settings) return undefined;
  const out: BlockSettings = {};
  if (settings.hideOn?.length) out.hideOn = settings.hideOn;
  const a = settings.audience;
  if (a) {
    const audience: NonNullable<BlockSettings["audience"]> = {};
    if (a.markets?.length) audience.markets = a.markets;
    if (a.segmentIds?.length) audience.segmentIds = a.segmentIds;
    if (a.loggedIn !== undefined) audience.loggedIn = a.loggedIn;
    if (a.newVisitors !== undefined) audience.newVisitors = a.newVisitors;
    if (Object.keys(audience).length) out.audience = audience;
  }
  const s = settings.schedule;
  if (s?.startsAt || s?.endsAt) {
    out.schedule = { ...(s.startsAt ? { startsAt: s.startsAt } : {}), ...(s.endsAt ? { endsAt: s.endsAt } : {}) };
  }
  const e = settings.experiment;
  if (e && (e.key.trim() || e.variant.trim())) out.experiment = { key: e.key.trim(), variant: e.variant.trim() };
  return Object.keys(out).length ? out : undefined;
}

// The tree as it's sent to the API: props cleaned per their schema, empty settings and empty
// child lists left out.
export function toApiBlocks(tree: Block[], defs: BlockDef[]): Block[] {
  const byType = new Map(defs.map((d) => [d.type, d]));
  return tree.map((b) => {
    const def = byType.get(b.type);
    const out: Block = {
      id: b.id,
      type: b.type,
      props: def ? (cleanValue(blockSchema(def), b.props ?? {}) as Record<string, unknown>) : (b.props ?? {}),
    };
    const settings = cleanSettings(b.settings);
    if (settings) out.settings = settings;
    if (b.children?.length) out.children = toApiBlocks(b.children, defs);
    return out;
  });
}

// What a block's settings change, in words, for the outline ("Hidden on mobile", "Scheduled", …).
export function settingsSummary(settings: BlockSettings | undefined): string[] {
  const s = cleanSettings(settings);
  if (!s) return [];
  const out: string[] = [];
  if (s.hideOn?.length) out.push(`Hidden on ${s.hideOn.join(", ")}`);
  if (s.audience) out.push("Targeted");
  if (s.schedule) out.push("Scheduled");
  if (s.experiment) out.push(`Experiment ${s.experiment.key || "?"}/${s.experiment.variant || "?"}`);
  return out;
}

// Field-level problems found before saving, by block id then by prop path ("slides.0.mediaId").
export function validateTree(tree: Block[], defs: BlockDef[]): Record<string, Record<string, string>> {
  const byType = new Map(defs.map((d) => [d.type, d]));
  const out: Record<string, Record<string, string>> = {};
  const walk = (list: Block[]) => {
    for (const b of list) {
      const def = byType.get(b.type);
      if (def && b.id) {
        const errors = validate(blockSchema(def), cleanValue(blockSchema(def), b.props ?? {}));
        const e = b.settings?.experiment;
        if (e && (e.key.trim() || e.variant.trim()) && (!e.key.trim() || !e.variant.trim()))
          errors["settings.experiment"] = "An experiment needs both a key and a variant";
        const s = b.settings?.schedule;
        if (s?.startsAt && s.endsAt && Date.parse(s.endsAt) <= Date.parse(s.startsAt))
          errors["settings.schedule"] = "The end must be after the start";
        if (Object.keys(errors).length) out[b.id] = errors;
      }
      if (b.children) walk(b.children);
    }
  };
  walk(tree);
  return out;
}

// A short line describing the block in the outline: its heading or title, if it has one.
export function blockSummary(block: Block): string {
  const p = block.props ?? {};
  for (const key of ["heading", "title", "sectionHandle", "caption", "alt", "url"]) {
    const v = p[key];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 80);
  }
  for (const key of ["items", "slides", "collectionHandles", "productIds"]) {
    const v = p[key];
    if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? "item" : "items"}`;
  }
  return "";
}

// ---- API errors ------------------------------------------------------------------------------

export type PageErrors = {
  // page fields ("handle", "title", "seo", …)
  fields: Record<string, string>;
  // by block id: problems with the block itself ("") and its props by path
  blocks: Record<string, Record<string, string>>;
  // anything that couldn't be placed on a field or a block
  general: string[];
};

// "heading: Invalid input; slides.0.mediaId: Required" → { heading: …, "slides.0.mediaId": … }
export function parsePropErrors(message: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of message.split("; ")) {
    const at = part.indexOf(": ");
    if (at < 0) {
      out[""] = out[""] ? `${out[""]}; ${part}` : part;
      continue;
    }
    const path = part.slice(0, at);
    out[path] ??= part.slice(at + 2);
  }
  return out;
}

// Block paths the API uses ("blocks[0].children[1]") → the id of that block in this tree.
export function blockIdAtPath(tree: Block[], path: string): string | null {
  const steps = [...path.matchAll(/(?:^blocks|\.children)\[(\d+)\]/g)].map((m) => Number(m[1]));
  if (!steps.length) return null;
  let list: Block[] | undefined = tree;
  let block: Block | undefined;
  for (const i of steps) {
    block = list?.[i];
    list = block?.children;
  }
  return block?.id ?? null;
}

// Splits an error response from saving a page into page-field errors, per-block errors and the
// rest. Block validation answers { "blocks[0].props": "heading: …" }; request validation answers
// z.flattenError's { fieldErrors, formErrors }.
// `tree` must be the tree that was sent (same order as the API's indexes).
export function pageErrors(error: unknown, tree: Block[]): PageErrors {
  const out: PageErrors = { fields: {}, blocks: {}, general: [] };
  const body = apiErrorBody(error);
  if (body?.code !== "VALIDATION_FAILED") return out;
  const details = body.details;
  if (!isRecord(details)) return out;
  if ("fieldErrors" in details || "formErrors" in details) {
    const flat = details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    for (const [key, messages] of Object.entries(flat.fieldErrors ?? {})) {
      if (messages?.[0]) out.fields[key] = messages[0];
    }
    out.general.push(...(flat.formErrors ?? []));
    return out;
  }
  for (const [path, message] of Object.entries(details)) {
    if (typeof message !== "string") continue;
    const id = path.startsWith("blocks[") ? blockIdAtPath(tree, path) : null;
    if (!id) {
      if (path.startsWith("blocks")) out.general.push(`${path}: ${message}`);
      else out.fields[path] = message;
      continue;
    }
    const target = (out.blocks[id] ??= {});
    const rest = path.slice(path.lastIndexOf("]") + 1);
    if (rest.endsWith(".props")) Object.assign(target, parsePropErrors(message));
    else target[""] = target[""] ? `${target[""]}; ${message}` : message;
  }
  return out;
}

// ---- publishing & preview -------------------------------------------------------------------

export type PageState = "draft" | "scheduled" | "live" | "archived";

export function pageState(
  p: { status: "DRAFT" | "ACTIVE" | "ARCHIVED"; publishAt: string | null },
  now = new Date(),
): PageState {
  if (p.status === "ARCHIVED") return "archived";
  if (p.publishAt && new Date(p.publishAt) > now) return "scheduled";
  return p.status === "ACTIVE" ? "live" : "draft";
}

export const PAGE_STATE_LABEL: Record<PageState, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  archived: "Archived",
};

// The storefront route that opens a draft preview (app/api/preview). Without a market segment it
// uses the storefront's default market.
export function previewPath(link: { handle: string; token: string }, segment?: string | null): string {
  const params = new URLSearchParams({ handle: link.handle, token: link.token });
  if (segment) params.set("market", segment);
  return `/api/preview?${params.toString()}`;
}

// "{locale}-{market handle}" for every active market and locale it offers, default market first.
export function marketSegments(
  markets: { handle: string; defaultLocale: string; locales: string[]; isActive: boolean; isDefault: boolean }[],
): string[] {
  return [...markets]
    .filter((m) => m.isActive)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .flatMap((m) =>
      [m.defaultLocale, ...m.locales.filter((l) => l !== m.defaultLocale)].map((l) => `${l}-${m.handle}`),
    );
}
