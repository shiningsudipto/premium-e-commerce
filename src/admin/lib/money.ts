// Money is stored in minor units with a currency (spec §3.5); BDT is the default market.
export const DEFAULT_CURRENCY = "BDT";

const digitsCache = new Map<string, number>();

// Minor-unit digits of a currency (2 for BDT and USD, 0 for JPY), from Intl.
export function currencyDigits(currency: string): number {
  const code = currency.toUpperCase();
  let digits = digitsCache.get(code);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(code, digits);
  }
  return digits;
}

export function formatMoney(minor: number | null | undefined, currency = DEFAULT_CURRENCY): string {
  if (minor === null || minor === undefined) return "—";
  const code = currency.toUpperCase();
  const digits = currencyDigits(code);
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(minor / 10 ** digits);
  } catch {
    return `${(minor / 10 ** digits).toFixed(digits)} ${code}`;
  }
}

// The value an amount input shows for a stored amount ("1250.50" for 125050 BDT).
export function minorToInput(minor: number | null | undefined, currency = DEFAULT_CURRENCY): string {
  if (minor === null || minor === undefined) return "";
  return (minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency));
}

// Parses what staff type in an amount field. Empty → null; anything that isn't a plain
// non-negative amount with at most the currency's decimals → NaN, so forms can flag it.
export function inputToMinor(value: string, currency = DEFAULT_CURRENCY): number | null {
  const text = value.trim().replace(/,/g, "");
  if (text === "") return null;
  const digits = currencyDigits(currency);
  const pattern = digits > 0 ? new RegExp(`^\\d+(\\.\\d{0,${digits}})?$`) : /^\d+$/;
  if (!pattern.test(text)) return Number.NaN;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
}
