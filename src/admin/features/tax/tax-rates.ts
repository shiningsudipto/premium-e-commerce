// Tax rates are stored in basis points (1500 = 15%); staff type percentages.

// "15" → 1500, "7.25" → 725. Empty, malformed, more than two decimals or above 100% → NaN.
export function percentToBps(value: string): number {
  const text = value.trim().replace(/%$/, "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(text)) return Number.NaN;
  const [whole, fraction = ""] = text.split(".");
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return bps > 10_000 ? Number.NaN : bps;
}

// 1500 → "15", 725 → "7.25", 1250 → "12.5".
export function bpsToPercent(bps: number): string {
  return String(bps / 100);
}
