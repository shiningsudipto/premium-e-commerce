"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  usePatchV1AdminOrdersFulfillmentsIdMutation,
  usePostV1AdminOrdersIdCancelMutation,
  usePostV1AdminOrdersIdFulfillmentsMutation,
  usePostV1AdminOrdersIdHoldMutation,
  usePostV1AdminOrdersIdMarkPaidMutation,
  usePostV1AdminOrdersIdRefundsMutation,
} from "../../store/api.generated";
import { fieldErrors } from "../../store/api-errors";
import { shortId } from "../../lib/format";
import { formatMoney, inputToMinor } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  FULFILLMENT_STATUS_LABELS,
  nextFulfillmentStatuses,
  paymentAwaitingCapture,
  PAYMENT_STATUS_LABELS,
  refundableMinor,
  refundableQuantity,
  refundTotalMinor,
  remainingToFulfill,
  type Order,
} from "./order-actions";

type Fulfillment = Order["fulfillments"][number];

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (value: string) => (value ? value : undefined);

// A dialog with one form; stays open (and shows the API's field errors) until the action succeeds.
function FormDialog({
  trigger,
  title,
  description,
  submitLabel,
  destructive,
  onOpen,
  onSubmit,
  children,
}: {
  trigger: ReactElement;
  title: string;
  description?: string;
  submitLabel: string;
  destructive?: boolean;
  onOpen?: () => void;
  onSubmit: (form: FormData) => Promise<unknown> | null;
  children: (errors: Record<string, string[]>) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const run = onSubmit(new FormData(e.currentTarget));
    // null: the form flagged its own problem
    if (!run) return;
    setPending(true);
    try {
      await run;
      setOpen(false);
    } catch (error) {
      setErrors(fieldErrors(error));
      notifyError(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setErrors({});
          onOpen?.();
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children(errors)}
          {errors._form && (
            <Alert variant="destructive">
              <AlertDescription>{errors._form[0]}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending ? "Working…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// An Idempotency-Key per dialog opening: a double submit or a retry after a timeout can't
// run the action twice.
function useIdempotencyKey() {
  const [key, setKey] = useState("");
  return { key, renew: () => setKey(crypto.randomUUID()) };
}

export function MarkPaidDialog({ order }: { order: Order }) {
  const [markPaid] = usePostV1AdminOrdersIdMarkPaidMutation();
  const idem = useIdempotencyKey();
  const payment = paymentAwaitingCapture(order);
  return (
    <FormDialog
      trigger={<Button size="sm">Mark paid</Button>}
      title="Record payment received"
      description={
        payment
          ? `${formatMoney(payment.amountMinor, payment.currency)} via ${payment.provider} (${PAYMENT_STATUS_LABELS[payment.status].toLowerCase()}). Use this when cash on delivery was collected or a transfer arrived.`
          : undefined
      }
      submitLabel="Mark paid"
      onOpen={idem.renew}
      onSubmit={(form) =>
        markPaid({
          id: order.id,
          "Idempotency-Key": idem.key,
          body: { paymentId: payment?.id, reference: optional(text(form, "reference")) },
        })
          .unwrap()
          .then(() => notifySaved(`Payment recorded for ${order.displayNumber}`))
      }
    >
      {(errors) => (
        <Field data-invalid={errors.reference ? true : undefined}>
          <FieldLabel htmlFor="paid-reference">Reference (optional)</FieldLabel>
          <Input id="paid-reference" name="reference" maxLength={200} placeholder="e.g. receipt or transfer ID" />
          <FieldError>{errors.reference?.[0]}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}

function TrackingFields({ errors, fulfillment }: { errors: Record<string, string[]>; fulfillment?: Fulfillment }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor="track-carrier">Carrier</FieldLabel>
        <Input id="track-carrier" name="carrier" maxLength={100} defaultValue={fulfillment?.carrier ?? ""} />
      </Field>
      <Field>
        <FieldLabel htmlFor="track-number">Tracking number</FieldLabel>
        <Input
          id="track-number"
          name="trackingNumber"
          maxLength={100}
          defaultValue={fulfillment?.trackingNumber ?? ""}
        />
      </Field>
      <Field className="sm:col-span-2" data-invalid={errors.trackingUrl ? true : undefined}>
        <FieldLabel htmlFor="track-url">Tracking URL</FieldLabel>
        <Input id="track-url" name="trackingUrl" type="url" defaultValue={fulfillment?.trackingUrl ?? ""} />
        <FieldError>{errors.trackingUrl?.[0]}</FieldError>
      </Field>
    </div>
  );
}

export function FulfillDialog({ order }: { order: Order }) {
  const [fulfill] = usePostV1AdminOrdersIdFulfillmentsMutation();
  const idem = useIdempotencyKey();
  const open = order.lines.filter((l) => remainingToFulfill(l) > 0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [shipped, setShipped] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  return (
    <FormDialog
      trigger={<Button size="sm">Fulfill</Button>}
      title={`Fulfill ${order.displayNumber}`}
      description="Ships what's left by default. Lower a quantity to ship part of the order now."
      submitLabel="Create fulfillment"
      onOpen={() => {
        idem.renew();
        setQuantities(Object.fromEntries(open.map((l) => [l.id, remainingToFulfill(l)])));
        setShipped(true);
        setProblem(null);
      }}
      onSubmit={(form) => {
        const lines = open
          .map((l) => ({ orderLineId: l.id, quantity: quantities[l.id] ?? 0 }))
          .filter((l) => l.quantity > 0);
        if (!lines.length) {
          setProblem("Choose at least one item to fulfill.");
          return null;
        }
        const all = lines.length === open.length && open.every((l) => quantities[l.id] === remainingToFulfill(l));
        return fulfill({
          id: order.id,
          "Idempotency-Key": idem.key,
          body: {
            // no lines means "everything left", which the API resolves atomically
            ...(all ? {} : { lines }),
            status: shipped ? "SHIPPED" : "PENDING",
            carrier: optional(text(form, "carrier")),
            trackingNumber: optional(text(form, "trackingNumber")),
            trackingUrl: optional(text(form, "trackingUrl")),
          },
        })
          .unwrap()
          .then((o) => notifySaved(`${o.displayNumber}: fulfillment created`));
      }}
    >
      {(errors) => (
        <FieldGroup>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="w-28 text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-normal">
                    <p className="text-sm">{l.titleSnapshot}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {l.skuSnapshot} · {remainingToFulfill(l)} left
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      max={remainingToFulfill(l)}
                      aria-label={`Quantity of ${l.skuSnapshot}`}
                      className="ml-auto h-8 w-20"
                      value={quantities[l.id] ?? 0}
                      onChange={(e) =>
                        setQuantities((q) => ({
                          ...q,
                          [l.id]: Math.max(0, Math.min(remainingToFulfill(l), Math.trunc(Number(e.target.value) || 0))),
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          <Field orientation="horizontal">
            <Switch id="fulfill-shipped" checked={shipped} onCheckedChange={setShipped} />
            <div>
              <FieldLabel htmlFor="fulfill-shipped">Already shipped</FieldLabel>
              <FieldDescription>Off creates it as pending, to pick and pack first.</FieldDescription>
            </div>
          </Field>
          <TrackingFields errors={errors} />
        </FieldGroup>
      )}
    </FormDialog>
  );
}

export function TrackingDialog({ fulfillment }: { fulfillment: Fulfillment }) {
  const [update] = usePatchV1AdminOrdersFulfillmentsIdMutation();
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="ghost">
          Edit tracking
        </Button>
      }
      title="Tracking details"
      submitLabel="Save tracking"
      onSubmit={(form) =>
        update({
          id: fulfillment.id,
          body: {
            carrier: optional(text(form, "carrier")),
            trackingNumber: optional(text(form, "trackingNumber")),
            trackingUrl: optional(text(form, "trackingUrl")),
          },
        })
          .unwrap()
          .then(() => notifySaved("Tracking saved"))
      }
    >
      {(errors) => <TrackingFields errors={errors} fulfillment={fulfillment} />}
    </FormDialog>
  );
}

// Moves a fulfillment forward; the choices follow the API's state machine.
export function AdvanceFulfillment({ fulfillment }: { fulfillment: Fulfillment }) {
  const [update, state] = usePatchV1AdminOrdersFulfillmentsIdMutation();
  const next = nextFulfillmentStatuses(fulfillment.status);
  if (!next.length) return null;
  return (
    <Select
      value=""
      disabled={state.isLoading}
      onValueChange={(status) => {
        if (!status) return;
        update({ id: fulfillment.id, body: { status: status as (typeof next)[number] } })
          .unwrap()
          .then(
            () =>
              notifySaved(`Fulfillment ${FULFILLMENT_STATUS_LABELS[status as (typeof next)[number]].toLowerCase()}`),
            notifyError,
          );
      }}
    >
      <SelectTrigger size="sm" className="w-40" aria-label="Advance fulfillment">
        <SelectValue placeholder="Advance to…" />
      </SelectTrigger>
      <SelectContent>
        {next.map((s) => (
          <SelectItem key={s} value={s}>
            {FULFILLMENT_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type RefundLine = { quantity: number; restock: boolean };

// Refund by lines (amount worked out like the API does) or by a free amount. Above the
// approvals threshold the API answers 202 and the refund waits for a second approver.
export function RefundDialog({
  order,
  onApprovalRequested,
}: {
  order: Order;
  onApprovalRequested: (message: string) => void;
}) {
  const [refund] = usePostV1AdminOrdersIdRefundsMutation();
  const idem = useIdempotencyKey();
  const [mode, setMode] = useState<"lines" | "amount">("lines");
  const [lines, setLines] = useState<Record<string, RefundLine>>({});
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"ORIGINAL" | "MANUAL">("ORIGINAL");
  const [problem, setProblem] = useState<string | null>(null);

  const refundable = refundableMinor(order);
  const refundableLines = order.lines.filter((l) => refundableQuantity(l) > 0);
  const selection = Object.entries(lines)
    .filter(([, l]) => l.quantity > 0)
    .map(([orderLineId, l]) => ({ orderLineId, quantity: l.quantity, restock: l.restock }));
  const amountMinor = mode === "lines" ? refundTotalMinor(order, selection) : inputToMinor(amount, order.currency);

  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="outline">
          Refund
        </Button>
      }
      title={`Refund ${order.displayNumber}`}
      description={`Up to ${formatMoney(refundable, order.currency)} can still be refunded.`}
      submitLabel={
        typeof amountMinor === "number" && amountMinor > 0
          ? `Refund ${formatMoney(amountMinor, order.currency)}`
          : "Refund"
      }
      onOpen={() => {
        idem.renew();
        setLines({});
        setAmount("");
        setMethod("ORIGINAL");
        setProblem(null);
      }}
      onSubmit={(form) => {
        if (amountMinor === null || Number.isNaN(amountMinor) || amountMinor <= 0) {
          setProblem(mode === "lines" ? "Choose at least one item to refund." : "Enter an amount to refund.");
          return null;
        }
        if (amountMinor > refundable) {
          setProblem(`That's more than the ${formatMoney(refundable, order.currency)} still refundable.`);
          return null;
        }
        setProblem(null);
        const reason = optional(text(form, "reason"));
        return refund({
          id: order.id,
          "Idempotency-Key": idem.key,
          body: {
            ...(mode === "lines" ? { lines: selection } : { amountMinor }),
            reason,
            reference: optional(text(form, "reference")),
            method,
          },
        })
          .unwrap()
          .then((result) => {
            const money = formatMoney(amountMinor, order.currency);
            if ("approvalRequired" in result) {
              const message = `Refund of ${money} needs a second approver. Request ${shortId(result.approval.id)} is pending.`;
              onApprovalRequested(message);
              notifySaved(message);
            } else {
              notifySaved(`Refunded ${money}`);
            }
          });
      }}
    >
      {(errors) => (
        <FieldGroup>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "lines" | "amount")}>
            <TabsList>
              <TabsTrigger value="lines">By items</TabsTrigger>
              <TabsTrigger value="amount">By amount</TabsTrigger>
            </TabsList>
          </Tabs>
          {mode === "lines" ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24 text-right">Quantity</TableHead>
                  <TableHead className="w-20 text-center">Restock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundableLines.map((l) => {
                  const current = lines[l.id] ?? { quantity: 0, restock: true };
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm">{l.titleSnapshot}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {l.skuSnapshot} · {refundableQuantity(l)} refundable
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={refundableQuantity(l)}
                          aria-label={`Refund quantity of ${l.skuSnapshot}`}
                          className="ml-auto h-8 w-20"
                          value={current.quantity}
                          onChange={(e) =>
                            setLines((all) => ({
                              ...all,
                              [l.id]: {
                                ...current,
                                quantity: Math.max(
                                  0,
                                  Math.min(refundableQuantity(l), Math.trunc(Number(e.target.value) || 0)),
                                ),
                              },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          aria-label={`Restock ${l.skuSnapshot}`}
                          checked={current.restock}
                          onCheckedChange={(on) =>
                            setLines((all) => ({ ...all, [l.id]: { ...current, restock: !!on } }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Field data-invalid={errors.amountMinor ? true : undefined}>
              <FieldLabel htmlFor="refund-amount">Amount ({order.currency})</FieldLabel>
              <Input
                id="refund-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <FieldDescription>Nothing is restocked when refunding an amount.</FieldDescription>
              <FieldError>{errors.amountMinor?.[0]}</FieldError>
            </Field>
          )}
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="refund-method">Method</FieldLabel>
              <Select value={method} onValueChange={(v) => setMethod(v === "MANUAL" ? "MANUAL" : "ORIGINAL")}>
                <SelectTrigger id="refund-method" className="w-full">
                  <SelectValue>{method === "MANUAL" ? "Manual (outside the store)" : "Original payment"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORIGINAL">Original payment</SelectItem>
                  <SelectItem value="MANUAL">Manual (outside the store)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="refund-reference">Reference (optional)</FieldLabel>
              <Input id="refund-reference" name="reference" maxLength={200} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="refund-reason">Reason (optional)</FieldLabel>
            <Textarea id="refund-reason" name="reason" maxLength={500} rows={2} />
          </Field>
        </FieldGroup>
      )}
    </FormDialog>
  );
}

export function CancelDialog({ order }: { order: Order }) {
  const [cancel] = usePostV1AdminOrdersIdCancelMutation();
  const captured = refundableMinor(order);
  const [refund, setRefund] = useState(true);
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="destructive">
          Cancel order
        </Button>
      }
      title={`Cancel ${order.displayNumber}?`}
      description="Reserved stock is released and pending payments are voided. This can't be undone."
      submitLabel="Cancel order"
      destructive
      onOpen={() => setRefund(true)}
      onSubmit={(form) =>
        cancel({ id: order.id, body: { reason: text(form, "reason"), refund: captured > 0 && refund } })
          .unwrap()
          .then(() => notifySaved(`${order.displayNumber} cancelled`))
      }
    >
      {(errors) => (
        <FieldGroup>
          <Field data-invalid={errors.reason ? true : undefined}>
            <FieldLabel htmlFor="cancel-reason">Reason</FieldLabel>
            <Textarea id="cancel-reason" name="reason" required maxLength={500} rows={2} />
            <FieldError>{errors.reason?.[0]}</FieldError>
          </Field>
          {captured > 0 && (
            <Field orientation="horizontal">
              <Switch id="cancel-refund" checked={refund} onCheckedChange={setRefund} />
              <div>
                <FieldLabel htmlFor="cancel-refund">
                  Refund the captured {formatMoney(captured, order.currency)} first
                </FieldLabel>
                <FieldDescription>Without it, the API refuses to cancel an order with money captured.</FieldDescription>
              </div>
            </Field>
          )}
        </FieldGroup>
      )}
    </FormDialog>
  );
}

export function HoldDialog({ order }: { order: Order }) {
  const [hold] = usePostV1AdminOrdersIdHoldMutation();
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="outline">
          Hold
        </Button>
      }
      title={`Hold ${order.displayNumber}`}
      description="A held order can't be fulfilled until it's released."
      submitLabel="Put on hold"
      onSubmit={(form) =>
        hold({ id: order.id, body: { reason: text(form, "reason") } })
          .unwrap()
          .then(() => notifySaved(`${order.displayNumber} on hold`))
      }
    >
      {(errors) => (
        <Field data-invalid={errors.reason ? true : undefined}>
          <FieldLabel htmlFor="hold-reason">Reason</FieldLabel>
          <Textarea id="hold-reason" name="reason" required maxLength={500} rows={2} />
          <FieldError>{errors.reason?.[0]}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}
