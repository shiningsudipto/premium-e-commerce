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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  usePostV1AdminAffiliatesIdAdjustmentsMutation,
  usePostV1AdminAffiliatesIdPayoutsMutation,
  usePostV1AdminAffiliatesIdStatusMutation,
  usePostV1AdminAffiliatesPayoutsIdPaidMutation,
} from "../../store/api.generated";
import { fieldErrors } from "../../store/api-errors";
import { formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  ADJUSTMENT_KIND_LABELS,
  buildAdjustment,
  PAYOUT_METHODS,
  validateReason,
  validateReference,
  type AdjustmentKind,
  type Payout,
  type StatusAction,
} from "./affiliate-logic";

export type FormErrors = Record<string, string[] | string | undefined>;
export const firstError = (errors: FormErrors, key: string) => {
  const e = errors[key];
  return Array.isArray(e) ? e[0] : e;
};

// A dialog with one form. onSubmit returns the request (the dialog closes when it succeeds and
// shows the API's field errors when it fails) or the form's own errors.
export function FormDialog({
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
  description?: ReactNode;
  submitLabel: string;
  destructive?: boolean;
  wide?: boolean;
  onOpen?: () => void;
  onSubmit: (form: FormData) => Promise<unknown> | FormErrors;
  children: (errors: FormErrors) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const run = onSubmit(new FormData(e.currentTarget));
    if (!(run instanceof Promise)) {
      setErrors(run);
      return;
    }
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
      <DialogContent className={wide ? "max-h-[90vh] overflow-y-auto sm:max-w-2xl" : "sm:max-w-lg"}>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children(errors)}
          {firstError(errors, "_form") && (
            <Alert variant="destructive">
              <AlertDescription>{firstError(errors, "_form")}</AlertDescription>
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

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

// Approve, reject, suspend, reactivate or close, with a reason where one is needed.
export function StatusActionDialog({
  affiliateId,
  name,
  action,
  size = "sm",
}: {
  affiliateId: string;
  name: string;
  action: StatusAction;
  size?: "sm" | "xs";
}) {
  const [decide] = usePostV1AdminAffiliatesIdStatusMutation();
  const fieldId = `reason-${action.key}-${affiliateId}`;
  return (
    <FormDialog
      trigger={
        <Button size={size} variant={action.destructive ? "outline" : "default"}>
          {action.label}
        </Button>
      }
      title={action.title}
      description={`${name}. ${action.description}`}
      submitLabel={action.label}
      destructive={action.destructive}
      onSubmit={(form) => {
        const reason = text(form, "reason");
        const problem = validateReason(action, reason);
        if (problem) return { reason: problem };
        return decide({ id: affiliateId, body: { status: action.to, ...(reason ? { reason } : {}) } })
          .unwrap()
          .then(() => notifySaved(`${name}: ${action.label.toLowerCase()} done`));
      }}
    >
      {(errors) => (
        <Field data-invalid={firstError(errors, "reason") ? true : undefined}>
          <FieldLabel htmlFor={fieldId}>{action.reasonRequired ? "Reason" : "Reason (optional)"}</FieldLabel>
          <Textarea
            id={fieldId}
            name="reason"
            maxLength={500}
            rows={3}
            required={action.reasonRequired}
            aria-invalid={firstError(errors, "reason") ? true : undefined}
          />
          <FieldDescription>Recorded in the audit log and shown on the affiliate&apos;s profile.</FieldDescription>
          <FieldError>{firstError(errors, "reason")}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}

export function AdjustmentDialog({ affiliateId, currency }: { affiliateId: string; currency: string }) {
  const [adjust] = usePostV1AdminAffiliatesIdAdjustmentsMutation();
  const [kind, setKind] = useState<AdjustmentKind>("bonus");
  const [direction, setDirection] = useState<"add" | "deduct">("add");
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="outline">
          Add adjustment
        </Button>
      }
      title="Adjust earnings"
      description="Adds an approved entry to the ledger. Cash adjustments count towards the next payout."
      submitLabel="Add adjustment"
      onOpen={() => {
        setKind("bonus");
        setDirection("add");
      }}
      onSubmit={(form) => {
        const result = buildAdjustment({
          kind,
          direction,
          amount: text(form, "amount"),
          reason: text(form, "reason"),
          currency,
        });
        if (!result.ok) return result.errors;
        return adjust({ id: affiliateId, body: result.body })
          .unwrap()
          .then(() =>
            notifySaved(`${ADJUSTMENT_KIND_LABELS[kind]} of ${formatMoney(result.body.amountMinor, currency)} added`),
          );
      }}
    >
      {(errors) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="adjust-kind">Type</FieldLabel>
            <Select value={kind} onValueChange={(v) => setKind((v as AdjustmentKind | null) ?? "bonus")}>
              <SelectTrigger id="adjust-kind" className="w-full">
                <SelectValue>{ADJUSTMENT_KIND_LABELS[kind]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ADJUSTMENT_KIND_LABELS) as AdjustmentKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {ADJUSTMENT_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {kind === "bonus"
                ? "Adds to the balance."
                : kind === "penalty"
                  ? "Deducts from the balance."
                  : "Fixes a mistake either way."}
            </FieldDescription>
          </Field>
          {kind === "correction" ? (
            <Field>
              <FieldLabel htmlFor="adjust-direction">Direction</FieldLabel>
              <Select value={direction} onValueChange={(v) => setDirection(v === "deduct" ? "deduct" : "add")}>
                <SelectTrigger id="adjust-direction" className="w-full">
                  <SelectValue>{direction === "add" ? "Add to balance" : "Deduct from balance"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to balance</SelectItem>
                  <SelectItem value="deduct">Deduct from balance</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div aria-hidden className="hidden sm:block" />
          )}
          <Field data-invalid={firstError(errors, "amount") || firstError(errors, "amountMinor") ? true : undefined}>
            <FieldLabel htmlFor="adjust-amount">Amount ({currency})</FieldLabel>
            <Input
              id="adjust-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              placeholder="0.00"
            />
            <FieldError>{firstError(errors, "amount") ?? firstError(errors, "amountMinor")}</FieldError>
          </Field>
          <Field className="sm:col-span-2" data-invalid={firstError(errors, "reason") ? true : undefined}>
            <FieldLabel htmlFor="adjust-reason">Reason</FieldLabel>
            <Textarea id="adjust-reason" name="reason" rows={3} maxLength={480} required />
            <FieldDescription>Required. The affiliate sees it in their earnings.</FieldDescription>
            <FieldError>{firstError(errors, "reason")}</FieldError>
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

export function PreparePayoutDialog({
  affiliateId,
  payableMinor,
  currency,
}: {
  affiliateId: string;
  payableMinor: number;
  currency: string;
}) {
  const [prepare] = usePostV1AdminAffiliatesIdPayoutsMutation();
  const [method, setMethod] = useState<(typeof PAYOUT_METHODS)[number]["value"]>("default");
  return (
    <FormDialog
      trigger={
        <Button size="sm" disabled={payableMinor <= 0}>
          Prepare payout
        </Button>
      }
      title="Prepare a payout"
      description={`Bundles the approved cash balance (${formatMoney(payableMinor, currency)}) into a payout. An Owner approves it, then you record the payment.`}
      submitLabel="Prepare payout"
      onOpen={() => setMethod("default")}
      onSubmit={() =>
        prepare({ id: affiliateId, body: method === "default" ? {} : { method } })
          .unwrap()
          .then((p) => notifySaved(`Payout of ${formatMoney(p.amountMinor, p.currency)} prepared`))
      }
    >
      {() => (
        <Field>
          <FieldLabel htmlFor="payout-method">Payment method</FieldLabel>
          <Select value={method} onValueChange={(v) => setMethod((v as typeof method | null) ?? "default")}>
            <SelectTrigger id="payout-method" className="w-full">
              <SelectValue>{PAYOUT_METHODS.find((m) => m.value === method)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </FormDialog>
  );
}

export function MarkPayoutPaidDialog({ payout }: { payout: Payout }) {
  const [markPaid] = usePostV1AdminAffiliatesPayoutsIdPaidMutation();
  const fieldId = `payout-ref-${payout.id}`;
  return (
    <FormDialog
      trigger={<Button size="xs">Mark paid</Button>}
      title="Record the payment"
      description={`Confirm you sent ${formatMoney(payout.amountMinor, payout.currency)}. Its earnings are marked paid.`}
      submitLabel="Mark paid"
      onSubmit={(form) => {
        const reference = text(form, "reference");
        const problem = validateReference(reference);
        if (problem) return { reference: problem };
        return markPaid({ id: payout.id, body: { reference } })
          .unwrap()
          .then(() => notifySaved("Payout marked paid"));
      }}
    >
      {(errors) => (
        <Field data-invalid={firstError(errors, "reference") ? true : undefined}>
          <FieldLabel htmlFor={fieldId}>Payment reference</FieldLabel>
          <Input
            id={fieldId}
            name="reference"
            maxLength={200}
            required
            autoComplete="off"
            placeholder="e.g. bank or wallet transaction ID"
          />
          <FieldError>{firstError(errors, "reference")}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}
