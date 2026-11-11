"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetV1AdminAffiliatesConfigTiersQuery,
  useGetV1AdminCategoriesQuery,
  useGetV1AdminChannelsQuery,
  useGetV1AdminCollectionsQuery,
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminMarketsQuery,
  useGetV1AdminProductsQuery,
  useGetV1AdminSegmentsQuery,
  useGetV1AdminShippingZonesQuery,
} from "../../store/api.generated";
import { shortId } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney, inputToMinor, minorToInput } from "../../lib/money";
import { FILTER_KEYS, summarizeFilter, type ItemFilter, type Names } from "./promotion-rules";

export type Option = { value: string; label: string };

// ── Lookup data for the builders ─────────────────────────────────────────────

type RuleOptions = {
  // amounts in rules are minor units of the store's default currency
  currency: string;
  ready: boolean;
  collections: Option[];
  categories: Option[];
  groups: Option[];
  segments: Option[];
  tiers: Option[];
  channels: Option[];
  rates: Option[];
  currencies: Option[];
  countries: Option[];
  names: Names;
  rememberName: (id: string, label: string) => void;
};

const RuleOptionsContext = createContext<RuleOptions | null>(null);

export function useRuleOptions(): RuleOptions {
  const value = useContext(RuleOptionsContext);
  if (!value) throw new Error("useRuleOptions outside RuleOptionsProvider");
  return value;
}

// Pickers fall back to typing IDs when a list can't be loaded (a role without that permission).
export function RuleOptionsProvider({ children }: { children: ReactNode }) {
  const { data: marketData, isLoading: marketsLoading } = useGetV1AdminMarketsQuery({});
  const collections = useGetV1AdminCollectionsQuery({});
  const categories = useGetV1AdminCategoriesQuery({});
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const segments = useGetV1AdminSegmentsQuery({});
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});
  const channels = useGetV1AdminChannelsQuery({});
  const zones = useGetV1AdminShippingZonesQuery({});
  const [picked, setPicked] = useState<Names>({});

  const value = useMemo<RuleOptions>(() => {
    const opt = <T,>(rows: T[] | undefined, value: (r: T) => string, label: (r: T) => string) =>
      (Array.isArray(rows) ? rows : []).map((r) => ({ value: value(r), label: label(r) }));
    const marketRows = marketData ?? [];
    const lists = {
      collections: opt(
        collections.data,
        (c) => c.id,
        (c) => c.title,
      ),
      categories: opt(
        categories.data,
        (c) => c.id,
        (c) => c.name,
      ),
      groups: opt(
        groups.data,
        (g) => g.id,
        (g) => g.name,
      ),
      segments: opt(
        segments.data,
        (s) => s.id,
        (s) => s.name,
      ),
      tiers: opt(
        tiers.data,
        (t) => t.id,
        (t) => t.name,
      ),
      channels: opt(
        channels.data,
        (c) => c.id,
        (c) => c.name,
      ),
      rates: (zones.data ?? []).flatMap((z) =>
        z.rates.map((r) => ({
          value: r.id,
          label: `${z.name}: ${r.name} (${formatMoney(r.amountMinor, r.currency)})`,
        })),
      ),
    };
    const currencies = [...new Set(marketRows.map((m) => m.currency))].map((c) => ({ value: c, label: c }));
    const countries = [...new Set(marketRows.flatMap((m) => m.countries))].sort().map((c) => ({ value: c, label: c }));
    const names: Names = { ...picked };
    for (const list of Object.values(lists)) for (const o of list) names[o.value] = o.label;
    return {
      currency: marketRows.find((m) => m.isDefault)?.currency ?? marketRows[0]?.currency ?? DEFAULT_CURRENCY,
      ready: !marketsLoading,
      ...lists,
      currencies,
      countries,
      names,
      rememberName: (id, label) => setPicked((p) => (p[id] === label ? p : { ...p, [id]: label })),
    };
  }, [
    marketData,
    marketsLoading,
    collections.data,
    categories.data,
    groups.data,
    segments.data,
    tiers.data,
    channels.data,
    zones.data,
    picked,
  ]);

  return <RuleOptionsContext.Provider value={value}>{children}</RuleOptionsContext.Provider>;
}

// ── Number input ─────────────────────────────────────────────────────────────

type NumberKind = "int" | "decimal" | "money";

function parseNumber(text: string, kind: NumberKind, currency: string): number | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (kind === "money") return inputToMinor(t, currency) ?? undefined;
  const ok = kind === "int" ? /^\d+$/.test(t) : /^\d+(\.\d+)?$/.test(t);
  return ok ? Number(t) : Number.NaN;
}

function formatNumber(value: number | undefined, kind: NumberKind, currency: string) {
  if (value === undefined || Number.isNaN(value)) return "";
  return kind === "money" ? minorToInput(value, currency) : String(value);
}

const sameNumber = (a: number | undefined, b: number | undefined) =>
  a === b || (a !== undefined && b !== undefined && Number.isNaN(a) && Number.isNaN(b));

// A number field over a numeric value: keeps what was typed, reports undefined when empty and
// NaN when it isn't a number (validation flags it; `invalid` shows it). Money is typed in major units.
export function NumberInput({
  value,
  onChange,
  kind = "int",
  currency = DEFAULT_CURRENCY,
  invalid,
  className = "h-8 w-32",
  ...props
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  kind?: NumberKind;
  currency?: string;
  invalid?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const [text, setText] = useState(() => formatNumber(value, kind, currency));
  // an outside change (type switch, reset) shows the new value; typing keeps the text as is
  const shown = sameNumber(parseNumber(text, kind, currency), value) ? text : formatNumber(value, kind, currency);
  return (
    <Input
      {...props}
      inputMode={kind === "int" ? "numeric" : "decimal"}
      className={className}
      value={shown}
      aria-invalid={invalid ? true : undefined}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNumber(e.target.value, kind, currency));
      }}
    />
  );
}

// ── Token list (IDs, codes, tags) ────────────────────────────────────────────

export function TokenListInput({
  id,
  label,
  values,
  onChange,
  options,
  names = {},
  normalize = (v) => v.trim(),
  placeholder,
  disabled,
  invalid,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options?: Option[];
  names?: Names;
  normalize?: (value: string) => string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string[]) => {
    const next = [...new Set([...values, ...raw.map(normalize).filter(Boolean)])];
    if (next.length !== values.length) onChange(next);
  };
  const remaining = (options ?? []).filter((o) => !values.includes(o.value));
  const labelOf = (v: string) => options?.find((o) => o.value === v)?.label ?? names[v] ?? v;

  return (
    <div className="space-y-1.5">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label={`${label}: chosen`}>
          {values.map((v) => (
            <li
              key={v}
              className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background py-0.5 pr-0.5 pl-2 text-xs"
              title={v}
            >
              <span className="truncate">{labelOf(v)}</span>
              {!disabled && (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove ${labelOf(v)}`}
                  onClick={() => onChange(values.filter((x) => x !== v))}
                >
                  <XIcon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          {remaining.length > 0 && (
            <Select value={null} onValueChange={(v) => v && add([String(v)])}>
              <SelectTrigger size="sm" aria-label={`Add from ${label.toLowerCase()}`} className="max-w-56 min-w-36">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {remaining.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            id={id}
            className="h-7 w-44 text-xs"
            placeholder={placeholder ?? (options?.length ? "…or type an ID" : "Type and press Enter")}
            aria-invalid={invalid ? true : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft.split(","));
                setDraft("");
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!draft.trim()}
            aria-label={`Add to ${label.toLowerCase()}`}
            onClick={() => {
              add(draft.split(","));
              setDraft("");
            }}
          >
            <PlusIcon /> Add
          </Button>
        </div>
      )}
      {disabled && values.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
    </div>
  );
}

// ── Product search ───────────────────────────────────────────────────────────

export function ProductSearch({
  id,
  label = "Find a product",
  onPick,
  isPicked,
}: {
  id: string;
  label?: string;
  onPick: (product: { id: string; title: string }) => void;
  isPicked?: (productId: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const search = useGetV1AdminProductsQuery({ q, limit: 8 }, { skip: q.length < 2 });
  return (
    <div className="space-y-1">
      <div className="relative max-w-xs">
        <SearchIcon
          className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={id}
          aria-label={label}
          placeholder={label}
          className="h-7 pl-8 text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {q.length >= 2 && (
        <ul className="max-w-xs divide-y rounded-md border bg-background text-xs">
          {search.isFetching && !search.data && <li className="px-3 py-1.5 text-muted-foreground">Searching…</li>}
          {search.data?.items.length === 0 && <li className="px-3 py-1.5 text-muted-foreground">No matches.</li>}
          {search.data?.items.map((p) => {
            const picked = isPicked?.(p.id) ?? false;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={picked}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
                  onClick={() => onPick({ id: p.id, title: p.title })}
                >
                  <span className="truncate">{p.title}</span>
                  <span className="text-muted-foreground">{picked ? "Added" : "Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Item filter ──────────────────────────────────────────────────────────────

// Which items a condition or action looks at. Empty means every item; within a field any value
// matches, and every filled field must match.
export function FilterEditor({
  idPrefix,
  title,
  filter,
  onChange,
  disabled,
  defaultOpen,
}: {
  idPrefix: string;
  title: string;
  filter: ItemFilter | undefined;
  onChange: (filter: ItemFilter) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}) {
  const options = useRuleOptions();
  const f = filter ?? {};
  const set = (key: keyof ItemFilter, values: string[]) => onChange({ ...f, [key]: values });
  const optionsFor: Partial<Record<keyof ItemFilter, Option[]>> = {
    collectionIds: options.collections,
    categoryIds: options.categories,
  };

  return (
    <details className="group rounded-md border bg-background/60" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-3 py-2 text-xs select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{title}:</span>{" "}
        <span className="text-muted-foreground">{summarizeFilter(f, options.names)}</span>
        <span className="ml-1 text-muted-foreground group-open:hidden">(edit)</span>
      </summary>
      <div className="grid gap-3 border-t p-3 md:grid-cols-2">
        {FILTER_KEYS.map(({ key, label }) => (
          <Field key={key} className="gap-1.5">
            <FieldLabel htmlFor={`${idPrefix}-${key}`} className="text-xs">
              {label}
            </FieldLabel>
            {key === "productIds" ? (
              <>
                <TokenListInput
                  id={`${idPrefix}-${key}-ids`}
                  label={label}
                  values={f.productIds ?? []}
                  names={options.names}
                  disabled={disabled}
                  placeholder="…or paste a product ID"
                  onChange={(v) => set(key, v)}
                />
                {!disabled && (
                  <ProductSearch
                    id={`${idPrefix}-${key}`}
                    isPicked={(id) => (f.productIds ?? []).includes(id)}
                    onPick={(p) => {
                      options.rememberName(p.id, p.title);
                      set(key, [...new Set([...(f.productIds ?? []), p.id])]);
                    }}
                  />
                )}
              </>
            ) : (
              <TokenListInput
                id={`${idPrefix}-${key}`}
                label={label}
                values={f[key] ?? []}
                options={optionsFor[key]}
                names={options.names}
                disabled={disabled}
                placeholder={key === "tags" ? "Tag, then Enter" : key === "vendors" ? "Vendor, then Enter" : undefined}
                onChange={(v) => set(key, v)}
              />
            )}
          </Field>
        ))}
      </div>
    </details>
  );
}

export const displayName = (names: Names, id: string) => names[id] ?? shortId(id);
