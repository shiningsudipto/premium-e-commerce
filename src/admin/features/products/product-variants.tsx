"use client";

import { useState } from "react";
import { ArchiveIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminVariantsIdMutation,
  useGetV1AdminMarketsQuery,
  useGetV1AdminPriceListsQuery,
  usePatchV1AdminVariantsIdMutation,
  usePostV1AdminProductsIdVariantsGenerateMutation,
  usePostV1AdminProductsIdVariantsMutation,
  usePutV1AdminVariantsIdPricesMutation,
  type GetV1AdminPriceListsApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DEFAULT_CURRENCY, inputToMinor, minorToInput } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { basePrice, combinationCount, optionLabel, readOptions, type Product } from "./product-form";
import { Section } from "./section";

type Variant = Product["variants"][number];
type PriceList = GetV1AdminPriceListsApiResponse[number];

const cellInput = "h-7 min-w-20 px-2 text-xs";

// Variant matrix (spec §6.2): SKU, prices, cost, weight and barcode per variant, edited in place.
// Prices are per price list; the default market's list is shown first.
export function VariantsCard({ product, refetch }: { product: Product; refetch: () => unknown }) {
  const canWrite = useCan("products.write");
  const priceLists = useGetV1AdminPriceListsQuery({});
  const markets = useGetV1AdminMarketsQuery({});
  const defaultListId =
    markets.data?.find((m) => m.isDefault)?.priceListId ?? priceLists.data?.find((l) => l.status === "ACTIVE")?.id;
  const [chosen, setChosen] = useState<string | null>(null);
  const listId = chosen ?? defaultListId;
  const list = priceLists.data?.find((l) => l.id === listId);
  const currency = list?.currency ?? DEFAULT_CURRENCY;
  const options = readOptions(product.options);

  return (
    <Section
      title="Variants"
      description={
        options.length
          ? `${product.variants.length} of ${combinationCount(options)} option combinations exist.`
          : "Each variant has its own SKU, price and stock."
      }
      actions={
        <>
          {priceLists.data && priceLists.data.length > 1 && (
            <Select value={listId ?? ""} onValueChange={(v) => setChosen(String(v))}>
              <SelectTrigger aria-label="Price list" size="sm" className="w-56">
                <SelectValue>{list ? `${list.name} (${list.currency})` : "Price list"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {priceLists.data.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({l.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canWrite && options.length > 0 && <GenerateDialog product={product} list={list} />}
          {canWrite && <AddVariantDialog product={product} list={list} />}
        </>
      }
    >
      {product.variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No variants yet. Generate them from the options or add one.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {[
                  "Variant",
                  "SKU",
                  `Price (${currency})`,
                  "Compare-at",
                  "Cost",
                  "Weight (g)",
                  "Barcode",
                  "Stock",
                  "",
                ].map((h, i) => (
                  <TableHead key={i} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((v) => {
                const price = basePrice(v, listId);
                return (
                  <VariantRow
                    // a refetch with a new version or price resets the row's drafts
                    key={`${v.id}:${v.version}:${listId}:${price?.amountMinor}:${price?.compareAtMinor}`}
                    variant={v}
                    listId={listId}
                    currency={currency}
                    readOnly={!canWrite}
                    onPricesSaved={refetch}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {!list && priceLists.data && (
        <p className="mt-3 text-xs text-muted-foreground">Create a price list to set prices.</p>
      )}
    </Section>
  );
}

function VariantRow({
  variant,
  listId,
  currency,
  readOnly,
  onPricesSaved,
}: {
  variant: Variant;
  listId: string | undefined;
  currency: string;
  readOnly: boolean;
  onPricesSaved: () => unknown;
}) {
  const price = basePrice(variant, listId);
  const initial = {
    sku: variant.sku,
    price: minorToInput(price?.amountMinor, currency),
    compareAt: minorToInput(price?.compareAtMinor, currency),
    cost: minorToInput(variant.costMinor, currency),
    weight: variant.weightGrams?.toString() ?? "",
    barcode: variant.barcode ?? "",
  };
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [updateVariant] = usePatchV1AdminVariantsIdMutation();
  const [setPrices] = usePutV1AdminVariantsIdPricesMutation();
  const [archiveVariant] = useDeleteV1AdminVariantsIdMutation();

  const priceMinor = inputToMinor(draft.price, currency);
  const compareMinor = inputToMinor(draft.compareAt, currency);
  const costMinor = inputToMinor(draft.cost, currency);
  const weight = draft.weight.trim() === "" ? null : Number(draft.weight);
  const errors = {
    sku: draft.sku.trim() ? null : "Required",
    price: Number.isNaN(priceMinor) || (priceMinor === null && compareMinor !== null) ? "Enter a price" : null,
    compareAt: Number.isNaN(compareMinor) ? "Enter an amount" : null,
    cost: Number.isNaN(costMinor) ? "Enter an amount" : null,
    weight: weight !== null && (!Number.isInteger(weight) || weight < 0) ? "Whole grams" : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const variantDirty =
    draft.sku !== initial.sku ||
    draft.cost !== initial.cost ||
    draft.weight !== initial.weight ||
    draft.barcode !== initial.barcode;
  const priceDirty = draft.price !== initial.price || draft.compareAt !== initial.compareAt;
  const dirty = variantDirty || (priceDirty && !!listId);

  async function save() {
    setSaving(true);
    try {
      if (variantDirty) {
        await updateVariant({
          id: variant.id,
          body: {
            version: variant.version,
            sku: draft.sku.trim(),
            costMinor,
            weightGrams: weight,
            barcode: draft.barcode.trim() || null,
          },
        }).unwrap();
      }
      if (priceDirty && listId) {
        // replaces this list's prices for the variant, so quantity tiers are sent back unchanged
        const tiers = variant.prices
          .filter((p) => p.priceListId === listId && p.minQty > 1)
          .map(({ priceListId, amountMinor, compareAtMinor, minQty }) => ({
            priceListId,
            amountMinor,
            compareAtMinor,
            minQty,
          }));
        await setPrices({
          id: variant.id,
          body: {
            prices: [
              ...(priceMinor === null
                ? []
                : [{ priceListId: listId, amountMinor: priceMinor, compareAtMinor: compareMinor, minQty: 1 }]),
              ...tiers,
            ],
          },
        }).unwrap();
        // prices live under the Pricing tag, which doesn't refresh the product
        onPricesSaved();
      }
      notifySaved(`${variant.sku} saved`);
    } catch (error) {
      notifyError(error);
    } finally {
      setSaving(false);
    }
  }

  const input = (key: keyof typeof draft, label: string, extra: { mono?: boolean; numeric?: boolean } = {}) => (
    <Input
      aria-label={`${label} for ${variant.sku}`}
      aria-invalid={(errors as Record<string, string | null>)[key] ? true : undefined}
      title={(errors as Record<string, string | null>)[key] ?? undefined}
      className={`${cellInput} ${extra.mono ? "font-mono" : ""}`}
      inputMode={extra.numeric ? "decimal" : undefined}
      value={draft[key]}
      disabled={readOnly || saving}
      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
    />
  );

  const stock = variant.inventory.reduce((n, l) => n + l.available, 0);

  return (
    <TableRow>
      <TableCell className="text-xs">
        <span className="font-medium">{variant.title || optionLabel(variant.optionValues) || "Default"}</span>
      </TableCell>
      <TableCell>{input("sku", "SKU", { mono: true })}</TableCell>
      <TableCell>{input("price", "Price", { numeric: true })}</TableCell>
      <TableCell>{input("compareAt", "Compare-at price", { numeric: true })}</TableCell>
      <TableCell>{input("cost", "Cost", { numeric: true })}</TableCell>
      <TableCell>{input("weight", "Weight", { numeric: true })}</TableCell>
      <TableCell>{input("barcode", "Barcode", { mono: true })}</TableCell>
      <TableCell className="text-xs tabular-nums" title="Available across locations">
        {stock}
      </TableCell>
      <TableCell>
        {!readOnly && (
          <div className="flex justify-end gap-1">
            <Button size="xs" disabled={!dirty || invalid || saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="icon-xs" variant="ghost" aria-label={`Archive ${variant.sku}`}>
                  <ArchiveIcon />
                </Button>
              }
              title={`Archive ${variant.sku}?`}
              description="It can't be bought any more and leaves the variant list. Past orders keep it."
              confirmLabel="Archive variant"
              destructive
              onConfirm={() =>
                archiveVariant({ id: variant.id })
                  .unwrap()
                  .then(() => notifySaved(`${variant.sku} archived`), notifyError)
              }
            />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function PriceField({
  id,
  value,
  onChange,
  currency,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  currency: string;
  error?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Price ({currency}, optional)</FieldLabel>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function GenerateDialog({ product, list }: { product: Product; list: PriceList | undefined }) {
  const [open, setOpen] = useState(false);
  const [skuPrefix, setSkuPrefix] = useState(product.handle.toUpperCase().slice(0, 20));
  const [price, setPrice] = useState("");
  const [generate, state] = usePostV1AdminProductsIdVariantsGenerateMutation();
  const currency = list?.currency ?? DEFAULT_CURRENCY;
  const priceMinor = inputToMinor(price, currency);
  const missing = combinationCount(readOptions(product.options)) - product.variants.length;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <SparklesIcon /> Generate variants
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number.isNaN(priceMinor)) return;
            generate({
              id: product.id,
              body: {
                skuPrefix: skuPrefix.trim(),
                ...(priceMinor !== null && list ? { prices: [{ priceListId: list.id, amountMinor: priceMinor }] } : {}),
              },
            })
              .unwrap()
              .then((p) => {
                notifySaved(`${p.variants.length - product.variants.length} variants created`);
                setOpen(false);
              }, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>Generate variants</DialogTitle>
            <DialogDescription>
              Creates a variant for every option combination that doesn&apos;t exist yet
              {missing > 0 ? ` (${missing} missing)` : ""}. Existing variants are left as they are.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="generate-prefix">SKU prefix</FieldLabel>
              <Input
                id="generate-prefix"
                required
                maxLength={40}
                className="font-mono"
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value)}
              />
              <FieldDescription>Option values are appended, e.g. {skuPrefix || "TEE"}-RED-M.</FieldDescription>
            </Field>
            {list && (
              <PriceField
                id="generate-price"
                value={price}
                onChange={setPrice}
                currency={currency}
                error={Number.isNaN(priceMinor) ? "Enter an amount" : undefined}
              />
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={state.isLoading || !skuPrefix.trim()}>
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddVariantDialog({ product, list }: { product: Product; list: PriceList | undefined }) {
  const options = readOptions(product.options);
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [addVariant, state] = usePostV1AdminProductsIdVariantsMutation();
  const currency = list?.currency ?? DEFAULT_CURRENCY;
  const priceMinor = inputToMinor(price, currency);
  const initialStock = stock.trim() === "" ? undefined : Number(stock);
  const complete = options.every((o) => values[o.name]);
  const valid =
    sku.trim() &&
    complete &&
    !Number.isNaN(priceMinor) &&
    (initialStock === undefined || (Number.isInteger(initialStock) && initialStock >= 0));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusIcon /> Add variant
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            addVariant({
              id: product.id,
              body: {
                sku: sku.trim(),
                optionValues: values,
                ...(priceMinor !== null && list ? { prices: [{ priceListId: list.id, amountMinor: priceMinor }] } : {}),
                ...(initialStock !== undefined ? { initialStock } : {}),
              },
            })
              .unwrap()
              .then(
                () => {
                  notifySaved(`${sku.trim()} added`);
                  setOpen(false);
                  setSku("");
                  setValues({});
                  setPrice("");
                  setStock("");
                },
                (error) => {
                  setErrors(fieldErrors(error));
                  notifyError(error);
                },
              );
          }}
        >
          <DialogHeader>
            <DialogTitle>Add a variant</DialogTitle>
            <DialogDescription>Initial stock goes to the default location.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.sku ? true : undefined}>
              <FieldLabel htmlFor="variant-sku">SKU</FieldLabel>
              <Input
                id="variant-sku"
                required
                className="font-mono"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
              <FieldError>{errors.sku?.[0]}</FieldError>
            </Field>
            {options.map((o) => (
              <Field key={o.name}>
                <FieldLabel htmlFor={`variant-option-${o.name}`}>{o.name}</FieldLabel>
                <Select
                  value={values[o.name] ?? ""}
                  onValueChange={(v) => setValues((cur) => ({ ...cur, [o.name]: String(v) }))}
                >
                  <SelectTrigger id={`variant-option-${o.name}`} className="w-full">
                    <SelectValue>{values[o.name] || `Choose ${o.name.toLowerCase()}`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {o.values.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ))}
            {list && (
              <PriceField
                id="variant-price"
                value={price}
                onChange={setPrice}
                currency={currency}
                error={Number.isNaN(priceMinor) ? "Enter an amount" : undefined}
              />
            )}
            <Field>
              <FieldLabel htmlFor="variant-stock">Initial stock (optional)</FieldLabel>
              <Input id="variant-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={state.isLoading || !valid}>
              Add variant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
