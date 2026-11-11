// Customer tags (spec §6.6): free text, matched exactly by segments and filters.
// The API accepts at most 50 tags of up to 50 characters each.
export const MAX_TAGS = 50;
export const MAX_TAG_LENGTH = 50;

// Adds what staff typed ("vip, wholesale") to the list: trimmed, de-duplicated (case-sensitive,
// as the API matches), over-long tags and anything past the limit dropped.
export function addTags(current: readonly string[], typed: string): { tags: string[]; rejected: string[] } {
  const tags = [...current];
  const rejected: string[] = [];
  for (const raw of typed.split(",")) {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) continue;
    if (tag.length > MAX_TAG_LENGTH || tags.length >= MAX_TAGS) rejected.push(tag);
    else tags.push(tag);
  }
  return { tags, rejected };
}

export const sameTags = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((t, i) => t === b[i]);

// The phrase a destructive privacy action asks staff to type: the customer's email when there is
// one, otherwise a fixed word.
export const confirmationPhrase = (email: string | null | undefined) => email?.trim() || "ANONYMIZE";

export const confirmationMatches = (typed: string, phrase: string) =>
  typed.trim().toLowerCase() === phrase.trim().toLowerCase();

// "customer-ck1…-data.json"
export const exportFileName = (customerId: string, date = new Date()) =>
  `customer-${customerId}-${date.toISOString().slice(0, 10)}.json`;
