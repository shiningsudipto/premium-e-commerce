// Money arrives from the API in minor units with an ISO currency. The design writes prices as
// "৳ 18,900": symbol, a space, whole units when there are no paisa.

const symbolCache = new Map<string, string>();

function currencySymbol(currency: string, locale: string) {
  const key = `${locale}:${currency}`;
  let symbol = symbolCache.get(key);
  if (!symbol) {
    symbol =
      new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency;
    symbolCache.set(key, symbol);
  }
  return symbol;
}

export function formatMoney(minor: number, currency: string, locale = "en"): string {
  const digits =
    new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const amount = minor / 10 ** digits;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(amount);
  return `${currencySymbol(currency, locale)} ${number}`;
}
