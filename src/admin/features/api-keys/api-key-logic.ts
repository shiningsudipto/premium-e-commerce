import type { GetV1AdminApiKeysApiResponse, PostV1AdminApiKeysApiArg } from "../../store/api.generated";
import { can } from "../../lib/permissions";

// API keys (spec §11.4): machine access with a subset of staff permissions as scopes.

export type ApiKey = GetV1AdminApiKeysApiResponse[number];
export type ApiKeyBody = PostV1AdminApiKeysApiArg["body"];

export const MAX_NAME = 100;
const DAY = 86_400_000;

// ── Status ──────────────────────────────────────────────────────────────────

export type KeyStatus = "active" | "expired" | "revoked";

export function keyStatus(key: Pick<ApiKey, "revokedAt" | "expiresAt">, now = new Date()): KeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) return "expired";
  return "active";
}

export const KEY_STATUS: Record<KeyStatus, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  active: { label: "Active", variant: "secondary" },
  expired: { label: "Expired", variant: "outline" },
  revoked: { label: "Revoked", variant: "destructive" },
};

// ── Scopes ──────────────────────────────────────────────────────────────────

export type ScopeOption = { scope: string; held: boolean };

// The staff permission catalog grouped by area ("orders.refund" → "orders"). A key can only get
// scopes its creator holds, so the others are shown but not selectable.
export function scopeGroups(
  catalog: readonly string[],
  granted: readonly string[] | undefined,
): [string, ScopeOption[]][] {
  const groups = new Map<string, ScopeOption[]>();
  for (const scope of catalog) {
    const group = scope.split(".")[0]!;
    groups.set(group, [...(groups.get(group) ?? []), { scope, held: can(granted, scope) }]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function toggleScope(selected: readonly string[], scope: string, on: boolean): string[] {
  const rest = selected.filter((s) => s !== scope);
  return on ? [...rest, scope] : rest;
}

export function toggleScopeGroup(selected: readonly string[], options: readonly ScopeOption[], on: boolean): string[] {
  const scopes = options.filter((o) => o.held).map((o) => o.scope);
  const rest = selected.filter((s) => !scopes.includes(s));
  return on ? [...rest, ...scopes] : rest;
}

// "checked" | "mixed" | "unchecked" for a group's select-all box (held scopes only)
export function groupState(
  selected: readonly string[],
  options: readonly ScopeOption[],
): "checked" | "mixed" | "unchecked" {
  const held = options.filter((o) => o.held);
  const on = held.filter((o) => selected.includes(o.scope)).length;
  if (on === 0) return "unchecked";
  return on === held.length ? "checked" : "mixed";
}

// ── Expiry ──────────────────────────────────────────────────────────────────

export type ExpiryChoice = "never" | "30" | "90" | "365" | "custom";

export const EXPIRY_CHOICES: { value: ExpiryChoice; label: string }[] = [
  { value: "never", label: "Never expires" },
  { value: "30", label: "In 30 days" },
  { value: "90", label: "In 90 days" },
  { value: "365", label: "In a year" },
  { value: "custom", label: "On a date…" },
];

// The expiry as an ISO timestamp (null for never). A custom date ("YYYY-MM-DD") ends at the
// close of that day in the browser's time zone. Returns undefined for a missing/invalid date.
export function expiresAt(choice: ExpiryChoice, customDate: string, now = new Date()): string | null | undefined {
  if (choice === "never") return null;
  if (choice !== "custom") return new Date(now.getTime() + Number(choice) * DAY).toISOString();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customDate);
  if (!m) return undefined;
  const end = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
  return Number.isNaN(end.getTime()) ? undefined : end.toISOString();
}

// ── Form ────────────────────────────────────────────────────────────────────

export type KeyForm = { name: string; scopes: string[]; expiry: ExpiryChoice; customDate: string };
export type KeyErrors = Partial<Record<"name" | "scopes" | "expiry", string>>;

export function validateKey(form: KeyForm, now = new Date()): KeyErrors {
  const errors: KeyErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Name is required";
  else if (name.length > MAX_NAME) errors.name = `At most ${MAX_NAME} characters`;
  if (!form.scopes.length) errors.scopes = "Choose at least one scope";
  const expiry = expiresAt(form.expiry, form.customDate, now);
  if (expiry === undefined) errors.expiry = "Choose a date";
  else if (expiry && new Date(expiry).getTime() <= now.getTime()) errors.expiry = "Choose a date in the future";
  return errors;
}

export function keyBody(form: KeyForm, now = new Date()): ApiKeyBody {
  return {
    name: form.name.trim(),
    scopes: [...form.scopes].sort(),
    expiresAt: expiresAt(form.expiry, form.customDate, now) ?? null,
  };
}

// Revoking is typed out: the exact key name (surrounding spaces ignored).
export const confirmsRevoke = (typed: string, key: Pick<ApiKey, "name">) => typed.trim() === key.name.trim();
