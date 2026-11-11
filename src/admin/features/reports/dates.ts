// Date ranges for the reports screen. The URL keeps a preset ("7d", "30d", "90d") or a custom
// range of calendar days ("2026-10-01".."2026-10-31"); the API takes ISO instants. Days are the
// viewer's local days: a range runs from the first day's midnight to the last day's end.

export type Interval = "day" | "week" | "month";
export const PRESETS = [
  { id: "7d", days: 7, label: "Last 7 days" },
  { id: "30d", days: 30, label: "Last 30 days" },
  { id: "90d", days: 90, label: "Last 90 days" },
] as const;
export type PresetId = (typeof PRESETS)[number]["id"];
export const DEFAULT_PRESET: PresetId = "30d";

export type RangeChoice = { preset: PresetId } | { preset: "custom"; from: string; to: string };
export type Range = { from: Date; to: Date; days: number; label: string };

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// "2026-11-08" for a local date
export function toDateInput(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function fromDateInput(value: string): Date | null {
  if (!DATE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayCount = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1;

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Reads ?range= / ?from= / ?to= into a choice, falling back to the default preset.
export function parseRangeParams(params: { get(name: string): string | null }): RangeChoice {
  const range = params.get("range");
  if (range === "custom") {
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (!customRangeError(from, to)) return { preset: "custom", from, to };
  }
  const preset = PRESETS.find((p) => p.id === range);
  return { preset: preset?.id ?? DEFAULT_PRESET };
}

export const MAX_CUSTOM_DAYS = 731;

export function customRangeError(from: string, to: string): string | null {
  const f = fromDateInput(from);
  const t = fromDateInput(to);
  if (!f || !t) return "Enter both dates.";
  if (f > t) return "The start date must be on or before the end date.";
  if (dayCount(f, t) > MAX_CUSTOM_DAYS) return "Choose a range of at most two years.";
  return null;
}

// The instants a choice covers, given the current time. A preset of n days ends today and
// includes it.
export function resolveRange(choice: RangeChoice, now: Date): Range {
  if (choice.preset === "custom") {
    const from = startOfDay(fromDateInput(choice.from)!);
    const to = endOfDay(fromDateInput(choice.to)!);
    return { from, to, days: dayCount(from, to), label: `${shortDate.format(from)} – ${shortDate.format(to)}` };
  }
  const preset = PRESETS.find((p) => p.id === choice.preset)!;
  const to = endOfDay(now);
  const from = addDays(startOfDay(now), -(preset.days - 1));
  return { from, to, days: preset.days, label: preset.label };
}

// The same number of days immediately before a range, for "vs previous period".
export function previousRange(range: Range): Range {
  const to = endOfDay(addDays(range.from, -1));
  const from = addDays(startOfDay(range.from), -range.days);
  return { from, to, days: range.days, label: `previous ${range.days} days` };
}

// A grouping that gives a readable number of points: days up to a month, weeks up to about
// six months, months beyond.
export function autoInterval(days: number): Interval {
  if (days <= 31) return "day";
  if (days <= 183) return "week";
  return "month";
}

// Period starts as the API's date_trunc makes them (UTC: midnight, Monday, the 1st).
function truncate(date: Date, interval: Interval): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (interval === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (interval === "month") d.setUTCDate(1);
  return d;
}

function step(date: Date, interval: Interval): Date {
  const d = new Date(date);
  if (interval === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (interval === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// The API only returns periods that had orders. This puts the empty periods back (with
// zero values from `empty`) so a chart's x-axis is continuous. Periods the API returned that
// don't line up with the generated ones are kept, in order.
export function fillPeriods<T extends { period: string }>(
  series: T[],
  range: { from: Date; to: Date },
  interval: Interval,
  empty: (period: string) => T,
): T[] {
  const byPeriod = new Map(series.map((p) => [new Date(p.period).toISOString(), p]));
  const out = new Map<string, T>();
  for (let d = truncate(range.from, interval); d <= range.to; d = step(d, interval)) {
    const key = d.toISOString();
    out.set(key, byPeriod.get(key) ?? empty(key));
    if (out.size > 2000) break;
  }
  for (const [key, p] of byPeriod) if (!out.has(key)) out.set(key, p);
  return [...out.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, p]) => p);
}

const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

// How a period is named on an axis or in a table ("8 Nov", "Week of 3 Nov", "Nov 2026").
export function periodLabel(period: string, interval: Interval, long = false): string {
  const d = new Date(period);
  if (interval === "month") return monthLabel.format(d);
  if (interval === "week") return long ? `Week of ${dayLabel.format(d)}` : dayLabel.format(d);
  return dayLabel.format(d);
}
