"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../store/api-errors";
import { useGetV1AdminReturnsIdQuery } from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime, shortId } from "../../lib/format";
import { formatMoney } from "../../lib/money";
import {
  INSPECTION_LABELS,
  isClosed,
  lineValueMinor,
  RESOLUTION_LABELS,
  RETURN_STATUS_LABELS,
  returnActions,
  returnStatusVariant,
  settlementPreview,
  type ReturnDetail,
  type ReturnStatus,
} from "./return-actions";
import { CompleteDialog, DecisionDialog, InspectionDialog, ShippingDialog } from "./return-dialogs";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

// Return detail (spec §6.5, §14.4): what's coming back and why, and the next workflow step the
// return's status and the staff member's role allow.
export function ReturnDetailScreen({ id }: { id: string }) {
  const ret = useGetV1AdminReturnsIdQuery({ id });

  if (ret.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(ret.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!ret.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const r = ret.data;

  return (
    <>
      <Link
        href="/admin/returns"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Returns
      </Link>
      <PageHeader
        title={`Return #${r.number}`}
        description={`Requested ${formatDateTime(r.createdAt)} · order #${r.order.number} · ${r.order.email}`}
        actions={<ReturnActionBar ret={r} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={returnStatusVariant(r.status)}>{RETURN_STATUS_LABELS[r.status]}</Badge>
        <Badge variant="outline">{RESOLUTION_LABELS[r.resolution]}</Badge>
        <span className="text-xs text-muted-foreground">Updated {formatDateTime(r.updatedAt)}</span>
      </div>
      <Progress status={r.status} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <LinesSection ret={r} />
          <CustomerSection ret={r} />
        </div>
        <div className="space-y-6">
          <OrderSection ret={r} />
          <ShippingSection ret={r} />
          <SettlementSection ret={r} />
        </div>
      </div>
    </>
  );
}

function ReturnActionBar({ ret }: { ret: ReturnDetail }) {
  const allowed = returnActions(ret.status);
  const canWrite = useCan("orders.write");
  const canRefund = useCan("orders.refund");
  const nothing =
    !(canWrite && (allowed.decide || allowed.shipping.length || allowed.inspect)) && !(canRefund && allowed.complete);
  if (nothing) {
    return allowed.complete && !canRefund ? (
      <p className="text-xs text-muted-foreground">Settling a return needs the refund permission.</p>
    ) : null;
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canWrite && allowed.decide && (
        <>
          <DecisionDialog ret={ret} decision="APPROVED" />
          <DecisionDialog ret={ret} decision="REJECTED" />
        </>
      )}
      {canWrite && allowed.shipping.map((step) => <ShippingDialog key={step} ret={ret} step={step} />)}
      {canWrite && allowed.inspect && <InspectionDialog ret={ret} />}
      {canRefund && allowed.complete && <CompleteDialog ret={ret} />}
    </div>
  );
}

// The workflow as steps. Steps before the current one count as passed, including the optional
// label and transit steps when a drop-off return skipped them.
const STEPS: { status: ReturnStatus; label: string; optional?: boolean }[] = [
  { status: "REQUESTED", label: "Requested" },
  { status: "APPROVED", label: "Approved" },
  { status: "LABEL_ISSUED", label: "Label issued", optional: true },
  { status: "IN_TRANSIT", label: "In transit", optional: true },
  { status: "RECEIVED", label: "Received" },
  { status: "INSPECTED", label: "Inspected" },
  { status: "COMPLETED", label: "Settled" },
];

function Progress({ status }: { status: ReturnStatus }) {
  if (status === "REJECTED") {
    return <p className="mb-6 text-sm text-muted-foreground">This return was rejected; nothing more happens to it.</p>;
  }
  const current = status === "PARTIALLY_ACCEPTED" ? STEPS.length - 1 : STEPS.findIndex((s) => s.status === status);
  return (
    <ol aria-label="Return progress" className="mb-6 flex flex-wrap gap-x-1 gap-y-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < current || (i === current && isClosed(status));
        const here = i === current && !isClosed(status);
        return (
          <li
            key={s.status}
            aria-current={here ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1",
              here && "border-primary bg-accent font-medium text-foreground",
              done && "text-foreground",
              !done && !here && "text-muted-foreground",
            )}
          >
            {done && <CheckIcon aria-hidden className="size-3" />}
            {s.label}
            {s.optional && i > current && <span className="sr-only"> (optional)</span>}
            {done && <span className="sr-only"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}

function LinesSection({ ret }: { ret: ReturnDetail }) {
  const preview = settlementPreview(ret);
  const inspected = ret.lines.some((l) => l.inspection);
  return (
    <Section title={`Items being returned (${ret.lines.reduce((n, l) => n + l.quantity, 0)})`}>
      <div className="-mx-4 -mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Returned</TableHead>
              <TableHead>Reason</TableHead>
              {ret.resolution === "EXCHANGE" && <TableHead>Exchange for</TableHead>}
              <TableHead>Inspection</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ret.lines.map((l) => {
              const ol = ret.order.lines.find((o) => o.id === l.orderLineId);
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-normal">
                    {ol ? (
                      <>
                        <Link
                          href={`/admin/products/${ol.productId}`}
                          className="text-sm underline-offset-4 hover:underline"
                        >
                          {ol.titleSnapshot}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {ol.variantTitle} · <span className="font-mono">{ol.skuSnapshot}</span> · ordered{" "}
                          {ol.quantity}
                        </p>
                      </>
                    ) : (
                      <span className="font-mono text-xs">{shortId(l.orderLineId)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                  <TableCell className="text-sm whitespace-normal">{l.reason}</TableCell>
                  {ret.resolution === "EXCHANGE" && (
                    <TableCell className="font-mono text-xs" title={l.exchangeVariantId ?? undefined}>
                      {l.exchangeVariantId ? shortId(l.exchangeVariantId) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm">
                    {l.inspection ? INSPECTION_LABELS[l.inspection] : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.acceptedQuantity ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ol
                      ? formatMoney(
                          lineValueMinor(ret.order.taxInclusive, ol, l.acceptedQuantity ?? l.quantity),
                          ret.order.currency,
                        )
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {inspected && (
        <p className="mt-4 text-right text-sm">
          Accepted value{" "}
          <span className="font-medium tabular-nums">{formatMoney(preview.valueMinor, ret.order.currency)}</span>{" "}
          <span className="text-muted-foreground">
            ({preview.acceptedUnits} of {preview.requestedUnits} units)
          </span>
        </p>
      )}
    </Section>
  );
}

function CustomerSection({ ret }: { ret: ReturnDetail }) {
  return (
    <Section title="From the customer">
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Note</h3>
          {ret.customerNote ? (
            <p className="text-sm whitespace-pre-wrap">{ret.customerNote}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No note.</p>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Photos</h3>
          {ret.photoUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {ret.photoUrls.map((url, i) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- photo URLs come from any storage host */}
                    <img
                      src={url}
                      alt={`Customer photo ${i + 1} (opens in a new tab)`}
                      className="size-24 object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {ret.staffNote && (
          <div className="space-y-1">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Staff note</h3>
            <p className="rounded-md border-l-2 border-primary bg-accent/60 px-3 py-1.5 text-sm whitespace-pre-wrap">
              {ret.staffNote}
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

function OrderSection({ ret }: { ret: ReturnDetail }) {
  return (
    <Section title="Order">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <Detail label="Order">
          <Link href={`/admin/orders/${ret.orderId}`} className="font-mono underline-offset-4 hover:underline">
            #{ret.order.number}
          </Link>
        </Detail>
        <Detail label="Email">{ret.order.email}</Detail>
        <Detail label="Customer">
          {ret.customerId ? (
            <Link href={`/admin/customers/${ret.customerId}`} className="underline-offset-4 hover:underline">
              View profile
            </Link>
          ) : (
            <span className="text-muted-foreground">Guest</span>
          )}
        </Detail>
      </dl>
    </Section>
  );
}

function ShippingSection({ ret }: { ret: ReturnDetail }) {
  return (
    <Section title="Return shipping">
      {ret.carrier || ret.trackingNumber || ret.labelUrl ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <Detail label="Carrier">{ret.carrier ?? "—"}</Detail>
          <Detail label="Tracking">
            <span className="font-mono text-xs">{ret.trackingNumber ?? "—"}</span>
          </Detail>
          {ret.labelUrl && (
            <Detail label="Label">
              <a
                href={ret.labelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                Open label <ExternalLinkIcon aria-hidden className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Detail>
          )}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No label or tracking recorded.</p>
      )}
    </Section>
  );
}

function SettlementSection({ ret }: { ret: ReturnDetail }) {
  const settled = ret.status === "COMPLETED" || ret.status === "PARTIALLY_ACCEPTED";
  return (
    <Section title="Settlement">
      {!settled ? (
        <p className="text-sm text-muted-foreground">
          {ret.status === "REJECTED"
            ? "Nothing to settle."
            : `Settled as ${RESOLUTION_LABELS[ret.resolution].toLowerCase()} once the items are inspected.`}
        </p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <Detail label="Resolution">{RESOLUTION_LABELS[ret.resolution]}</Detail>
          {ret.refundId && (
            <Detail label="Refund">
              <Link href={`/admin/orders/${ret.orderId}`} className="underline-offset-4 hover:underline">
                See the order&apos;s refunds
              </Link>
            </Detail>
          )}
          {ret.creditMinor !== null && (
            <Detail label="Store credit">
              <span className="tabular-nums">{formatMoney(ret.creditMinor, ret.order.currency)}</span>
            </Detail>
          )}
          {ret.exchangeOrderId && (
            <Detail label="Exchange order">
              <Link
                href={`/admin/orders/${ret.exchangeOrderId}`}
                className="font-mono underline-offset-4 hover:underline"
              >
                {shortId(ret.exchangeOrderId)}
              </Link>
            </Detail>
          )}
          {!ret.refundId && ret.creditMinor === null && !ret.exchangeOrderId && (
            <Detail label="Outcome">No units were accepted</Detail>
          )}
        </dl>
      )}
    </Section>
  );
}
