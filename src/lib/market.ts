// Every storefront URL starts with a market segment: /{locale}-{market handle}/…, e.g. /en-bd/ (spec §3.3).
// Pure functions, shared by proxy.ts, server components and tests.

export const MARKET_SEGMENT = /^([a-z]{2,3})-([a-z0-9][a-z0-9-]*)$/;

export type MarketInfo = { handle: string; defaultLocale: string; locales: string[]; countries: string[] };
export type MarketRef = { segment: string; locale: string; market: string };

export function parseMarketSegment(segment: string | undefined | null): MarketRef | null {
  const match = segment ? MARKET_SEGMENT.exec(segment) : null;
  return match ? { segment: segment!, locale: match[1]!, market: match[2]! } : null;
}

export const marketSegment = (locale: string, market: string) => `${locale}-${market}`;

// A segment is only valid when the market exists and offers that locale.
export function resolveSegment(segment: string | undefined | null, markets: MarketInfo[]): MarketRef | null {
  const ref = parseMarketSegment(segment);
  if (!ref) return null;
  const market = markets.find((m) => m.handle === ref.market);
  return market && market.locales.includes(ref.locale) ? ref : null;
}

export function allSegments(markets: MarketInfo[]) {
  return markets.flatMap((m) => m.locales.map((l) => marketSegment(l, m.handle)));
}

// For a URL without a market prefix: the remembered choice, then the visitor's country, then the default.
export function pickSegment(
  input: { cookie?: string | null; country?: string | null },
  markets: MarketInfo[],
  fallback: string,
): string {
  const remembered = resolveSegment(input.cookie, markets);
  if (remembered) return remembered.segment;
  const country = input.country?.toUpperCase();
  const byCountry = country ? markets.find((m) => m.countries.includes(country)) : undefined;
  if (byCountry) return marketSegment(byCountry.defaultLocale, byCountry.handle);
  return fallback;
}
