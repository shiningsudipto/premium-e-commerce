// Message catalogs with a fallback chain: requested locale → market default → "en".
// Missing keys in a translation fall through to the next catalog in the chain.

export type Messages = { [key: string]: string | Messages };

export const BASE_LOCALE = "en";

const catalogs: Record<string, () => Promise<Messages>> = {
  en: () => import("../../messages/en.json").then((m) => m.default),
  bn: () => import("../../messages/bn.json").then((m) => m.default),
};

export function fallbackChain(locale: string, marketDefault?: string): string[] {
  return [...new Set([locale, marketDefault, BASE_LOCALE].filter((l): l is string => !!l && l in catalogs))];
}

// Later catalogs fill the gaps of earlier ones, at any depth.
export function mergeMessages(primary: Messages, fallback: Messages): Messages {
  const out: Messages = { ...fallback };
  for (const [key, value] of Object.entries(primary)) {
    const base = out[key];
    out[key] = typeof value === "object" && typeof base === "object" ? mergeMessages(value, base) : value;
  }
  return out;
}

export async function loadMessages(locale: string, marketDefault?: string): Promise<Messages> {
  const chain = fallbackChain(locale, marketDefault);
  const loaded = await Promise.all(chain.map((l) => catalogs[l]!()));
  return loaded.reduceRight<Messages>((acc, messages) => mergeMessages(messages, acc), {});
}
