import { currencyDigits } from "../../lib/money";

// Scales and number formats for the inline SVG charts.

// Round tick values from 0 up past `max`: steps of 1, 2 or 5 × 10^n, about `target` of them.
export function niceTicks(max: number, target = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

// Maps a value in [d0, d1] onto [r0, r1].
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

// Indices of about `count` evenly spread x labels, always including the first and last.
export function labelIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const step = (length - 1) / (count - 1);
  return [...new Set(Array.from({ length: count }, (_, i) => Math.round(i * step)))];
}

// The data index nearest an x position, for the crosshair.
export function nearestIndex(x: number, length: number, x0: number, x1: number): number {
  if (length <= 1) return 0;
  const i = Math.round(((x - x0) / (x1 - x0 || 1)) * (length - 1));
  return Math.max(0, Math.min(length - 1, i));
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en");

// Axis ticks: in full under 10,000, compact from there (one style per axis, from its max).
export function axisNumber(value: number, axisMax: number): string {
  return axisMax >= 10_000 ? compact.format(value) : whole.format(value);
}

export const formatCount = (value: number) => whole.format(value);

// Minor units → compact currency ("BDT 12.9K"), for axis ticks and tiles.
export function moneyCompact(minor: number, currency: string, axisMax = minor): string {
  const major = minor / 10 ** currencyDigits(currency);
  const big = axisMax / 10 ** currencyDigits(currency) >= 10_000;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      notation: big ? "compact" : "standard",
      maximumFractionDigits: big ? 1 : 0,
    }).format(major);
  } catch {
    return `${big ? compact.format(major) : whole.format(Math.round(major))} ${currency}`;
  }
}

export function formatPercent(value: number, digits = 1): string {
  return new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: digits }).format(value);
}

// Change against a previous period, as a fraction (0.12 = +12%). Null when there's nothing to
// compare with.
export function change(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
