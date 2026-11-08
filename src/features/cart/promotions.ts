import type { Bag } from "./types";

// Why a promotion code isn't giving a discount, in terms a shopper understands. The API sends a
// reason code and, for unmet conditions, a technical detail such as "subtotal must be at least
// 5000" (money in minor units); this turns them into a message key and its values.

export type CodeResult = Bag["promotions"]["codes"][number];

export type Explanation =
  | { key: "applied" }
  | { key: "spendAtLeast"; amountMinor: number }
  | { key: "qualifyingAmount"; amountMinor: number }
  | { key: "qualifyingItems"; count: number }
  | { key: "notEligible" }
  | { key: "conditionsNotMet" }
  | { key: "notFound" }
  | { key: "expired" }
  | { key: "notStarted" }
  | { key: "usedUp" }
  | { key: "alreadyUsed" }
  | { key: "noEligibleItems" }
  | { key: "notCombinable" }
  | { key: "unavailable" };

const REASONS: Record<string, Explanation["key"]> = {
  NOT_FOUND: "notFound",
  EXPIRED: "expired",
  NOT_STARTED: "notStarted",
  INACTIVE: "unavailable",
  INVALID_RULES: "unavailable",
  USAGE_LIMIT_REACHED: "usedUp",
  CUSTOMER_LIMIT_REACHED: "alreadyUsed",
  NO_ELIGIBLE_ITEMS: "noEligibleItems",
  EXCLUSIVE_GROUP: "notCombinable",
  STOPPED_BY_HIGHER_PRIORITY: "notCombinable",
};

export function explainCode(result: Pick<CodeResult, "status" | "reason" | "detail">): Explanation {
  if (result.status === "applied") return { key: "applied" };
  if (result.reason === "CONDITIONS_NOT_MET") return explainCondition(result.detail);
  const key = (result.reason && REASONS[result.reason]) || "unavailable";
  return { key } as Explanation;
}

// Conditions can be combined with "or"; the first one the shopper can act on is enough.
function explainCondition(detail: string | undefined): Explanation {
  for (const part of (detail ?? "").split(" or ")) {
    const spend = /^subtotal must be at least (\d+)$/.exec(part.trim());
    if (spend) return { key: "spendAtLeast", amountMinor: Number(spend[1]) };
    const amount = /^qualifying items must total at least (\d+)$/.exec(part.trim());
    if (amount) return { key: "qualifyingAmount", amountMinor: Number(amount[1]) };
    const items = /^needs (\d+) qualifying item/.exec(part.trim());
    if (items) return { key: "qualifyingItems", count: Number(items[1]) };
  }
  if (/not eligible/.test(detail ?? "")) return { key: "notEligible" };
  return { key: "conditionsNotMet" };
}

// The discount each applied code gives, for the summary under the code field.
export function appliedByCode(bag: Pick<Bag, "promotions">): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of bag.promotions.applied) {
    if (!p.code) continue;
    out.set(p.code, (out.get(p.code) ?? 0) + p.amountMinor);
  }
  return out;
}
