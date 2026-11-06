"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeftIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminOrdersIdQuery,
  usePostV1AdminOrdersIdCompleteMutation,
  usePostV1AdminOrdersIdNotesMutation,
  usePostV1AdminOrdersIdReleaseMutation,
  usePutV1AdminOrdersIdTagsMutation,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { SchemaField } from "../../components/json-schema-form/schema-field";
import { formatDateTime, shortId } from "../../lib/format";
import { formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { AddressBlock } from "./address-block";
import {
  FULFILLMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  orderActions,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  type Order,
} from "./order-actions";
import {
  AdvanceFulfillment,
  CancelDialog,
  FulfillDialog,
  HoldDialog,
  MarkPaidDialog,
  RefundDialog,
  TrackingDialog,
} from "./order-dialogs";

function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// Order detail (spec §6.4): lines with margin, money, fulfilments, payments, refunds and the
// timeline, with the actions the order's state and the staff member's role allow.
export function OrderDetailScreen({ id }: { id: string }) {
  const order = useGetV1AdminOrdersIdQuery({ id });
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  if (order.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(order.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!order.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const o = order.data;

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Orders
      </Link>
      <PageHeader
        title={`Order ${o.displayNumber}`}
        description={`Placed ${formatDateTime(o.placedAt ?? o.createdAt)} · ${o.email}`}
        actions={<OrderActionBar order={o} onApprovalRequested={setApprovalNotice} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={orderStatusVariant(o.status)}>{ORDER_STATUS_LABELS[o.status]}</Badge>
        {o.status === "ON_HOLD" && o.holdPreviousStatus && (
          <span className="text-xs text-muted-foreground">
            Returns to {ORDER_STATUS_LABELS[o.holdPreviousStatus].toLowerCase()} when released
          </span>
        )}
        {o.cancelReason && <span className="text-xs text-muted-foreground">Cancelled: {o.cancelReason}</span>}
      </div>
      {approvalNotice && (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center justify-between gap-3">
            {approvalNotice}
            <Button size="icon-sm" variant="ghost" aria-label="Dismiss" onClick={() => setApprovalNotice(null)}>
              <XIcon />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <LinesSection order={o} />
          <FulfillmentsSection order={o} />
          <PaymentsSection order={o} />
          {o.refunds.length > 0 && <RefundsSection order={o} />}
          <TimelineSection order={o} />
        </div>
        <div className="space-y-6">
          <CustomerSection order={o} />
          <TagsSection order={o} />
        </div>
      </div>
    </>
  );
}

function OrderActionBar({ order, onApprovalRequested }: { order: Order; onApprovalRequested: (m: string) => void }) {
  const allowed = orderActions(order);
  const canWrite = useCan("orders.write");
  const canFulfill = useCan("orders.fulfill");
  const canRefund = useCan("orders.refund");
  const canCancel = useCan("orders.cancel");
  const [release] = usePostV1AdminOrdersIdReleaseMutation();
  const [complete] = usePostV1AdminOrdersIdCompleteMutation();

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canWrite && allowed.markPaid && <MarkPaidDialog order={order} />}
      {canFulfill && allowed.fulfill && <FulfillDialog order={order} />}
      {canWrite && allowed.complete && (
        <ConfirmDialog
          trigger={<Button size="sm">Complete</Button>}
          title={`Complete ${order.displayNumber}?`}
          description="Marks the delivered order as done. Returns can still be handled afterwards."
          confirmLabel="Complete order"
          onConfirm={() =>
            complete({ id: order.id })
              .unwrap()
              .then(() => notifySaved(`${order.displayNumber} completed`), notifyError)
          }
        />
      )}
      {canRefund && allowed.refund && <RefundDialog order={order} onApprovalRequested={onApprovalRequested} />}
      {canWrite && allowed.hold && <HoldDialog order={order} />}
      {canWrite && allowed.release && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            release({ id: order.id })
              .unwrap()
              .then(() => notifySaved(`${order.displayNumber} released`), notifyError)
          }
        >
          Release hold
        </Button>
      )}
      {canCancel && allowed.cancel && <CancelDialog order={order} />}
    </div>
  );
}

function LinesSection({ order }: { order: Order }) {
  const money = (minor: number | null) => formatMoney(minor, order.currency);
  const refunded = order.refunds.reduce((sum, r) => sum + r.amountMinor, 0);
  return (
    <Section title={`Items (${order.lines.length})`}>
      <div className="-mx-4 -mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Fulfilled</TableHead>
              <TableHead className="text-right">Refunded</TableHead>
              <TableHead className="text-right">Unit</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-normal">
                  <p className="text-sm">{l.titleSnapshot}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.variantTitle} · <span className="font-mono">{l.skuSnapshot}</span>
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{l.fulfilledQuantity}</TableCell>
                <TableCell className="text-right tabular-nums">{l.refundedQuantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(l.unitPriceMinor)}
                  {l.compareAtMinor !== null && l.compareAtMinor > l.unitPriceMinor && (
                    <span className="block text-[11px] text-muted-foreground line-through">
                      {money(l.compareAtMinor)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(l.totalMinor)}
                  {l.discountMinor > 0 && (
                    <span className="block text-[11px] text-muted-foreground">−{money(l.discountMinor)} discount</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {l.marginMinor === null ? "—" : money(l.marginMinor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right tabular-nums">{money(order.subtotalMinor)}</dd>
        {order.discountMinor > 0 && (
          <>
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="text-right tabular-nums">−{money(order.discountMinor)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="text-right tabular-nums">{money(order.shippingMinor)}</dd>
        <dt className="text-muted-foreground">{order.taxInclusive ? "Tax (included)" : "Tax"}</dt>
        <dd className="text-right tabular-nums">{money(order.taxMinor)}</dd>
        <dt className="border-t pt-1 font-medium">Total</dt>
        <dd className="border-t pt-1 text-right font-medium tabular-nums">{money(order.totalMinor)}</dd>
        {refunded > 0 && (
          <>
            <dt className="text-muted-foreground">Refunded</dt>
            <dd className="text-right tabular-nums">−{money(refunded)}</dd>
          </>
        )}
      </dl>
    </Section>
  );
}

function FulfillmentsSection({ order }: { order: Order }) {
  const canFulfill = useCan("orders.fulfill");
  const skuOf = (lineId: string) => order.lines.find((l) => l.id === lineId)?.skuSnapshot ?? shortId(lineId);
  return (
    <Section title="Fulfillments">
      {order.fulfillments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has been fulfilled yet.</p>
      ) : (
        <ul className="divide-y">
          {order.fulfillments.map((f) => (
            <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm">
                  <Badge variant={f.status === "DELIVERED" ? "default" : "secondary"}>
                    {FULFILLMENT_STATUS_LABELS[f.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">created {formatDateTime(f.createdAt)}</span>
                </p>
                <p className="text-xs">{f.lines.map((l) => `${l.quantity} × ${skuOf(l.orderLineId)}`).join(", ")}</p>
                <p className="text-xs text-muted-foreground">
                  {f.carrier ?? "No carrier"}
                  {f.trackingNumber ? ` · ${f.trackingNumber}` : ""}
                  {f.trackingUrl && (
                    <a
                      href={f.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                    >
                      Track <ExternalLinkIcon className="size-3" />
                    </a>
                  )}
                  {f.shippedAt ? ` · shipped ${formatDateTime(f.shippedAt)}` : ""}
                  {f.deliveredAt ? ` · delivered ${formatDateTime(f.deliveredAt)}` : ""}
                </p>
              </div>
              {canFulfill && (
                <div className="flex items-center gap-2">
                  <TrackingDialog fulfillment={f} />
                  <AdvanceFulfillment fulfillment={f} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function PaymentsSection({ order }: { order: Order }) {
  return (
    <Section title="Payments">
      {order.payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments.</p>
      ) : (
        <ul className="divide-y">
          {order.payments.map((p) => (
            <li key={p.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.provider}</span>
                  <Badge variant={p.status === "FAILED" || p.status === "VOIDED" ? "destructive" : "secondary"}>
                    {PAYMENT_STATUS_LABELS[p.status]}
                  </Badge>
                </p>
                <p className="text-sm tabular-nums">{formatMoney(p.amountMinor, p.currency)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Captured {formatMoney(p.capturedMinor, p.currency)} · refunded{" "}
                {formatMoney(p.refundedMinor, p.currency)}
                {p.providerRef ? ` · ref ${p.providerRef}` : ""}
              </p>
              {p.transactions.length > 0 && (
                <ul className="space-y-0.5 text-xs">
                  {p.transactions.map((t) => (
                    <li key={t.id} className="flex flex-wrap gap-x-3 text-muted-foreground">
                      <span className="w-36">{formatDateTime(t.createdAt)}</span>
                      <span className="font-mono text-foreground">{t.kind}</span>
                      <span className={cn(t.status === "FAILED" && "text-destructive")}>{t.status.toLowerCase()}</span>
                      <span className="tabular-nums">{formatMoney(t.amountMinor, p.currency)}</span>
                      {t.providerRef && <span>ref {t.providerRef}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function RefundsSection({ order }: { order: Order }) {
  const skuOf = (lineId: string) => order.lines.find((l) => l.id === lineId)?.skuSnapshot ?? shortId(lineId);
  return (
    <Section title="Refunds">
      <ul className="divide-y">
        {order.refunds.map((r) => (
          <li key={r.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium tabular-nums">{formatMoney(r.amountMinor, r.currency)}</span>
              <span className="text-xs text-muted-foreground">
                {r.method.toLowerCase().replace("_", " ")} · {formatDateTime(r.createdAt)}
              </span>
            </div>
            {r.lines.length > 0 && (
              <p className="text-xs">
                {r.lines
                  .map((l) => `${l.quantity} × ${skuOf(l.orderLineId)}${l.restock ? " (restocked)" : ""}`)
                  .join(", ")}
              </p>
            )}
            {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TimelineSection({ order }: { order: Order }) {
  const canWrite = useCan("orders.write");
  const [addNote, adding] = usePostV1AdminOrdersIdNotesMutation();
  const [note, setNote] = useState("");
  const events = [...order.events].reverse();
  return (
    <Section title="Timeline">
      {canWrite && (
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            addNote({ id: order.id, body: { note: note.trim() } })
              .unwrap()
              .then(() => {
                setNote("");
                notifySaved("Note added");
              }, notifyError);
          }}
        >
          <Field>
            <FieldLabel htmlFor="order-note" className="sr-only">
              Internal note
            </FieldLabel>
            <Textarea
              id="order-note"
              rows={2}
              maxLength={2000}
              placeholder="Add an internal note (staff only)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary" disabled={!note.trim() || adding.isLoading}>
              Add note
            </Button>
          </div>
        </form>
      )}
      <ol className="space-y-3">
        {events.map((e) => (
          <li
            key={e.id}
            className={cn(
              "border-l-2 pl-3",
              e.type === "note" ? "rounded-r-md border-primary bg-accent/60 py-1.5" : "border-border",
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{e.message}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDateTime(e.createdAt)} · {e.type.replace(/_/g, " ")} ·{" "}
              <span className="font-mono" title={e.actorId ?? undefined}>
                {e.actorType}
                {e.actorId ? `:${shortId(e.actorId)}` : ""}
              </span>
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function CustomerSection({ order }: { order: Order }) {
  const name = [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ");
  return (
    <Section title="Customer">
      <div className="space-y-4">
        <div className="space-y-0.5 text-sm">
          {order.customerId ? (
            <Link
              href={`/admin/customers/${order.customerId}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {name || order.customer?.email || order.email}
            </Link>
          ) : (
            <p className="font-medium">Guest checkout</p>
          )}
          <p className="text-muted-foreground">{order.email}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Shipping address</h3>
          <AddressBlock address={order.shippingAddress} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Billing address</h3>
          {JSON.stringify(order.billingAddress) === JSON.stringify(order.shippingAddress) ? (
            <p className="text-sm text-muted-foreground">Same as shipping</p>
          ) : (
            <AddressBlock address={order.billingAddress} />
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Shipping method</h3>
          <p className="text-sm">
            {order.shippingMethod.name} · {formatMoney(order.shippingMethod.amountMinor, order.currency)}
          </p>
        </div>
        {order.notes && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer note</h3>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

function TagsSection({ order }: { order: Order }) {
  const canWrite = useCan("orders.write");
  const [draft, setDraft] = useState<{ version: string; tags: string[] }>({ version: "", tags: order.tags });
  // a refetched order (new updatedAt) resets the draft to what's stored
  const tags = draft.version === order.updatedAt ? draft.tags : order.tags;
  const dirty = JSON.stringify(tags) !== JSON.stringify(order.tags);
  const [saveTags, save] = usePutV1AdminOrdersIdTagsMutation();
  return (
    <Section title="Tags">
      {canWrite ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveTags({ id: order.id, body: { tags: tags.map((t) => t.trim()).filter(Boolean) } })
              .unwrap()
              .then(() => notifySaved("Tags saved"), notifyError);
          }}
        >
          <SchemaField
            schema={{ type: "array", maxItems: 50, items: { type: "string", maxLength: 50 } }}
            label="Tags"
            value={tags}
            onChange={(v) => setDraft({ version: order.updatedAt, tags: v as string[] })}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!dirty || save.isLoading}>
              Save tags
            </Button>
          </div>
        </form>
      ) : order.tags.length ? (
        <div className="flex flex-wrap gap-1">
          {order.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tags.</p>
      )}
    </Section>
  );
}
