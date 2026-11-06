"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { HistoryIcon, PackageSearchIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminInventoryVariantsIdHistoryQuery,
  useGetV1AdminInventoryVariantsIdQuery,
  useGetV1AdminLocationsQuery,
  useGetV1AdminProductsIdQuery,
  useGetV1AdminProductsQuery,
  usePatchV1AdminInventoryLevelsIdMutation,
  usePostV1AdminInventoryAdjustmentsMutation,
  type GetV1AdminInventoryVariantsIdApiResponse,
  type GetV1AdminLocationsApiResponse,
  type PostV1AdminInventoryAdjustmentsApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime, shortId } from "../../lib/format";
import { humanize } from "../../components/json-schema-form/schema";
import { notifyError, notifySaved } from "../../lib/notify";
import { optionLabel, type Product } from "../products/product-form";

type Level = GetV1AdminInventoryVariantsIdApiResponse[number];
type Location = GetV1AdminLocationsApiResponse[number];
type Variant = Product["variants"][number];
type Reason = PostV1AdminInventoryAdjustmentsApiArg["body"]["reason"];

export const REASONS: { value: Reason; label: string }[] = [
  { value: "RECEIVED", label: "Received stock" },
  { value: "CORRECTION", label: "Correction" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "SHRINKAGE", label: "Shrinkage (lost or stolen)" },
  { value: "CYCLE_COUNT", label: "Cycle count" },
  { value: "RETURN_RESTOCK", label: "Return restocked" },
];

// Ledger reasons include the ones orders write themselves.
const reasonLabel = (reason: string) =>
  REASONS.find((r) => r.value === reason)?.label ?? humanize(reason.toLowerCase());

// Inventory (spec §6.3): stock per variant and location, reason-coded adjustments and the
// adjustment ledger. The product being looked at stays in the URL (?product=).
export function InventoryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const productId = params.get("product");
  const select = (id: string | null) => router.replace(id ? `${pathname}?product=${id}` : pathname, { scroll: false });

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock on hand, reserved for open orders and available to sell, per variant and location. Every change is recorded with a reason."
      />
      <div className="space-y-6">
        <ProductPicker selected={productId} onSelect={select} />
        {productId ? (
          <ProductStock id={productId} />
        ) : (
          <div className="rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
            <PackageSearchIcon className="mx-auto mb-2 size-6" aria-hidden />
            Find a product by title or SKU to see its stock.
          </div>
        )}
      </div>
    </>
  );
}

function ProductPicker({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const results = useGetV1AdminProductsQuery({ q, limit: 10 }, { skip: q.length < 2 });
  return (
    <div className="max-w-xl space-y-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          aria-label="Find a product"
          placeholder="Find a product by title or SKU"
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {q.length >= 2 && (
        <ul className="divide-y rounded-md border bg-card text-sm">
          {results.isFetching && !results.data && (
            <li className="p-2">
              <Skeleton className="h-5 w-full" />
            </li>
          )}
          {results.data?.items.length === 0 && <li className="px-3 py-2 text-muted-foreground">No matches.</li>}
          {results.data?.items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-current={p.id === selected ? "true" : undefined}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted aria-[current=true]:bg-accent"
                onClick={() => {
                  onSelect(p.id);
                  setQuery("");
                }}
              >
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.variantCount} variant{p.variantCount === 1 ? "" : "s"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductStock({ id }: { id: string }) {
  const product = useGetV1AdminProductsIdQuery({ id });
  const locations = useGetV1AdminLocationsQuery({});
  if (product.error || locations.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(product.error ?? locations.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!product.data || !locations.data) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">{product.data.title}</h2>
        <Link href={`/admin/products/${product.data.id}`} className="text-sm text-muted-foreground hover:underline">
          Open product
        </Link>
      </div>
      {product.data.variants.length === 0 && (
        <p className="text-sm text-muted-foreground">This product has no variants.</p>
      )}
      {product.data.variants.map((v) => (
        <VariantStock
          key={v.id}
          variant={v}
          locations={locations.data!}
          lowStockDefault={product.data!.lowStockThreshold}
        />
      ))}
    </div>
  );
}

function VariantStock({
  variant,
  locations,
  lowStockDefault,
}: {
  variant: Variant;
  locations: Location[];
  lowStockDefault: number | null;
}) {
  const canWrite = useCan("inventory.write");
  const levels = useGetV1AdminInventoryVariantsIdQuery({ id: variant.id });
  const [showHistory, setShowHistory] = useState(false);
  const rows = locations
    .filter((l) => l.isActive || levels.data?.some((x) => x.locationId === l.id))
    .map((location) => ({ location, level: levels.data?.find((x) => x.locationId === location.id) ?? null }));
  const label = variant.title || optionLabel(variant.optionValues) || "Default";

  return (
    <section className="rounded-lg border bg-card p-4" aria-label={`${label} stock`}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{label}</p>
          <p className="font-mono text-xs text-muted-foreground">{variant.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" aria-expanded={showHistory} onClick={() => setShowHistory((s) => !s)}>
            <HistoryIcon /> {showHistory ? "Hide history" : "History"}
          </Button>
          {canWrite && (
            <AdjustDialog variant={variant} label={label} locations={locations} levels={levels.data ?? []} />
          )}
        </div>
      </header>
      {levels.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(levels.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Location", "On hand", "Reserved", "Available", "Incoming", "Low-stock alert"].map((h) => (
                  <TableHead key={h} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!levels.isLoading &&
                rows.map(({ location, level }) => {
                  const threshold = level?.lowStockThreshold ?? lowStockDefault;
                  const low = level && threshold !== null && level.available <= threshold;
                  return (
                    <TableRow key={location.id}>
                      <TableCell className="text-sm">
                        {location.name}
                        {location.isDefault && <span className="ml-1.5 text-xs text-muted-foreground">(default)</span>}
                      </TableCell>
                      <TableCell className="tabular-nums">{level?.onHand ?? 0}</TableCell>
                      <TableCell className="tabular-nums">{level?.reserved ?? 0}</TableCell>
                      <TableCell className={cn("tabular-nums", low && "font-medium text-destructive")}>
                        {level?.available ?? 0}
                        {low && (
                          <Badge variant="destructive" className="ml-2">
                            Low
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{level?.incoming ?? 0}</TableCell>
                      <TableCell>
                        {level ? (
                          <ThresholdEditor level={level} fallback={lowStockDefault} readOnly={!canWrite} />
                        ) : (
                          <span className="text-xs text-muted-foreground">No stock recorded</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}
      {showHistory && <History variantId={variant.id} locations={locations} />}
    </section>
  );
}

function ThresholdEditor({ level, fallback, readOnly }: { level: Level; fallback: number | null; readOnly: boolean }) {
  const initial = level.lowStockThreshold?.toString() ?? "";
  const [value, setValue] = useState(initial);
  const [setThreshold, state] = usePatchV1AdminInventoryLevelsIdMutation();
  const parsed = value.trim() === "" ? null : Number(value);
  const valid = parsed === null || (Number.isInteger(parsed) && parsed >= 0);
  if (readOnly) return <span className="text-xs tabular-nums">{level.lowStockThreshold ?? "Default"}</span>;
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        setThreshold({ id: level.id, body: { lowStockThreshold: parsed } })
          .unwrap()
          .then(
            () => notifySaved(parsed === null ? "Uses the default alert level" : `Alert at ${parsed} or fewer`),
            notifyError,
          );
      }}
    >
      <Input
        aria-label={`Low-stock alert for ${level.location.name}`}
        aria-invalid={valid ? undefined : true}
        inputMode="numeric"
        className="h-7 w-20 text-xs"
        placeholder={fallback === null ? "Default" : `${fallback}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value !== initial && (
        <Button type="submit" size="xs" disabled={!valid || state.isLoading}>
          Save
        </Button>
      )}
    </form>
  );
}

function AdjustDialog({
  variant,
  label,
  locations,
  levels,
}: {
  variant: Variant;
  label: string;
  locations: Location[];
  levels: Level[];
}) {
  const [open, setOpen] = useState(false);
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0];
  const [locationId, setLocationId] = useState(defaultLocation?.id ?? "");
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<Reason>("RECEIVED");
  const [note, setNote] = useState("");
  const [adjust, state] = usePostV1AdminInventoryAdjustmentsMutation();
  const quantity = Number(amount);
  const valid = amount.trim() !== "" && Number.isInteger(quantity) && quantity >= 0 && (mode === "set" || quantity > 0);
  const current = levels.find((l) => l.locationId === locationId)?.onHand ?? 0;
  const after = mode === "set" ? quantity : current + (mode === "add" ? quantity : -quantity);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <SlidersHorizontalIcon /> Adjust
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            adjust({
              body: {
                variantId: variant.id,
                locationId,
                ...(mode === "set" ? { setOnHand: quantity } : { delta: mode === "add" ? quantity : -quantity }),
                reason,
                ...(note.trim() ? { note: note.trim() } : {}),
              },
            })
              .unwrap()
              .then((level) => {
                notifySaved(`${variant.sku}: ${level.onHand} on hand, ${level.available} available`);
                setOpen(false);
                setAmount("");
                setNote("");
              }, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {label} · <span className="font-mono">{variant.sku}</span>
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="adjust-location">Location</FieldLabel>
              <Select value={locationId} onValueChange={(v) => setLocationId(String(v))}>
                <SelectTrigger id="adjust-location" className="w-full">
                  <SelectValue>{locations.find((l) => l.id === locationId)?.name}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="adjust-mode">Change</FieldLabel>
                <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <SelectTrigger id="adjust-mode" className="w-full">
                    <SelectValue>{{ add: "Add", remove: "Remove", set: "Set on-hand count" }[mode]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                    <SelectItem value="set">Set on-hand count</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={amount && !valid ? true : undefined}>
                <FieldLabel htmlFor="adjust-amount">{mode === "set" ? "Count" : "Quantity"}</FieldLabel>
                <Input
                  id="adjust-amount"
                  inputMode="numeric"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <FieldError>{amount && !valid ? "Enter a whole number" : undefined}</FieldError>
              </Field>
            </div>
            {valid && (
              <FieldDescription>
                On hand goes from {current} to {after}
                {after < 0 ? " (below zero)" : ""}.
              </FieldDescription>
            )}
            <Field>
              <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
              <Select value={reason} onValueChange={(v) => setReason(v as Reason)}>
                <SelectTrigger id="adjust-reason" className="w-full">
                  <SelectValue>{reasonLabel(reason)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="adjust-note">Note (optional)</FieldLabel>
              <Input id="adjust-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={!valid || !locationId || state.isLoading}>
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function History({ variantId, locations }: { variantId: string; locations: Location[] }) {
  const history = useGetV1AdminInventoryVariantsIdHistoryQuery({ id: variantId, limit: 50 });
  if (history.error) {
    return (
      <Alert variant="destructive" className="mt-3">
        <AlertDescription>{errorMessage(history.error)}</AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {["When", "Location", "Reason", "On hand", "Reserved", "Note", "By"].map((h) => (
              <TableHead key={h} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.isLoading && (
            <TableRow>
              <TableCell colSpan={7}>
                <Skeleton className="h-5 w-full" />
              </TableCell>
            </TableRow>
          )}
          {history.data?.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                No adjustments yet.
              </TableCell>
            </TableRow>
          )}
          {history.data?.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(a.createdAt)}</TableCell>
              <TableCell className="text-xs">
                {locations.find((l) => l.id === a.locationId)?.name ?? shortId(a.locationId)}
              </TableCell>
              <TableCell className="text-xs">
                {reasonLabel(a.reason)}
                {a.orderId && (
                  <Link href={`/admin/orders/${a.orderId}`} className="ml-1.5 text-muted-foreground hover:underline">
                    order
                  </Link>
                )}
              </TableCell>
              <TableCell className="text-xs tabular-nums">{a.onHandDelta ? signed(a.onHandDelta) : "—"}</TableCell>
              <TableCell className="text-xs tabular-nums">{a.reservedDelta ? signed(a.reservedDelta) : "—"}</TableCell>
              <TableCell className="max-w-xs text-xs whitespace-normal text-muted-foreground">{a.note ?? ""}</TableCell>
              <TableCell className="font-mono text-xs" title={a.actorId ?? undefined}>
                {a.actorType}
                {a.actorId ? `:${shortId(a.actorId)}` : ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
