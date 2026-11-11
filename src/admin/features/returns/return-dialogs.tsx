"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  usePostV1AdminReturnsIdCompleteMutation,
  usePostV1AdminReturnsIdDecisionMutation,
  usePostV1AdminReturnsIdInspectionMutation,
  usePostV1AdminReturnsIdShippingMutation,
} from "../../store/api.generated";
import { fieldErrors } from "../../store/api-errors";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  defaultInspection,
  INSPECTION_LABELS,
  inspectionErrors,
  inspectionPayload,
  RESOLUTION_LABELS,
  settlementPreview,
  settlementSummary,
  SHIPPING_STEP_LABELS,
  type InspectionDraft,
  type InspectionResult,
  type ReturnDetail,
  type ShippingStep,
} from "./return-actions";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const optional = (value: string) => (value ? value : undefined);

// A dialog with one form; stays open (and shows the API's field errors) until the action succeeds.
function FormDialog({
  trigger,
  title,
  description,
  submitLabel,
  destructive,
  wide,
  onOpen,
  onSubmit,
  children,
}: {
  trigger: ReactElement;
  title: string;
  description?: string;
  submitLabel: string;
  destructive?: boolean;
  wide?: boolean;
  onOpen?: () => void;
  // null: the form flagged its own problem
  onSubmit: (form: FormData) => Promise<unknown> | null;
  children: (errors: Record<string, string[]>) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const run = onSubmit(new FormData(e.currentTarget));
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
      <DialogContent className={wide ? "sm:max-w-3xl" : "sm:max-w-xl"}>
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

// ── Decision ─────────────────────────────────────────────────────────────────

export function DecisionDialog({ ret, decision }: { ret: ReturnDetail; decision: "APPROVED" | "REJECTED" }) {
  const [decide] = usePostV1AdminReturnsIdDecisionMutation();
  const approve = decision === "APPROVED";
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant={approve ? "default" : "outline"}>
          {approve ? "Approve" : "Reject"}
        </Button>
      }
      title={approve ? `Approve return #${ret.number}?` : `Reject return #${ret.number}?`}
      description={
        approve
          ? "The customer is told the return is approved and can send the items back."
          : "The customer is told the return was declined. A rejected return can't be reopened."
      }
      submitLabel={approve ? "Approve return" : "Reject return"}
      destructive={!approve}
      onSubmit={(form) =>
        decide({ id: ret.id, body: { status: decision, note: optional(text(form, "note")) } })
          .unwrap()
          .then(() => notifySaved(approve ? `Return #${ret.number} approved` : `Return #${ret.number} rejected`))
      }
    >
      {(errors) => (
        <Field data-invalid={errors.note ? true : undefined}>
          <FieldLabel htmlFor="return-note">Staff note {approve ? "(optional)" : "(reason)"}</FieldLabel>
          <Textarea id="return-note" name="note" rows={3} maxLength={1000} defaultValue={ret.staffNote ?? ""} />
          <FieldDescription>Kept on the return for staff; not shown to the customer.</FieldDescription>
          <FieldError>{errors.note?.[0]}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}

// ── Shipping ─────────────────────────────────────────────────────────────────

const SHIPPING_DESCRIPTIONS: Record<ShippingStep, string> = {
  LABEL_ISSUED: "Record the return label sent to the customer.",
  IN_TRANSIT: "The parcel is on its way back.",
  RECEIVED: "The parcel has arrived. Stock isn't changed until the items are inspected.",
};

export function ShippingDialog({ ret, step }: { ret: ReturnDetail; step: ShippingStep }) {
  const [ship] = usePostV1AdminReturnsIdShippingMutation();
  const label = SHIPPING_STEP_LABELS[step];
  const done = () => notifySaved(`Return #${ret.number}: ${label.toLowerCase()}`);

  if (step === "RECEIVED") {
    return (
      <ConfirmDialog
        trigger={<Button size="sm">{label}</Button>}
        title={`Mark return #${ret.number} received?`}
        description={SHIPPING_DESCRIPTIONS.RECEIVED}
        confirmLabel="Mark received"
        onConfirm={() =>
          ship({ id: ret.id, body: { status: "RECEIVED" } })
            .unwrap()
            .then(done, notifyError)
        }
      />
    );
  }

  return (
    <FormDialog
      trigger={
        <Button size="sm" variant={step === "LABEL_ISSUED" ? "default" : "outline"}>
          {label}
        </Button>
      }
      title={`${label} for return #${ret.number}`}
      description={SHIPPING_DESCRIPTIONS[step]}
      submitLabel={label}
      onSubmit={(form) =>
        ship({
          id: ret.id,
          body: {
            status: step,
            carrier: optional(text(form, "carrier")),
            trackingNumber: optional(text(form, "trackingNumber")),
            ...(step === "LABEL_ISSUED" ? { labelUrl: optional(text(form, "labelUrl")) } : {}),
          },
        })
          .unwrap()
          .then(done)
      }
    >
      {(errors) => (
        <FieldGroup>
          <Field data-invalid={errors.carrier ? true : undefined}>
            <FieldLabel htmlFor="return-carrier">Carrier</FieldLabel>
            <Input id="return-carrier" name="carrier" maxLength={100} defaultValue={ret.carrier ?? ""} />
            <FieldError>{errors.carrier?.[0]}</FieldError>
          </Field>
          <Field data-invalid={errors.trackingNumber ? true : undefined}>
            <FieldLabel htmlFor="return-tracking">Tracking number</FieldLabel>
            <Input id="return-tracking" name="trackingNumber" maxLength={100} defaultValue={ret.trackingNumber ?? ""} />
            <FieldError>{errors.trackingNumber?.[0]}</FieldError>
          </Field>
          {step === "LABEL_ISSUED" && (
            <Field data-invalid={errors.labelUrl ? true : undefined}>
              <FieldLabel htmlFor="return-label-url">Label URL (optional)</FieldLabel>
              <Input
                id="return-label-url"
                name="labelUrl"
                type="url"
                placeholder="https://"
                defaultValue={ret.labelUrl ?? ""}
              />
              <FieldDescription>A link to the printable label the customer can download.</FieldDescription>
              <FieldError>{errors.labelUrl?.[0]}</FieldError>
            </Field>
          )}
        </FieldGroup>
      )}
    </FormDialog>
  );
}

// ── Inspection ───────────────────────────────────────────────────────────────

const RESULTS: InspectionResult[] = ["RESTOCK", "WRITE_OFF", "REJECT"];

export function InspectionDialog({ ret }: { ret: ReturnDetail }) {
  const [inspect] = usePostV1AdminReturnsIdInspectionMutation();
  const [draft, setDraft] = useState<InspectionDraft>(() => defaultInspection(ret.lines));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const orderLine = (id: string) => ret.order.lines.find((l) => l.id === id);
  const set = (lineId: string, patch: Partial<InspectionDraft[string]>) =>
    setDraft((d) => ({ ...d, [lineId]: { ...d[lineId]!, ...patch } }));

  return (
    <FormDialog
      wide
      trigger={<Button size="sm">Inspect</Button>}
      title={`Inspect return #${ret.number}`}
      description="Record what happened to each line. Restocked units go back into inventory now; written-off units don't. Rejected units are sent back to the customer."
      submitLabel="Save inspection"
      onOpen={() => {
        setDraft(defaultInspection(ret.lines));
        setErrors({});
      }}
      onSubmit={() => {
        const problems = inspectionErrors(ret.lines, draft);
        setErrors(problems);
        if (Object.keys(problems).length) return null;
        return inspect({ id: ret.id, body: inspectionPayload(ret.lines, draft) })
          .unwrap()
          .then(() => notifySaved(`Return #${ret.number} inspected`));
      }}
    >
      {() => (
        <div className="-mx-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Accepted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ret.lines.map((l) => {
                const ol = orderLine(l.orderLineId);
                const entry = draft[l.id]!;
                const name = ol ? `${ol.titleSnapshot} (${ol.variantTitle})` : "Item";
                const errorId = `inspect-${l.id}-error`;
                return (
                  <TableRow key={l.id} className="align-top">
                    <TableCell className="whitespace-normal">
                      <p className="text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground">{l.reason}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                    <TableCell>
                      <Select
                        items={RESULTS.map((r) => ({ value: r, label: INSPECTION_LABELS[r] }))}
                        value={entry.result}
                        onValueChange={(v) => v && set(l.id, { result: v as InspectionResult })}
                      >
                        <SelectTrigger aria-label={`Result for ${name}`} className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULTS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {INSPECTION_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Accepted quantity for ${name}`}
                        aria-invalid={errors[l.id] ? true : undefined}
                        aria-describedby={errors[l.id] ? errorId : undefined}
                        inputMode="numeric"
                        className="h-8 w-20"
                        disabled={entry.result === "REJECT"}
                        value={entry.result === "REJECT" ? "0" : entry.acceptedQuantity}
                        onChange={(e) => set(l.id, { acceptedQuantity: e.target.value })}
                      />
                      {errors[l.id] && (
                        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
                          {errors[l.id]}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </FormDialog>
  );
}

// ── Completion ───────────────────────────────────────────────────────────────

// Settles the return (money or goods move), so it asks first and says exactly what will happen.
// One Idempotency-Key per opening: a double submit can't refund twice.
export function CompleteDialog({ ret }: { ret: ReturnDetail }) {
  const [complete] = usePostV1AdminReturnsIdCompleteMutation();
  const [key, setKey] = useState("");
  const preview = settlementPreview(ret);
  const summary = settlementSummary(ret.resolution, preview, (m) => formatMoney(m, ret.order.currency));
  const refund = ret.resolution === "REFUND" && preview.acceptedUnits > 0;

  return (
    <FormDialog
      trigger={<Button size="sm">Complete return</Button>}
      title={`Settle return #${ret.number}: ${RESOLUTION_LABELS[ret.resolution].toLowerCase()}`}
      description={summary}
      submitLabel={refund ? `Refund ${formatMoney(preview.valueMinor, ret.order.currency)}` : "Complete return"}
      destructive={refund}
      onOpen={() => setKey(crypto.randomUUID())}
      onSubmit={(form) =>
        complete({
          id: ret.id,
          "Idempotency-Key": key,
          body: { reference: optional(text(form, "reference")) },
        })
          .unwrap()
          .then((r) =>
            notifySaved(
              r.status === "COMPLETED" ? `Return #${ret.number} completed` : `Return #${ret.number} partially accepted`,
            ),
          )
      }
    >
      {(errors) => (
        <>
          <p className="text-sm text-muted-foreground">
            {preview.outcome === "COMPLETED"
              ? "Every unit was accepted, so the return will be marked completed."
              : "Not every unit was accepted, so the return will be marked partially accepted."}
          </p>
          {refund && (
            <Field data-invalid={errors.reference ? true : undefined}>
              <FieldLabel htmlFor="return-reference">Reference (optional)</FieldLabel>
              <Input id="return-reference" name="reference" maxLength={200} placeholder="e.g. bank transfer ID" />
              <FieldError>{errors.reference?.[0]}</FieldError>
            </Field>
          )}
        </>
      )}
    </FormDialog>
  );
}
