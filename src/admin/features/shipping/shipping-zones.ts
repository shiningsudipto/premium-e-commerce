import { formatMoney } from "../../lib/money";

// "bd, IN  *" → ["BD", "IN", "*"]; invalid entries are returned separately so the form can name them.
export function parseCountries(text: string): { countries: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  const countries = [...new Set(parts.filter((p) => p === "*" || /^[A-Z]{2}$/.test(p)))];
  return { countries, invalid: parts.filter((p) => p !== "*" && !/^[A-Z]{2}$/.test(p)) };
}

export const countriesLabel = (countries: string[]) =>
  countries.map((c) => (c === "*" ? "Rest of world" : c)).join(", ");

type RateLike = {
  type: "FLAT" | "PRICE" | "WEIGHT";
  currency: string;
  minSubtotalMinor: number | null;
  maxSubtotalMinor: number | null;
  minWeightGrams: number | null;
  maxWeightGrams: number | null;
  freeAboveMinor: number | null;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
};

const range = (min: string | null, max: string | null) =>
  min && max ? `${min} – under ${max}` : min ? `${min} and up` : max ? `under ${max}` : "any";

// One line describing when a rate applies, as the shipping engine reads it ([min, max) ranges).
export function rateConditions(r: RateLike): string {
  const money = (v: number | null) => (v === null ? null : formatMoney(v, r.currency));
  const grams = (v: number | null) => (v === null ? null : `${v} g`);
  const parts = [
    r.type === "PRICE" ? `Subtotal ${range(money(r.minSubtotalMinor), money(r.maxSubtotalMinor))}` : null,
    r.type === "WEIGHT" ? `Weight ${range(grams(r.minWeightGrams), grams(r.maxWeightGrams))}` : null,
    r.freeAboveMinor !== null ? `free from ${money(r.freeAboveMinor)}` : null,
    r.minDeliveryDays !== null || r.maxDeliveryDays !== null
      ? `${[r.minDeliveryDays, r.maxDeliveryDays].filter((d) => d !== null).join("–")} days`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Always";
}
