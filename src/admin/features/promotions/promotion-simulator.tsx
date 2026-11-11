"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, CheckCircle2Icon, CircleSlashIcon, PlayIcon, Trash2Icon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminCustomersQuery,
  useGetV1AdminMarketsQuery,
  useGetV1AdminProductsIdQuery,
  useGetV1AdminPromotionsIdCodesQuery,
  useGetV1AdminShippingZonesQuery,
  usePostV1AdminPromotionsSimulateMutation,
} from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { DEFAULT_CURRENCY, formatMoney, minorToInput } from "../../lib/money";
import { Section } from "../products/section";
import {
  blankSimForm,
  lineBreakdown,
  reasonInfo,
  toSimulateBody,
  validateSim,
  type Promotion,
  type SimForm,
  type SimLine,
  type Simulation,
} from "./promotion-form";
import { ProductSearch } from "./rule-inputs";

const NONE = "__none";

export function SimulatorScreen() {
  return (
    <>
      <Link
        href="/admin/promotions"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden /> Promotions
      </Link>
      <PageHeader
        title="Promotion simulator"
        description="Build a sample cart and see exactly what checkout would apply: every active automatic promotion plus the codes you enter, with the reason each one did or didn't apply."
      />
      <SimulatorPanel />
    </>
  );
}

// Runs the engine against a sample cart (spec §8.3). From a promotion's page it can test just
// that promotion, drafts included.
export function SimulatorPanel({ promotion }: { promotion?: Promotion }) {
  const markets = useGetV1AdminMarketsQuery({});
  const zones = useGetV1AdminShippingZonesQuery({});
  const firstCode = useGetV1AdminPromotionsIdCodesQuery(
    { id: promotion?.id ?? "", limit: 1 },
    { skip: promotion?.type !== "CODE" },
  );
  const [marketHandle, setMarketHandle] = useState<string | null>(null);
  const [form, setForm] = useState<SimForm>(blankSimForm);
  const [onlyThis, setOnlyThis] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [run, state] = usePostV1AdminPromotionsSimulateMutation();
  const [result, setResult] = useState<{ data: Simulation; lines: SimLine[]; currency: string } | null>(null);

  const marketRows = markets.data ?? [];
  const market =
    marketRows.find((m) => m.handle === marketHandle) ?? marketRows.find((m) => m.isDefault) ?? marketRows[0];
  const currency = market?.currency ?? DEFAULT_CURRENCY;
  const rates = (zones.data ?? []).flatMap((z) =>
    z.rates.filter((r) => r.isActive && r.currency === currency).map((r) => ({ ...r, zone: z.name })),
  );
  const errors = validateSim(form, currency);
  const suggestedCode = firstCode.data?.items[0]?.code;

  function simulate() {
    setShowErrors(true);
    if (Object.keys(errors).length) return;
    const lines = form.lines;
    run({
      ...(market ? { "x-market": market.handle } : {}),
      body: toSimulateBody(form, currency, promotion && onlyThis ? [promotion.id] : undefined),
    })
      .unwrap()
      .then((data) => setResult({ data, lines, currency }))
      .catch(() => setResult(null));
  }

  const setLine = (i: number, patch: Partial<SimLine>) =>
    setForm({ ...form, lines: form.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          simulate();
        }}
      >
        <Section
          title="Sample cart"
          description="Prices start from the market's price list; change them to try other cases."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Field className="w-auto">
                <FieldLabel htmlFor="sim-market">Market</FieldLabel>
                <Select value={market?.handle ?? ""} onValueChange={(v) => setMarketHandle(String(v))}>
                  <SelectTrigger id="sim-market" className="w-56">
                    <SelectValue>{market ? `${market.name} (${market.currency})` : "Default market"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {marketRows.map((m) => (
                      <SelectItem key={m.id} value={m.handle}>
                        {m.name} ({m.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {form.lines.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-32">Unit price ({currency})</TableHead>
                      <TableHead className="w-32">Compare-at ({currency})</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">Remove</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((l, i) => (
                      <TableRow key={`${l.variantId}-${i}`}>
                        <TableCell className="text-xs whitespace-normal">
                          {l.label}
                          {showErrors && errors[String(i)] && <p className="text-destructive">{errors[String(i)]}</p>}
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Quantity of ${l.label}`}
                            inputMode="numeric"
                            className="h-7 w-20"
                            value={l.quantity}
                            onChange={(e) => setLine(i, { quantity: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Unit price of ${l.label}`}
                            inputMode="decimal"
                            className="h-7 w-28"
                            value={l.unitPrice}
                            onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            aria-label={`Compare-at price of ${l.label}`}
                            inputMode="decimal"
                            className="h-7 w-28"
                            placeholder="Not on sale"
                            value={l.compareAt}
                            onChange={(e) => setLine(i, { compareAt: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`Remove ${l.label}`}
                            onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}
                          >
                            <Trash2Icon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {showErrors && errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
            <AddLine currency={currency} onAdd={(line) => setForm({ ...form, lines: [...form.lines, line] })} />
          </div>
        </Section>

        <Section title="Shopper and checkout" description="Optional context the conditions can depend on.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sim-codes">Promo codes</FieldLabel>
              <Input
                id="sim-codes"
                className="font-mono uppercase"
                placeholder="SUMMER10, VIP"
                value={form.codes}
                onChange={(e) => setForm({ ...form, codes: e.target.value })}
              />
              <FieldDescription>
                Separate several with commas.
                {suggestedCode && !form.codes.toUpperCase().includes(suggestedCode) && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={() =>
                        setForm({ ...form, codes: form.codes ? `${form.codes}, ${suggestedCode}` : suggestedCode })
                      }
                    >
                      Use {suggestedCode}
                    </button>
                  </>
                )}
              </FieldDescription>
            </Field>
            <CustomerPicker value={form.customerId} onChange={(customerId) => setForm({ ...form, customerId })} />
            <Field data-invalid={showErrors && errors.country ? true : undefined}>
              <FieldLabel htmlFor="sim-country">Shipping country</FieldLabel>
              <Input
                id="sim-country"
                className="w-24 uppercase"
                maxLength={2}
                placeholder={market?.countries[0] ?? "BD"}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
              {showErrors && errors.country && <FieldError>{errors.country}</FieldError>}
            </Field>
            <div className="flex flex-wrap gap-4">
              <Field className="w-auto">
                <FieldLabel htmlFor="sim-rate">Shipping rate</FieldLabel>
                <Select
                  value={form.shippingRateId || NONE}
                  onValueChange={(v) => {
                    const rate = rates.find((r) => r.id === v);
                    setForm({
                      ...form,
                      shippingRateId: rate?.id ?? "",
                      shipping: rate ? minorToInput(rate.amountMinor, currency) : form.shipping,
                    });
                  }}
                >
                  <SelectTrigger id="sim-rate" className="w-60">
                    <SelectValue>
                      {(() => {
                        const r = rates.find((x) => x.id === form.shippingRateId);
                        return r ? `${r.zone}: ${r.name}` : "None chosen";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None chosen</SelectItem>
                    {rates.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.zone}: {r.name} ({formatMoney(r.amountMinor, r.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-auto" data-invalid={showErrors && errors.shipping ? true : undefined}>
                <FieldLabel htmlFor="sim-shipping">Shipping charge ({currency})</FieldLabel>
                <Input
                  id="sim-shipping"
                  inputMode="decimal"
                  className="w-32"
                  placeholder="0"
                  value={form.shipping}
                  onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                />
                {showErrors && errors.shipping && <FieldError>{errors.shipping}</FieldError>}
              </Field>
            </div>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-end gap-4">
          {promotion && (
            <Field orientation="horizontal" className="mr-auto w-auto">
              <Checkbox id="sim-only-this" checked={onlyThis} onCheckedChange={(on) => setOnlyThis(!!on)} />
              <FieldLabel htmlFor="sim-only-this" className="font-normal">
                Test only this promotion, even as a draft
                {promotion.type === "CODE" && " (enter one of its codes)"}
              </FieldLabel>
            </Field>
          )}
          <Button type="submit" disabled={state.isLoading}>
            <PlayIcon /> {state.isLoading ? "Running…" : "Run simulation"}
          </Button>
        </div>
      </form>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(state.error)}</AlertDescription>
        </Alert>
      ) : null}
      {result && !state.isLoading && (
        <DebugView result={result.data} lines={result.lines} currency={result.currency} focusId={promotion?.id} />
      )}
    </div>
  );
}

function AddLine({ currency, onAdd }: { currency: string; onAdd: (line: SimLine) => void }) {
  const [product, setProduct] = useState<{ id: string; title: string } | null>(null);
  const detail = useGetV1AdminProductsIdQuery({ id: product?.id ?? "" }, { skip: !product });
  return (
    <div className="space-y-2">
      <ProductSearch id="sim-product" label="Find a product to add" onPick={setProduct} />
      {product && (
        <div
          className="max-w-xl space-y-1 rounded-md border p-2"
          role="group"
          aria-label={`Variants of ${product.title}`}
        >
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">{product.title}</span>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Close variants"
              onClick={() => setProduct(null)}
            >
              <XIcon />
            </Button>
          </div>
          {detail.isFetching && <p className="text-xs text-muted-foreground">Loading variants…</p>}
          {detail.error ? <p className="text-xs text-destructive">{errorMessage(detail.error)}</p> : null}
          {detail.data && detail.data.id === product.id && (
            <ul className="divide-y text-xs">
              {detail.data.variants.length === 0 && <li className="py-1 text-muted-foreground">No variants.</li>}
              {detail.data.variants.map((v) => {
                const price = v.prices.find((p) => p.currency === currency && p.minQty <= 1);
                const label = `${product.title}${v.title && v.title !== "Default" ? ` / ${v.title}` : ""}`;
                return (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="min-w-0 truncate">
                      {v.title || v.sku} <span className="text-muted-foreground">· {v.sku}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">
                        {price ? formatMoney(price.amountMinor, currency) : `no ${currency} price`}
                      </span>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        aria-label={`Add ${label}`}
                        onClick={() =>
                          onAdd({
                            variantId: v.id,
                            label,
                            quantity: "1",
                            unitPrice: price ? minorToInput(price.amountMinor, currency) : "",
                            compareAt:
                              price?.compareAtMinor != null ? minorToInput(price.compareAtMinor, currency) : "",
                          })
                        }
                      >
                        Add
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const q = query.trim();
  const search = useGetV1AdminCustomersQuery({ q, limit: 6 }, { skip: q.length < 2 });
  if (value) {
    return (
      <Field>
        <FieldLabel htmlFor="sim-customer-clear">Customer</FieldLabel>
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate">{chosen ?? value}</span>
          <Button
            id="sim-customer-clear"
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => {
              onChange("");
              setChosen(null);
            }}
          >
            Use a guest instead
          </Button>
        </div>
        <FieldDescription>Their group, segments, first-order status and past uses count.</FieldDescription>
      </Field>
    );
  }
  return (
    <Field>
      <FieldLabel htmlFor="sim-customer">Customer</FieldLabel>
      <Input
        id="sim-customer"
        placeholder="Guest — search by name or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {q.length >= 2 && (
        <ul className="divide-y rounded-md border bg-background text-xs">
          {search.data?.items.length === 0 && <li className="px-3 py-1.5 text-muted-foreground">No matches.</li>}
          {search.error ? <li className="px-3 py-1.5 text-destructive">{errorMessage(search.error)}</li> : null}
          {search.data?.items.map((c) => {
            const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
            const label = name ? `${name} (${c.email ?? c.phone ?? c.id})` : (c.email ?? c.phone ?? c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  onClick={() => {
                    setChosen(label);
                    onChange(c.id);
                    setQuery("");
                  }}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Field>
  );
}

// The engine's explanation in readable form: what applied and how much, what didn't and why,
// and where each discount landed in the cart.
export function DebugView({
  result,
  lines,
  currency,
  focusId,
}: {
  result: Simulation;
  lines: SimLine[];
  currency: string;
  focusId?: string;
}) {
  const money = (n: number) => formatMoney(n, currency);
  const breakdown = lineBreakdown(result, lines, currency);
  const subtotal = breakdown.reduce((s, l) => s + l.totalMinor, 0);
  const focusApplied = focusId ? result.applied.some((a) => a.promotionId === focusId) : null;

  return (
    <section aria-label="Simulation result" className="space-y-6" aria-live="polite">
      {focusId && (
        <Alert variant={focusApplied ? "default" : "destructive"}>
          <AlertDescription>
            {focusApplied
              ? "This promotion applied to the sample cart."
              : `This promotion didn't apply${(() => {
                  const r = result.rejected.find((x) => x.promotionId === focusId);
                  return r
                    ? `: ${reasonInfo(r.reason).label.toLowerCase()}${r.detail ? ` (${r.detail})` : ""}`
                    : " (it wasn't evaluated: check its type, status and codes)";
                })()}.`}
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Items subtotal", money(subtotal)],
          ["Item discounts", money(result.itemsDiscountMinor)],
          ["Shipping discount", money(result.shippingDiscountMinor)],
          ["Total discount", money(result.totalDiscountMinor)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-lg font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <Section title={`Applied (${result.applied.length})`} description="In the order the engine applied them.">
        {result.applied.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing applied.</p>
        ) : (
          <ol className="divide-y rounded-md border">
            {result.applied.map((a) => (
              <li
                key={`${a.promotionId}-${a.codeId ?? ""}`}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
              >
                <CheckCircle2Icon className="size-4 text-primary" aria-hidden />
                <Link
                  href={`/admin/promotions/${a.promotionId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {a.name}
                </Link>
                {a.code && (
                  <Badge variant="outline" className="font-mono">
                    {a.code}
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  items {money(a.itemsMinor)} · shipping {money(a.shippingMinor)}
                </span>
                <span className="w-28 text-right font-medium tabular-nums">−{money(a.amountMinor)}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        title={`Not applied (${result.rejected.length})`}
        description="Every promotion the engine considered but didn't apply, with its reason."
      >
        {result.rejected.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {result.rejected.map((r) => {
              const info = reasonInfo(r.reason);
              return (
                <li key={`${r.promotionId}-${r.code ?? ""}`} className="space-y-0.5 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <CircleSlashIcon className="size-4 text-muted-foreground" aria-hidden />
                    <Link
                      href={`/admin/promotions/${r.promotionId}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.code && (
                      <Badge variant="outline" className="font-mono">
                        {r.code}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="ml-auto">
                      {info.label}
                    </Badge>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">
                    {info.help}
                    {r.detail && (
                      <>
                        {" "}
                        <span className="text-foreground">Engine detail: {r.detail}</span>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {result.codes.length > 0 && (
        <Section title="Codes entered">
          <ul className="divide-y rounded-md border">
            {result.codes.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-mono">{c.code}</span>
                {c.status === "applied" ? (
                  <Badge className="ml-auto">Applied</Badge>
                ) : (
                  <>
                    <Badge variant="destructive" className="ml-auto">
                      {reasonInfo(c.reason).label}
                    </Badge>
                    {c.detail && <span className="w-full text-xs text-muted-foreground">{c.detail}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Per line" description="Where each discount landed.">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Line total</TableHead>
                <TableHead>Discounts</TableHead>
                <TableHead className="text-right">After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs whitespace-normal">{l.label}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{l.quantity}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{money(l.totalMinor)}</TableCell>
                  <TableCell className="text-xs whitespace-normal">
                    {l.allocations.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      l.allocations.map((a) => (
                        <span key={a.promotionId} className="block">
                          {a.name}: −{money(a.amountMinor)}
                        </span>
                      ))
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">{money(l.afterMinor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="text-xs">
                  Items
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">{money(subtotal)}</TableCell>
                <TableCell className="text-xs tabular-nums">−{money(result.itemsDiscountMinor)}</TableCell>
                <TableCell className="text-right text-xs font-medium tabular-nums">
                  {money(subtotal - result.itemsDiscountMinor)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Section>

      <details className="rounded-md border bg-card">
        <summary className="cursor-pointer px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Raw engine response
        </summary>
        <pre className="max-h-96 overflow-auto border-t p-3 font-mono text-xs">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </section>
  );
}
