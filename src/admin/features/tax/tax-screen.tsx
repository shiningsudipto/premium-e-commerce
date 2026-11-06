"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState, type ReactElement } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminTaxRatesIdMutation,
  useGetV1AdminTaxClassesQuery,
  useGetV1AdminTaxRatesQuery,
  usePostV1AdminTaxClassesMutation,
  usePostV1AdminTaxRatesMutation,
  usePutV1AdminTaxClassesIdMutation,
  usePutV1AdminTaxRatesIdMutation,
  type GetV1AdminTaxClassesApiResponse,
  type GetV1AdminTaxRatesApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { bpsToPercent, percentToBps } from "./tax-rates";

type TaxClass = GetV1AdminTaxClassesApiResponse[number];
type TaxRate = GetV1AdminTaxRatesApiResponse[number];

// the Select's value for rates without a class (they apply to products without one)
const DEFAULT_CLASS = "__default";

// Manual tax rates (spec §11.4): a rate applies to a class of products in a country or region.
export function TaxScreen() {
  const classes = useGetV1AdminTaxClassesQuery({});
  const rates = useGetV1AdminTaxRatesQuery({});
  const canWrite = useCan("tax.write");
  const [deleteRate] = useDeleteV1AdminTaxRatesIdMutation();
  const className = (id: string | null) =>
    id ? (classes.data?.find((c) => c.id === id)?.name ?? id) : "Default (products without a class)";

  const classColumns: ColumnDef<TaxClass>[] = [
    { header: "Name", cell: ({ row: { original: c } }) => <span className="font-medium">{c.name}</span> },
    { header: "Handle", cell: ({ row: { original: c } }) => <span className="font-mono text-xs">{c.handle}</span> },
    {
      header: "Rates",
      cell: ({ row: { original: c } }) => (
        <span className="text-xs">{rates.data?.filter((r) => r.taxClassId === c.id).length ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: c } }) =>
        canWrite && (
          <ClassDialog
            taxClass={c}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`}>
                <PencilIcon />
              </Button>
            }
          />
        ),
    },
  ];

  const rateColumns: ColumnDef<TaxRate>[] = [
    { header: "Name", cell: ({ row: { original: r } }) => <span className="font-medium">{r.name}</span> },
    {
      header: "Where",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs">
          <span className="font-mono">{r.country}</span>
          {r.region ? ` · ${r.region}` : " · whole country"}
        </span>
      ),
    },
    { header: "Class", cell: ({ row: { original: r } }) => <span className="text-xs">{className(r.taxClassId)}</span> },
    {
      header: "Rate",
      cell: ({ row: { original: r } }) => <span className="font-mono text-xs">{bpsToPercent(r.rateBps)}%</span>,
    },
    {
      header: "Shipping",
      cell: ({ row: { original: r } }) =>
        r.shipping ? (
          <Badge variant="secondary">Taxed</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No</span>
        ),
    },
    {
      header: "Updated",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(r.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: r } }) =>
        canWrite && (
          <div className="flex justify-end gap-1">
            <RateDialog
              rate={r}
              classes={classes.data ?? []}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${r.name}`}>
                  <PencilIcon />
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.name}`}>
                  <Trash2Icon />
                </Button>
              }
              title={`Delete ${r.name}?`}
              description="Orders already placed keep the tax they were charged. New carts stop using this rate within seconds."
              confirmLabel="Delete rate"
              destructive
              onConfirm={() =>
                deleteRate({ id: r.id })
                  .unwrap()
                  .then(() => notifySaved(`${r.name} deleted`), notifyError)
              }
            />
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tax"
        description="Rates per country or region, for a tax class or for products without one. Whether prices include tax is set per market."
      />
      <div className="space-y-10">
        <section className="space-y-3" aria-labelledby="tax-rates">
          <div className="flex items-end justify-between gap-3">
            <h2 id="tax-rates" className="font-medium">
              Rates
            </h2>
            {canWrite && (
              <RateDialog
                classes={classes.data ?? []}
                trigger={
                  <Button size="sm">
                    <PlusIcon /> New rate
                  </Button>
                }
              />
            )}
          </div>
          <DataTable
            tableKey="tax-rates"
            columns={rateColumns}
            data={rates.data}
            loading={rates.isLoading}
            error={rates.error}
            getRowId={(r) => r.id}
            emptyMessage="No tax rates yet. Orders are charged no tax until one applies."
          />
        </section>

        <section className="space-y-3" aria-labelledby="tax-classes">
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 id="tax-classes" className="font-medium">
                Tax classes
              </h2>
              <p className="text-sm text-muted-foreground">
                Products pick a class (e.g. reduced rate for books); rates then apply per class.
              </p>
            </div>
            {canWrite && (
              <ClassDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <PlusIcon /> New class
                  </Button>
                }
              />
            )}
          </div>
          <DataTable
            tableKey="tax-classes"
            columns={classColumns}
            data={classes.data}
            loading={classes.isLoading}
            error={classes.error}
            getRowId={(c) => c.id}
            emptyMessage="No tax classes. Every product uses the default rates."
          />
        </section>
      </div>
    </>
  );
}

function ClassDialog({ taxClass, trigger }: { taxClass?: TaxClass; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createClass, create] = usePostV1AdminTaxClassesMutation();
  const [updateClass, update] = usePutV1AdminTaxClassesIdMutation();
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
            const body = { handle: String(form.get("handle")).trim(), name: String(form.get("name")).trim() };
            (taxClass ? updateClass({ id: taxClass.id, body }) : createClass({ body })).unwrap().then(
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
            <DialogTitle>{taxClass ? `Edit ${taxClass.name}` : "New tax class"}</DialogTitle>
            <DialogDescription>Assign it to products, then add rates for it.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tax-class-name">Name</FieldLabel>
              <Input id="tax-class-name" name="name" required defaultValue={taxClass?.name} />
            </Field>
            <Field data-invalid={errors.handle ? true : undefined}>
              <FieldLabel htmlFor="tax-class-handle">Handle</FieldLabel>
              <Input
                id="tax-class-handle"
                name="handle"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and dashes"
                defaultValue={taxClass?.handle}
                placeholder="e.g. reduced"
                className="font-mono"
              />
              <FieldError>{errors.handle?.[0]}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading || update.isLoading}>
              {taxClass ? "Save class" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RateDialog({ rate, classes, trigger }: { rate?: TaxRate; classes: TaxClass[]; trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(rate?.taxClassId ?? DEFAULT_CLASS);
  const [shipping, setShipping] = useState(rate?.shipping ?? false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createRate, create] = usePostV1AdminTaxRatesMutation();
  const [updateRate, update] = usePutV1AdminTaxRatesIdMutation();
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
            const rateBps = percentToBps(String(form.get("rate")));
            const country = String(form.get("country")).trim().toUpperCase();
            const local: Record<string, string[]> = {};
            if (Number.isNaN(rateBps)) local.rateBps = ["Enter a percentage from 0 to 100, at most two decimals"];
            if (!/^[A-Z]{2}$/.test(country)) local.country = ["Two-letter country code, e.g. BD"];
            if (Object.keys(local).length) {
              setErrors(local);
              return;
            }
            const body = {
              name: String(form.get("name")).trim(),
              country,
              region: String(form.get("region")).trim() || null,
              rateBps,
              shipping,
              taxClassId: classId === DEFAULT_CLASS ? null : classId,
            };
            (rate ? updateRate({ id: rate.id, body }) : createRate({ body })).unwrap().then(
              (saved) => {
                notifySaved(`${saved.name} saved. Carts use it within seconds.`);
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
            <DialogTitle>{rate ? `Edit ${rate.name}` : "New tax rate"}</DialogTitle>
            <DialogDescription>A region-specific rate wins over the country-wide one.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tax-rate-name">Name</FieldLabel>
              <Input id="tax-rate-name" name="name" required defaultValue={rate?.name} placeholder="e.g. VAT" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.country ? true : undefined}>
                <FieldLabel htmlFor="tax-rate-country">Country</FieldLabel>
                <Input
                  id="tax-rate-country"
                  name="country"
                  required
                  maxLength={2}
                  defaultValue={rate?.country}
                  placeholder="BD"
                  className="font-mono uppercase"
                />
                <FieldError>{errors.country?.[0]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="tax-rate-region">Region (optional)</FieldLabel>
                <Input id="tax-rate-region" name="region" defaultValue={rate?.region ?? ""} />
              </Field>
            </div>
            <Field data-invalid={errors.rateBps ? true : undefined}>
              <FieldLabel htmlFor="tax-rate-rate">Rate (%)</FieldLabel>
              <Input
                id="tax-rate-rate"
                name="rate"
                required
                inputMode="decimal"
                defaultValue={rate ? bpsToPercent(rate.rateBps) : ""}
                placeholder="15"
                className="w-32"
              />
              <FieldError>{errors.rateBps?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="tax-rate-class">Tax class</FieldLabel>
              <Select value={classId} onValueChange={(v) => setClassId(v ?? DEFAULT_CLASS)}>
                <SelectTrigger id="tax-rate-class" className="w-full">
                  <SelectValue>
                    {classId === DEFAULT_CLASS
                      ? "Default (products without a class)"
                      : (classes.find((c) => c.id === classId)?.name ?? classId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_CLASS}>Default (products without a class)</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <Switch id="tax-rate-shipping" checked={shipping} onCheckedChange={setShipping} />
              <div>
                <FieldLabel htmlFor="tax-rate-shipping">Tax shipping too</FieldLabel>
                <FieldDescription>Applies this rate to shipping charges as well.</FieldDescription>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading || update.isLoading}>
              {rate ? "Save rate" : "Create rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
