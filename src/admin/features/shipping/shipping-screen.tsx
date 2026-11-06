"use client";

import { useState, type ReactElement } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminShippingRatesIdMutation,
  useDeleteV1AdminShippingZonesIdMutation,
  useGetV1AdminShippingZonesQuery,
  usePostV1AdminShippingZonesIdRatesMutation,
  usePostV1AdminShippingZonesMutation,
  usePutV1AdminShippingZonesIdMutation,
  usePutV1AdminShippingZonesZoneIdRatesIdMutation,
  type GetV1AdminShippingZonesApiResponse,
  type PostV1AdminShippingZonesIdRatesApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { notifyError, notifySaved } from "../../lib/notify";
import { DEFAULT_CURRENCY, formatMoney, inputToMinor, minorToInput } from "../../lib/money";
import { countriesLabel, parseCountries, rateConditions } from "./shipping-zones";

type Zone = GetV1AdminShippingZonesApiResponse[number];
type Rate = Zone["rates"][number];
type RateBody = PostV1AdminShippingZonesIdRatesApiArg["body"];

const RATE_TYPES = {
  FLAT: "Flat rate",
  PRICE: "By order subtotal",
  WEIGHT: "By cart weight",
} as const;

// Shipping zones and rates (spec §5.6): checkout offers the active rates of the zone that
// matches the address country; "*" catches every country no other zone lists.
export function ShippingScreen() {
  const zones = useGetV1AdminShippingZonesQuery({});
  const canWrite = useCan("shipping.write");

  return (
    <>
      <PageHeader
        title="Shipping"
        description="Zones group countries; each zone offers its own rates at checkout. Changes reach checkout within seconds."
        actions={
          canWrite && (
            <ZoneDialog
              trigger={
                <Button size="sm">
                  <PlusIcon /> New zone
                </Button>
              }
            />
          )
        }
      />
      {zones.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(zones.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-4">
        {zones.isLoading && Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        {zones.data?.length === 0 && (
          <p className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
            No shipping zones yet. Checkout can&apos;t offer delivery until one covers the shopper&apos;s country.
          </p>
        )}
        {zones.data?.map((zone) => (
          <ZoneCard key={zone.id} zone={zone} canWrite={canWrite} />
        ))}
      </div>
    </>
  );
}

function ZoneCard({ zone, canWrite }: { zone: Zone; canWrite: boolean }) {
  const [deleteZone] = useDeleteV1AdminShippingZonesIdMutation();
  const [deleteRate] = useDeleteV1AdminShippingRatesIdMutation();
  return (
    <section aria-labelledby={`zone-${zone.id}`} className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="space-y-1">
          <h2 id={`zone-${zone.id}`} className="flex items-center gap-2 font-medium">
            {zone.name}
            {!zone.isActive && <Badge variant="outline">Inactive</Badge>}
          </h2>
          <p className="text-sm text-muted-foreground">{countriesLabel(zone.countries)}</p>
        </div>
        {canWrite && (
          <div className="flex gap-1">
            <RateDialog
              zoneId={zone.id}
              position={zone.rates.length}
              trigger={
                <Button size="sm" variant="outline">
                  <PlusIcon /> Add rate
                </Button>
              }
            />
            <ZoneDialog
              zone={zone}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${zone.name}`}>
                  <PencilIcon />
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${zone.name}`}>
                  <Trash2Icon />
                </Button>
              }
              title={`Delete ${zone.name}?`}
              description={`Its ${zone.rates.length} rate(s) are deleted too. Shoppers in ${countriesLabel(zone.countries)} won't be offered delivery unless another zone covers them.`}
              confirmLabel="Delete zone"
              destructive
              onConfirm={() =>
                deleteZone({ id: zone.id })
                  .unwrap()
                  .then(() => notifySaved(`${zone.name} deleted`), notifyError)
              }
            />
          </div>
        )}
      </header>
      {zone.rates.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No rates in this zone yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {["Rate", "Price", "Applies", ""].map((h) => (
                  <TableHead key={h} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {zone.rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {rate.name}
                        {!rate.isActive && <Badge variant="outline">Inactive</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{RATE_TYPES[rate.type]}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatMoney(rate.amountMinor, rate.currency)}</TableCell>
                  <TableCell className="text-xs whitespace-normal">{rateConditions(rate)}</TableCell>
                  <TableCell>
                    {canWrite && (
                      <div className="flex justify-end gap-1">
                        <RateDialog
                          zoneId={zone.id}
                          rate={rate}
                          position={rate.position}
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${rate.name}`}>
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${rate.name}`}>
                              <Trash2Icon />
                            </Button>
                          }
                          title={`Delete ${rate.name}?`}
                          description="Checkout stops offering it. Orders already placed keep their shipping charge."
                          confirmLabel="Delete rate"
                          destructive
                          onConfirm={() =>
                            deleteRate({ id: rate.id })
                              .unwrap()
                              .then(() => notifySaved(`${rate.name} deleted`), notifyError)
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function ZoneDialog({ zone, trigger }: { zone?: Zone; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createZone, create] = usePostV1AdminShippingZonesMutation();
  const [updateZone, update] = usePutV1AdminShippingZonesIdMutation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setErrors({});
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const { countries, invalid } = parseCountries(String(form.get("countries")));
            if (invalid.length || countries.length === 0) {
              setErrors({
                countries: [invalid.length ? `Not a country code: ${invalid.join(", ")}` : "Add at least one country"],
              });
              return;
            }
            const body = { name: String(form.get("name")).trim(), countries, isActive };
            (zone ? updateZone({ id: zone.id, body }) : createZone({ body })).unwrap().then(
              (saved) => {
                notifySaved(`${saved.name} saved`);
                setOpen(false);
              },
              (error) => {
                setErrors(fieldErrors(error));
                notifyError(error);
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{zone ? `Edit ${zone.name}` : "New shipping zone"}</DialogTitle>
            <DialogDescription>Add rates to the zone after creating it.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="zone-name">Name</FieldLabel>
              <Input id="zone-name" name="name" required maxLength={100} defaultValue={zone?.name} />
            </Field>
            <Field data-invalid={errors.countries ? true : undefined}>
              <FieldLabel htmlFor="zone-countries">Countries</FieldLabel>
              <Input
                id="zone-countries"
                name="countries"
                required
                defaultValue={zone?.countries.join(", ")}
                placeholder="BD, IN"
                className="font-mono uppercase"
              />
              <FieldDescription>
                Two-letter codes, separated by commas. Use * for the rest of the world.
              </FieldDescription>
              <FieldError>{errors.countries?.[0]}</FieldError>
            </Field>
            <Field orientation="horizontal">
              <Switch id="zone-active" checked={isActive} onCheckedChange={setIsActive} />
              <FieldLabel htmlFor="zone-active">Active</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading || update.isLoading}>
              {zone ? "Save zone" : "Create zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MONEY_FIELDS = ["amountMinor", "minSubtotalMinor", "maxSubtotalMinor", "freeAboveMinor"] as const;
const INT_FIELDS = ["minWeightGrams", "maxWeightGrams", "minDeliveryDays", "maxDeliveryDays"] as const;

function RateDialog({
  zoneId,
  rate,
  position,
  trigger,
}: {
  zoneId: string;
  rate?: Rate;
  position: number;
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Rate["type"]>(rate?.type ?? "FLAT");
  const [isActive, setIsActive] = useState(rate?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createRate, create] = usePostV1AdminShippingZonesIdRatesMutation();
  const [updateRate, update] = usePutV1AdminShippingZonesZoneIdRatesIdMutation();
  const currency = rate?.currency ?? DEFAULT_CURRENCY;

  const moneyField = (name: (typeof MONEY_FIELDS)[number], label: string, hint?: string) => (
    <Field data-invalid={errors[name] ? true : undefined}>
      <FieldLabel htmlFor={`rate-${name}`}>{label}</FieldLabel>
      <Input
        id={`rate-${name}`}
        name={name}
        inputMode="decimal"
        required={name === "amountMinor"}
        defaultValue={minorToInput(rate?.[name], currency)}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{errors[name]?.[0]}</FieldError>
    </Field>
  );
  const intField = (name: (typeof INT_FIELDS)[number], label: string) => (
    <Field data-invalid={errors[name] ? true : undefined}>
      <FieldLabel htmlFor={`rate-${name}`}>{label}</FieldLabel>
      <Input id={`rate-${name}`} name={name} type="number" min={0} step={1} defaultValue={rate?.[name] ?? ""} />
      <FieldError>{errors[name]?.[0]}</FieldError>
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setErrors({});
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const code = String(form.get("currency")).trim().toUpperCase();
            const local: Record<string, string[]> = {};
            if (!/^[A-Z]{3}$/.test(code)) local.currency = ["Three-letter currency code, e.g. BDT"];
            const amounts = Object.fromEntries(
              MONEY_FIELDS.map((f) => {
                const v = form.has(f) ? inputToMinor(String(form.get(f)), code) : null;
                if (Number.isNaN(v)) local[f] = ["Enter an amount like 120 or 120.50"];
                return [f, v];
              }),
            ) as Record<(typeof MONEY_FIELDS)[number], number | null>;
            const ints = Object.fromEntries(
              INT_FIELDS.map((f) => {
                const raw = form.has(f) ? String(form.get(f)).trim() : "";
                return [f, raw === "" ? null : Number(raw)];
              }),
            ) as Record<(typeof INT_FIELDS)[number], number | null>;
            if (amounts.amountMinor === null) local.amountMinor = ["Required"];
            if (Object.keys(local).length) {
              setErrors(local);
              return;
            }
            // fields of the other rate types are cleared, so a rate never keeps a stale range
            const body: RateBody = {
              name: String(form.get("name")).trim(),
              type,
              currency: code,
              amountMinor: amounts.amountMinor!,
              minSubtotalMinor: type === "PRICE" ? amounts.minSubtotalMinor : null,
              maxSubtotalMinor: type === "PRICE" ? amounts.maxSubtotalMinor : null,
              minWeightGrams: type === "WEIGHT" ? ints.minWeightGrams : null,
              maxWeightGrams: type === "WEIGHT" ? ints.maxWeightGrams : null,
              freeAboveMinor: amounts.freeAboveMinor,
              minDeliveryDays: ints.minDeliveryDays,
              maxDeliveryDays: ints.maxDeliveryDays,
              position: Number(form.get("position") || position),
              isActive,
            };
            (rate ? updateRate({ zoneId, id: rate.id, body }) : createRate({ id: zoneId, body })).unwrap().then(
              (saved) => {
                notifySaved(`${saved.name} saved`);
                setOpen(false);
              },
              (error) => {
                setErrors(fieldErrors(error));
                notifyError(error);
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{rate ? `Edit ${rate.name}` : "New shipping rate"}</DialogTitle>
            <DialogDescription>
              Amounts are in the rate&apos;s currency. Ranges include the minimum, not the maximum.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field>
                <FieldLabel htmlFor="rate-name">Name</FieldLabel>
                <Input
                  id="rate-name"
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={rate?.name}
                  placeholder="e.g. Standard"
                />
              </Field>
              <Field data-invalid={errors.currency ? true : undefined}>
                <FieldLabel htmlFor="rate-currency">Currency</FieldLabel>
                <Input
                  id="rate-currency"
                  name="currency"
                  required
                  maxLength={3}
                  defaultValue={currency}
                  className="font-mono uppercase"
                />
                <FieldError>{errors.currency?.[0]}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="rate-type">Type</FieldLabel>
                <Select value={type} onValueChange={(v) => v && setType(v as Rate["type"])}>
                  <SelectTrigger id="rate-type" className="w-full">
                    <SelectValue>{RATE_TYPES[type]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RATE_TYPES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {moneyField("amountMinor", "Price")}
            </div>
            {type === "PRICE" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {moneyField("minSubtotalMinor", "Subtotal from")}
                {moneyField("maxSubtotalMinor", "Subtotal under")}
              </div>
            )}
            {type === "WEIGHT" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {intField("minWeightGrams", "Weight from (g)")}
                {intField("maxWeightGrams", "Weight under (g)")}
              </div>
            )}
            {moneyField(
              "freeAboveMinor",
              "Free from subtotal (optional)",
              "The storefront shows progress toward it in the cart.",
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {intField("minDeliveryDays", "Delivery days min")}
              {intField("maxDeliveryDays", "Delivery days max")}
              <Field>
                <FieldLabel htmlFor="rate-position">Position</FieldLabel>
                <Input id="rate-position" name="position" type="number" min={0} step={1} defaultValue={position} />
              </Field>
            </div>
            <Field orientation="horizontal">
              <Switch id="rate-active" checked={isActive} onCheckedChange={setIsActive} />
              <FieldLabel htmlFor="rate-active">Offered at checkout</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading || update.isLoading}>
              {rate ? "Save rate" : "Add rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
