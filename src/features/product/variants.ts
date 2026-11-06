// Choosing a variant from option values (size, colour…), shared by the product page and its tests.

export type Stock = "in_stock" | "low_stock" | "out_of_stock" | "backorder" | "preorder" | "unavailable";

export type VariantLike = {
  id: string;
  optionValues: Record<string, string>;
  availableForSale: boolean;
  stock: Stock;
};

export type Selection = Record<string, string>;

export const selectionOf = (variant: VariantLike | undefined): Selection => ({ ...(variant?.optionValues ?? {}) });

// The variant whose option values are exactly the selection.
export function findVariant<V extends VariantLike>(variants: V[], selection: Selection): V | undefined {
  const names = Object.keys(selection);
  return variants.find(
    (v) =>
      names.length === Object.keys(v.optionValues).length && names.every((n) => v.optionValues[n] === selection[n]),
  );
}

// Where the page starts: the variant in the link (?variant=), else the first one that can be
// bought, else the first.
export function initialVariant<V extends VariantLike>(variants: V[], requestedId?: string | null): V | undefined {
  return (
    (requestedId ? variants.find((v) => v.id === requestedId) : undefined) ??
    variants.find((v) => v.availableForSale) ??
    variants[0]
  );
}

// Picking a value keeps the other choices when that combination exists; otherwise it moves to
// the closest variant that has the value, preferring one that can be bought.
export function choose<V extends VariantLike>(variants: V[], selection: Selection, name: string, value: string) {
  const exact = findVariant(variants, { ...selection, [name]: value });
  if (exact) return exact;
  const withValue = variants.filter((v) => v.optionValues[name] === value);
  const score = (v: V) =>
    Object.entries(selection).filter(([n, val]) => n !== name && v.optionValues[n] === val).length * 2 +
    (v.availableForSale ? 1 : 0);
  return withValue.sort((a, b) => score(b) - score(a))[0];
}

// How a value looks in the picker given the other current choices: "available", "sold_out"
// (a variant exists but can't be bought) or "missing" (that combination isn't made).
export function valueState(variants: VariantLike[], selection: Selection, name: string, value: string) {
  const variant = findVariant(variants, { ...selection, [name]: value });
  if (!variant) return "missing" as const;
  return variant.availableForSale ? ("available" as const) : ("sold_out" as const);
}

// Live stock (fetched in the browser) laid over the cached product.
export function withLiveStock<V extends VariantLike>(
  variants: V[],
  live: { variantId: string; availableForSale: boolean; stock: Stock }[] | null,
): V[] {
  if (!live) return variants;
  const byId = new Map(live.map((l) => [l.variantId, l]));
  return variants.map((v) => {
    const l = byId.get(v.id);
    return l ? { ...v, availableForSale: l.availableForSale, stock: l.stock } : v;
  });
}

// Images for the chosen variant first, then the rest (media tagged with no variants is shared).
export function orderMedia<M extends { variantIds: string[] }>(media: M[], variantId: string | undefined): M[] {
  if (!variantId) return media;
  const own = media.filter((m) => m.variantIds.includes(variantId));
  return own.length ? [...own, ...media.filter((m) => !m.variantIds.includes(variantId))] : media;
}
