// Flattens before/after snapshots into per-field changes for the audit-diff viewer.

export type DiffEntry = { path: string; kind: "added" | "removed" | "changed"; before?: unknown; after?: unknown };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);

// Arrays are compared as whole values: positions rarely mean anything to the reader.
function flatten(value: unknown, prefix = "", out = new Map<string, unknown>()) {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [key, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${key}` : key, out);
  } else if (prefix) {
    out.set(prefix, value);
  }
  return out;
}

// Housekeeping columns change on every write and would drown the real changes.
const IGNORED = new Set(["version", "updatedAt", "createdAt"]);

// A snapshot that is a plain value (a setting's value, say) shows as a single "value" field.
const asRecord = (v: unknown) => (isPlainObject(v) || v === undefined ? v : { value: v });

export function diffEntries(before: unknown, after: unknown): DiffEntry[] {
  const a = flatten(asRecord(before));
  const b = flatten(asRecord(after));
  const paths = [...new Set([...a.keys(), ...b.keys()])].filter((p) => !IGNORED.has(p.split(".").pop()!)).sort();
  const entries: DiffEntry[] = [];
  for (const path of paths) {
    const hasA = a.has(path) && a.get(path) !== undefined;
    const hasB = b.has(path) && b.get(path) !== undefined;
    if (hasA && !hasB) entries.push({ path, kind: "removed", before: a.get(path) });
    else if (!hasA && hasB) entries.push({ path, kind: "added", after: b.get(path) });
    else if (JSON.stringify(a.get(path)) !== JSON.stringify(b.get(path)))
      entries.push({ path, kind: "changed", before: a.get(path), after: b.get(path) });
  }
  return entries;
}

// The API's audit events carry either `changes` ({ field: { from, to } } or { field: newValue })
// or before/after snapshots; this turns any of them into entries.
export function auditEntries(event: { changes?: unknown; before?: unknown; after?: unknown }): DiffEntry[] {
  if (event.before !== undefined || event.after !== undefined) return diffEntries(event.before, event.after);
  if (!isPlainObject(event.changes)) return [];
  const fromTo = Object.values(event.changes).every((v) => isPlainObject(v) && ("from" in v || "to" in v));
  if (fromTo) {
    const changes = event.changes as Record<string, { from?: unknown; to?: unknown }>;
    return diffEntries(
      Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.from])),
      Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to])),
    );
  }
  return diffEntries({}, event.changes);
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
