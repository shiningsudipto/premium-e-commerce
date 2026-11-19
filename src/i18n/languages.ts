import { MARKET_SEGMENT, marketSegment } from "../lib/market";

// Storefront languages, named in their own language (a Bangla reader looks for "বাংলা", not
// "Bengali"). The order is the order of the language switcher.
export const LANGUAGES = {
  en: { name: "English", short: "EN", switcherLabel: "Language" },
  bn: { name: "বাংলা", short: "বাংলা", switcherLabel: "ভাষা" },
} as const;

export type Language = keyof typeof LANGUAGES;

export const isLanguage = (locale: string): locale is Language => locale in LANGUAGES;

// The languages a market offers that the storefront has a catalogue for, in switcher order.
export const marketLanguages = (marketLocales: readonly string[]): Language[] =>
  (Object.keys(LANGUAGES) as Language[]).filter((l) => marketLocales.includes(l));

export const languageName = (locale: string) => (isLanguage(locale) ? LANGUAGES[locale].name : locale.toUpperCase());

// The same page in another language: /en-bd/products/x?colour=red → /bn-bd/products/x?colour=red.
// Only the leading market segment changes; a path without one goes to that language's home page.
export function localizedPath(pathname: string, search: string, locale: string, market: string): string {
  const target = marketSegment(locale, market);
  const [, first = "", ...rest] = pathname.split("/");
  const tail = MARKET_SEGMENT.test(first) ? rest.join("/") : "";
  const query = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `/${target}${tail ? `/${tail}` : ""}${query}`;
}
