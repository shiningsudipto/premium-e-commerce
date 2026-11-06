import type { paths } from "../../api/schema";

// The cart as the API returns it: repriced, stock-checked, with shipping rates and totals.
export type Bag = paths["/v1/store/carts/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type BagLine = Bag["lines"][number];

export type BagResult = { ok: true; cart: Bag } | { ok: false; message: string; cart?: Bag };

// How far the bag is from free shipping, as a fraction for the progress bar.
export function freeShippingProgress(bag: Pick<Bag, "freeShipping" | "subtotalMinor">) {
  const { thresholdMinor, remainingMinor } = bag.freeShipping;
  if (thresholdMinor == null || thresholdMinor <= 0) return null;
  const remaining = Math.max(0, remainingMinor ?? Math.max(0, thresholdMinor - bag.subtotalMinor));
  const ratio = Math.min(1, (thresholdMinor - remaining) / thresholdMinor);
  return { remaining, ratio, reached: remaining === 0 };
}
