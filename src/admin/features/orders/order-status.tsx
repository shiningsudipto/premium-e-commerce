"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePostV1AdminOrdersIdStatusMutation } from "../../store/api.generated";
import { fieldErrors } from "../../store/api-errors";
import { useCan } from "../../components/can";
import { Dropdown, type DropdownItem } from "../../components/dropdown";
import { formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  ORDER_STATUS_LABELS,
  orderStatusVariant,
  refundableMinor,
  SETTABLE_STATUSES,
  STATUS_MEANING,
  statusEffects,
  type Order,
  type OrderStatus,
  type SettableStatus,
} from "./order-actions";

// The order's status as a dropdown: staff can set any status directly, without waiting for the
// customer or the courier. Choosing one asks to confirm and says what else gets recorded (a
// payment received, a shipment created), so the order stays consistent.

const DOT: Record<ReturnType<typeof orderStatusVariant>, string> = {
  default: "bg-success",
  secondary: "bg-primary/60",
  outline: "bg-warning",
  destructive: "bg-destructive",
};

function StatusDot({ status }: { status: OrderStatus }) {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[orderStatusVariant(status)])} />;
}

export function OrderStatusControl({ order }: { order: Order }) {
  const canWrite = useCan("orders.write");
  const canCancel = useCan("orders.cancel");
  const [chosen, setChosen] = useState<SettableStatus | null>(null);

  // a cancelled order can't be reopened
  if (!canWrite || order.status === "CANCELLED" || order.status === "DRAFT") {
    return <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>;
  }

  const items: DropdownItem<SettableStatus>[] = SETTABLE_STATUSES.filter((s) => s !== "CANCELLED" || canCancel).map(
    (s) => ({
      value: s,
      label: ORDER_STATUS_LABELS[s],
      description: s === order.status ? "Current status" : STATUS_MEANING[s],
      icon: <StatusDot status={s} />,
      disabled: s === order.status,
    }),
  );

  return (
    <>
      <Dropdown
        size="sm"
        className="w-56"
        menuClassName="ui-dropdown__menu--tall"
        aria-label="Order status"
        value={order.status as SettableStatus}
        items={items}
        onChange={setChosen}
      />
      {chosen && <SetStatusDialog key={chosen} order={order} to={chosen} onClose={() => setChosen(null)} />}
    </>
  );
}

function SetStatusDialog({ order, to, onClose }: { order: Order; to: SettableStatus; onClose: () => void }) {
  const [setStatus, state] = usePostV1AdminOrdersIdStatusMutation();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const captured = refundableMinor(order);
  const [refund, setRefund] = useState(true);
  const needsReason = to === "ON_HOLD" || to === "CANCELLED";
  const effects = statusEffects(order, to);
  const label = ORDER_STATUS_LABELS[to];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "").trim();
    try {
      await setStatus({
        id: order.id,
        body: {
          status: to,
          ...(reason ? { reason } : {}),
          ...(to === "CANCELLED" ? { refund: captured > 0 && refund } : {}),
        },
      }).unwrap();
      notifySaved(`${order.displayNumber}: ${label.toLowerCase()}`);
      onClose();
    } catch (error) {
      setErrors(fieldErrors(error));
      notifyError(error);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {to === "CANCELLED" ? `Cancel ${order.displayNumber}?` : `Set ${order.displayNumber} to ${label}?`}
            </DialogTitle>
            <DialogDescription>
              {ORDER_STATUS_LABELS[order.status]} → {label}: {STATUS_MEANING[to].toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            {effects.length ? (
              <>
                <p className="mb-1 font-medium">This also:</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {effects.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted-foreground">Only the status changes; shipments and payments stay as they are.</p>
            )}
            {to === "CANCELLED" && <p className="mt-2 text-muted-foreground">A cancelled order can&apos;t be reopened.</p>}
          </div>
          <FieldGroup>
            <Field data-invalid={errors.reason ? true : undefined}>
              <FieldLabel htmlFor="status-reason">{needsReason ? "Reason" : "Note (optional)"}</FieldLabel>
              <Textarea
                id="status-reason"
                name="reason"
                rows={2}
                maxLength={500}
                required={needsReason}
                placeholder={needsReason ? undefined : "Shown in the order timeline"}
              />
              <FieldError>{errors.reason?.[0]}</FieldError>
            </Field>
            {to === "CANCELLED" && captured > 0 && (
              <Field orientation="horizontal">
                <Switch id="status-refund" checked={refund} onCheckedChange={setRefund} />
                <div>
                  <FieldLabel htmlFor="status-refund">
                    Refund the {formatMoney(captured, order.currency)} received first
                  </FieldLabel>
                  <FieldDescription>Money received has to be refunded before the order can be cancelled.</FieldDescription>
                </div>
              </Field>
            )}
          </FieldGroup>
          {errors._form && (
            <Alert variant="destructive">
              <AlertDescription>{errors._form[0]}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Keep {ORDER_STATUS_LABELS[order.status].toLowerCase()}
                </Button>
              }
            />
            <Button type="submit" variant={to === "CANCELLED" ? "destructive" : "default"} disabled={state.isLoading}>
              {state.isLoading ? "Saving…" : to === "CANCELLED" ? "Cancel order" : `Set to ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
