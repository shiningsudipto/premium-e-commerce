import type { GetV1AdminTranslationsLocalesApiResponse } from "../../store/api.generated";
import { buildTranslatedBlocks, pageTextGroups, savedPageValues, type FieldKind } from "./page-blocks";
import { plainToRichText, richTextToPlain } from "./rich-text";

// The translations editor as data: for one item, the rows to show (English text next to a Bangla
// input), the values already saved, and how the inputs turn into the API's `fields`. One shape for
// every kind of content, so the screen only renders groups of rows.

export type EntityType = GetV1AdminTranslationsLocalesApiResponse["entityTypes"][number];

export const ENTITY_TYPES: readonly EntityType[] = ["PRODUCT", "CATEGORY", "COLLECTION", "PAGE", "MENU"];

export const ENTITY_LABELS: Record<EntityType, { one: string; many: string }> = {
  PRODUCT: { one: "Product", many: "Products" },
  CATEGORY: { one: "Category", many: "Categories" },
  COLLECTION: { one: "Collection", many: "Collections" },
  PAGE: { one: "Page", many: "Pages" },
  MENU: { one: "Menu", many: "Menus" },
};

export const isEntityType = (v: unknown): v is EntityType =>
  typeof v === "string" && (ENTITY_TYPES as string[]).includes(v);

// Languages by their code: the English name, and the name in the language itself.
const LOCALE_NAMES: Record<string, { name: string; native: string }> = {
  bn: { name: "Bangla", native: "বাংলা" },
};

export const localeName = (code: string) => LOCALE_NAMES[code] ?? { name: code.toUpperCase(), native: "" };

export type FieldRow = {
  key: string;
  label: string;
  kind: FieldKind;
  max?: number;
  // the English text (plain text for rich text)
  source: string;
  // the API validation error key that points at this row
  errorKey?: string;
};

export type FieldGroup = {
  id: string;
  title: string;
  description?: string;
  // API validation errors for this key (or below it) show on the group
  errorKey?: string;
  rows: FieldRow[];
};

export type EditorModel = {
  groups: FieldGroup[];
  // the saved translation, as input values
  initial: Record<string, string>;
  // the PUT body's `fields` for these input values (blank inputs left out)
  build: (values: Record<string, string>) => Record<string, unknown>;
};

export const LIMITS = { title: 200, seoTitle: 200, seoDescription: 500, label: 200, optionName: 100 } as const;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const trimmed = (values: Record<string, string>, key: string) => (values[key] ?? "").trim();

// Plain objects with the blank entries removed.
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "" && !(isRecord(v) && !Object.keys(v).length)),
  ) as Partial<T>;
}

// ── Shared pieces: name/title, description, SEO ──

type Basics = { nameKey: "title" | "name"; nameLabel: string };

function basicsGroup(source: Record<string, unknown>, { nameKey, nameLabel }: Basics): FieldGroup {
  return {
    id: "basics",
    title: "Details",
    rows: [
      {
        key: nameKey,
        label: nameLabel,
        kind: "text",
        max: LIMITS.title,
        source: str(source[nameKey]),
        errorKey: nameKey,
      },
      {
        key: "description",
        label: "Description",
        kind: "rich",
        source: richTextToPlain(source.description),
        errorKey: "description",
      },
    ],
  };
}

function seoGroup(source: Record<string, unknown>): FieldGroup {
  const seo = isRecord(source.seo) ? source.seo : {};
  return {
    id: "seo",
    title: "Search engines",
    description: "Left blank, search engines get the translated title and description.",
    errorKey: "seo",
    rows: [
      { key: "seo.title", label: "SEO title", kind: "text", max: LIMITS.seoTitle, source: str(seo.title) },
      {
        key: "seo.description",
        label: "SEO description",
        kind: "long",
        max: LIMITS.seoDescription,
        source: str(seo.description),
      },
    ],
  };
}

function basicsInitial(t: Record<string, unknown>, nameKey: string): Record<string, string> {
  const seo = isRecord(t.seo) ? t.seo : {};
  return compact({
    [nameKey]: str(t[nameKey]),
    description: richTextToPlain(t.description),
    "seo.title": str(seo.title),
    "seo.description": str(seo.description),
  }) as Record<string, string>;
}

function basicsFields(values: Record<string, string>, nameKey: string) {
  return compact({
    [nameKey]: trimmed(values, nameKey) || undefined,
    description: plainToRichText(values.description ?? ""),
    seo: compact({
      title: trimmed(values, "seo.title") || undefined,
      description: trimmed(values, "seo.description") || undefined,
    }),
  });
}

// ── Products: options and their values ──

type SourceOption = { name: string; values: string[] };

function readOptions(raw: unknown): SourceOption[] {
  return (Array.isArray(raw) ? raw : []).flatMap((o): SourceOption[] =>
    isRecord(o) && typeof o.name === "string"
      ? [
          {
            name: o.name,
            values: (Array.isArray(o.values) ? o.values : []).filter((v): v is string => typeof v === "string"),
          },
        ]
      : [],
  );
}

const optionNameKey = (i: number) => `option.${i}.name`;
const optionValueKey = (i: number, j: number) => `option.${i}.value.${j}`;

function optionGroups(options: SourceOption[]): FieldGroup[] {
  return options.map((o, i) => ({
    id: `option-${i}`,
    title: `Option: ${o.name}`,
    description: i === 0 ? "Shoppers pick variants by these names and values." : undefined,
    errorKey: "options",
    rows: [
      { key: optionNameKey(i), label: "Option name", kind: "text" as const, max: LIMITS.optionName, source: o.name },
      ...o.values.map((v, j) => ({
        key: optionValueKey(i, j),
        label: `Value ${j + 1}`,
        kind: "text" as const,
        max: LIMITS.label,
        source: v,
      })),
    ],
  }));
}

function optionsInitial(options: SourceOption[], raw: unknown): Record<string, string> {
  const t = isRecord(raw) ? raw : {};
  const out: Record<string, string> = {};
  options.forEach((o, i) => {
    const entry = isRecord(t[o.name]) ? (t[o.name] as Record<string, unknown>) : {};
    if (str(entry.name)) out[optionNameKey(i)] = str(entry.name);
    const values = isRecord(entry.values) ? entry.values : {};
    o.values.forEach((v, j) => {
      if (str(values[v])) out[optionValueKey(i, j)] = str(values[v]);
    });
  });
  return out;
}

// { [English option name]: { name?, values?: { [English value]: translated } } }
export function buildOptions(options: SourceOption[], values: Record<string, string>) {
  const out: Record<string, { name?: string; values?: Record<string, string> }> = {};
  options.forEach((o, i) => {
    const translatedValues: Record<string, string> = {};
    o.values.forEach((v, j) => {
      const t = trimmed(values, optionValueKey(i, j));
      if (t) translatedValues[v] = t;
    });
    const entry = compact({ name: trimmed(values, optionNameKey(i)) || undefined, values: translatedValues });
    if (Object.keys(entry).length) out[o.name] = entry;
  });
  return out;
}

// ── Menus: labels ──

const labelKey = (i: number) => `label.${i}`;

export function buildLabels(labels: string[], values: Record<string, string>) {
  const out: Record<string, string> = {};
  labels.forEach((label, i) => {
    const t = trimmed(values, labelKey(i));
    if (t) out[label] = t;
  });
  return out;
}

// ── The model for one item ──

export function editorModel(
  type: EntityType,
  source: Record<string, unknown>,
  translation: Record<string, unknown> | null,
): EditorModel {
  const t = translation ?? {};
  switch (type) {
    case "PRODUCT": {
      const options = readOptions(source.options);
      return {
        groups: [
          basicsGroup(source, { nameKey: "title", nameLabel: "Title" }),
          ...optionGroups(options),
          seoGroup(source),
        ],
        initial: { ...basicsInitial(t, "title"), ...optionsInitial(options, t.options) },
        build: (values) => compact({ ...basicsFields(values, "title"), options: buildOptions(options, values) }),
      };
    }
    case "CATEGORY":
    case "COLLECTION": {
      const nameKey = type === "CATEGORY" ? "name" : "title";
      return {
        groups: [basicsGroup(source, { nameKey, nameLabel: type === "CATEGORY" ? "Name" : "Title" }), seoGroup(source)],
        initial: basicsInitial(t, nameKey),
        build: (values) => basicsFields(values, nameKey),
      };
    }
    case "PAGE": {
      const blockGroups = pageTextGroups(source.blocks);
      const seo = isRecord(t.seo) ? t.seo : {};
      return {
        groups: [
          {
            id: "basics",
            title: "Details",
            rows: [
              {
                key: "title",
                label: "Title",
                kind: "text",
                max: LIMITS.title,
                source: str(source.title),
                errorKey: "title",
              },
            ],
          },
          ...blockGroups.map((g, i) => ({
            id: `block-${g.id}`,
            title: g.title,
            description: i === 0 ? "The page's sections, in order. Untranslated texts show in English." : undefined,
            errorKey: g.errorKey,
            rows: g.fields.map((f) => ({ key: f.key, label: f.label, kind: f.kind, max: f.max, source: f.source })),
          })),
          seoGroup(source),
        ],
        initial: compact({
          title: str(t.title),
          "seo.title": str(seo.title),
          "seo.description": str(seo.description),
          ...savedPageValues(source.blocks, t.blocks, blockGroups),
        }) as Record<string, string>,
        build: (values) =>
          compact({
            title: trimmed(values, "title") || undefined,
            seo: compact({
              title: trimmed(values, "seo.title") || undefined,
              description: trimmed(values, "seo.description") || undefined,
            }),
            blocks: buildTranslatedBlocks(source.blocks, blockGroups, values),
          }),
      };
    }
    case "MENU": {
      const labels = (Array.isArray(source.labels) ? source.labels : []).filter(
        (l): l is string => typeof l === "string",
      );
      const saved = isRecord(t.labels) ? t.labels : {};
      return {
        groups: [
          {
            id: "labels",
            title: "Menu labels",
            description: "Each label is translated wherever it appears in the menu.",
            errorKey: "labels",
            rows: labels.map((label, i) => ({
              key: labelKey(i),
              label: `Label ${i + 1}`,
              kind: "text" as const,
              max: LIMITS.label,
              source: label,
            })),
          },
        ],
        initial: Object.fromEntries(
          labels.flatMap((label, i) => (str(saved[label]) ? [[labelKey(i), str(saved[label])]] : [])),
        ),
        build: (values) => compact({ labels: buildLabels(labels, values) }),
      };
    }
  }
}

// ── Progress and errors ──

export function progress(groups: FieldGroup[], values: Record<string, string>) {
  // rows with no English text have nothing to translate
  const rows = groups.flatMap((g) => g.rows).filter((r) => r.source.trim());
  return { total: rows.length, done: rows.filter((r) => trimmed(values, r.key)).length };
}

export const sameFields = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  JSON.stringify(a) === JSON.stringify(b);

// API validation errors (keyed by field, or by block path such as `blocks[2].props`), placed on the
// row or group they belong to; anything that fits nowhere is returned as general.
export function placeErrors(
  groups: FieldGroup[],
  errors: Record<string, unknown>,
): { rows: Record<string, string>; groups: Record<string, string>; general: string[] } {
  const out = { rows: {} as Record<string, string>, groups: {} as Record<string, string>, general: [] as string[] };
  const message = (v: unknown) => (Array.isArray(v) ? v.map(String).join(" ") : String(v));
  for (const [key, raw] of Object.entries(errors)) {
    const text = message(raw);
    const row = groups.flatMap((g) => g.rows).find((r) => r.errorKey === key);
    if (row) {
      out.rows[row.key] = text;
      continue;
    }
    // the deepest group whose key this error is at or under (a block, not its parent column)
    const group = groups
      .filter((g) => g.errorKey && (key === g.errorKey || key.startsWith(`${g.errorKey}.`)))
      .filter((g) => !key.slice(g.errorKey!.length).includes(".children["))
      .sort((a, b) => b.errorKey!.length - a.errorKey!.length)[0];
    if (group) {
      // options errors are shared by every option group: show them once, on the first
      out.groups[group.id] = out.groups[group.id] ? `${out.groups[group.id]} ${text}` : text;
    } else if (key !== "_form" || text) out.general.push(key === "_form" ? text : `${key}: ${text}`);
  }
  return out;
}

// ── List helpers ──

export type TranslationStatus = "missing" | "translated" | "outdated";

export const translationStatus = (item: { translation: unknown; outdated: boolean }): TranslationStatus =>
  !item.translation ? "missing" : item.outdated ? "outdated" : "translated";

export const editorHref = (type: EntityType, entityId: string, locale: string) =>
  `/admin/translations/${type}/${encodeURIComponent(entityId)}?locale=${encodeURIComponent(locale)}`;
