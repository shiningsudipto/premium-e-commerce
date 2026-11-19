"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, DownloadIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetV1AdminAffiliateProgramPayoutBatchesIdQuery,
  usePostV1AdminAffiliateProgramPayoutBatchesIdApproveMutation,
  usePostV1AdminAffiliateProgramPayoutBatchesIdCancelMutation,
  usePostV1AdminAffiliateProgramPayoutBatchesIdPaidMutation,
  type GetV1AdminAffiliateProgramPayoutBatchesIdApiResponse,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { useMe } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime, shortId } from "../../lib/format";
import { formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { downloadFromApi } from "../data/download";
import { FormDialog } from "../affiliates/affiliate-dialogs";
import {
  BATCH_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  batchActions,
  buildReferences,
  payableStatuses,
  payoutMethodText,
  payoutStatusVariant,
  staffLabel,
} from "./ops-logic";

type Batch = GetV1AdminAffiliateProgramPayoutBatchesIdApiResponse;

// Why a button is off, kept next to it for screen readers and sighted users alike.
function Reason({ id, text }: { id: string; text: string | null }) {
  return text ? (
    <p id={id} className="text-xs text-muted-foreground">
      {text}
    </p>
  ) : null;
}

function MarkPaidDialog({ batch }: { batch: Batch }) {
  const [markPaid] = usePostV1AdminAffiliateProgramPayoutBatchesIdPaidMutation();
  const payable = batch.payouts.filter((p) => payableStatuses.includes(p.status));
  const [refs, setRefs] = useState<Record<string, string>>({});
  return (
    <FormDialog
      wide
      trigger={
        <Button size="sm">
          <CheckIcon data-icon="inline-start" /> Record payments
        </Button>
      }
      title="Record payments"
      description="Enter the bank or wallet transaction reference for each payout you've sent. Leave a row empty to record it later; the batch is paid once every payout is."
      submitLabel="Record payments"
      onOpen={() => setRefs({})}
      onSubmit={() => {
        const result = buildReferences(
          refs,
          payable.map((p) => p.id),
        );
        if (!result.ok) return { _form: result.error };
        const n = Object.keys(result.references).length;
        return markPaid({ id: batch.id, body: { references: result.references } })
          .unwrap()
          .then(() => notifySaved(`${n} payment${n === 1 ? "" : "s"} recorded`));
      }}
    >
      {() => (
        <div className="space-y-3">
          {payable.map((p) => (
            <div key={p.id} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_14rem]">
              <label htmlFor={`ref-${p.id}`} className="text-sm">
                {p.affiliate?.customer.email ?? shortId(p.affiliateId)}
                <span className="block text-xs text-muted-foreground">{payoutMethodText(p)}</span>
              </label>
              <span className="text-sm tabular-nums">{formatMoney(p.amountMinor, p.currency)}</span>
              <Input
                id={`ref-${p.id}`}
                placeholder="Transaction reference"
                maxLength={200}
                value={refs[p.id] ?? ""}
                onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}
    </FormDialog>
  );
}

// One payout batch (spec §7.6): its payouts, Owner approval, payment references, cancel, export.
export function PayoutBatchScreen({ id }: { id: string }) {
  const me = useMe();
  const batch = useGetV1AdminAffiliateProgramPayoutBatchesIdQuery({ id });
  const [approve, approving] = usePostV1AdminAffiliateProgramPayoutBatchesIdApproveMutation();
  const [cancel] = usePostV1AdminAffiliateProgramPayoutBatchesIdCancelMutation();
  const [exporting, setExporting] = useState(false);

  const back = (
    <Link href="/admin/affiliates/payouts" className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeftIcon data-icon="inline-start" /> Payout batches
    </Link>
  );

  if (batch.error) {
    return (
      <>
        <PageHeader title="Payout batch" actions={back} />
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(batch.error)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!batch.data) {
    return (
      <>
        <PageHeader title="Payout batch" actions={back} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const b = batch.data;
  const actions = batchActions(b.status, me.data?.permissions);
  const paidCount = b.payouts.filter((p) => p.status === "PAID").length;

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadFromApi(
        `/v1/admin/affiliate-program/payout-batches/${b.id}/export`,
        `payout-batch-${b.id}.csv`,
        () => me.refetch(),
      );
    } catch (err) {
      notifyError({ data: { code: "DOWNLOAD_FAILED", message: (err as Error).message } });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`Payout batch ${shortId(b.id)}`}
        description={`${b.payouts.length} payout${b.payouts.length === 1 ? "" : "s"} totalling ${formatMoney(b.totalMinor, b.currency)}.`}
        actions={back}
      />

      <dl className="mb-6 grid gap-4 rounded-lg border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd>
            <Badge variant={payoutStatusVariant(b.status)}>{BATCH_STATUS_LABELS[b.status]}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prepared</dt>
          <dd>
            {staffLabel(b.preparedBy, me.data?.id)} · {formatDateTime(b.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Approved</dt>
          <dd>
            {b.approvedBy ? `${staffLabel(b.approvedBy, me.data?.id)} · ${formatDateTime(b.approvedAt)}` : "Not yet"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Paid</dt>
          <dd className="tabular-nums">
            {paidCount} of {b.payouts.length}
          </dd>
        </div>
      </dl>

      {b.status === "DRAFT" && (
        <Alert className="mb-6">
          <AlertTitle>Waiting for the Owner&apos;s approval</AlertTitle>
          <AlertDescription>
            Check the amounts and payout methods below. Nothing can be paid until the batch is approved.
          </AlertDescription>
        </Alert>
      )}

      <section aria-label="Batch actions" className="mb-6 flex flex-wrap items-start gap-4">
        {actions.approve && (
          <div className="space-y-1">
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  disabled={!actions.approve.allowed || approving.isLoading}
                  aria-describedby={actions.approve.reason ? "approve-reason" : undefined}
                >
                  <CheckIcon data-icon="inline-start" /> Approve batch
                </Button>
              }
              title="Approve this batch?"
              description={`You're approving ${b.payouts.length} payout${b.payouts.length === 1 ? "" : "s"} totalling ${formatMoney(b.totalMinor, b.currency)}. Staff can then send the money and record the references.`}
              confirmLabel="Approve batch"
              onConfirm={() =>
                approve({ id: b.id })
                  .unwrap()
                  .then(() => notifySaved("Batch approved"), notifyError)
              }
            />
            <Reason id="approve-reason" text={actions.approve.reason} />
          </div>
        )}
        {actions.markPaid && (
          <div className="space-y-1">
            {actions.markPaid.allowed ? (
              <MarkPaidDialog batch={b} />
            ) : (
              <Button size="sm" disabled aria-describedby="paid-reason">
                <CheckIcon data-icon="inline-start" /> Record payments
              </Button>
            )}
            <Reason id="paid-reason" text={actions.markPaid.reason} />
          </div>
        )}
        <div className="space-y-1">
          <Button
            size="sm"
            variant="outline"
            disabled={!actions.export?.allowed || exporting}
            onClick={exportCsv}
            aria-describedby={actions.export?.reason ? "export-reason" : undefined}
          >
            <DownloadIcon data-icon="inline-start" /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
          <Reason id="export-reason" text={actions.export?.reason ?? null} />
          {actions.export?.allowed && (
            <p className="text-xs text-muted-foreground">Full account numbers are included for the Owner only.</p>
          )}
        </div>
        {actions.cancel && (
          <div className="space-y-1">
            <ConfirmDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!actions.cancel.allowed}
                  aria-describedby={actions.cancel.reason ? "cancel-reason" : undefined}
                >
                  <XIcon data-icon="inline-start" /> Cancel batch
                </Button>
              }
              title="Cancel this batch?"
              description="Its unpaid payouts are cancelled and their earnings go back to each affiliate's approved balance, ready for the next batch."
              confirmLabel="Cancel batch"
              destructive
              onConfirm={() =>
                cancel({ id: b.id })
                  .unwrap()
                  .then(() => notifySaved("Batch cancelled"), notifyError)
              }
            />
            <Reason id="cancel-reason" text={actions.cancel.reason} />
          </div>
        )}
      </section>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Affiliate</TableHead>
              <TableHead>Payout method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {b.payouts.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  This batch has no payouts.
                </TableCell>
              </TableRow>
            )}
            {b.payouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/admin/affiliates/${p.affiliateId}`}
                    className="text-xs font-medium underline-offset-4 hover:underline"
                  >
                    {p.affiliate?.customer.email ?? shortId(p.affiliateId)}
                  </Link>
                </TableCell>
                <TableCell className="text-xs">{payoutMethodText(p)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {formatMoney(p.amountMinor, p.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant={payoutStatusVariant(p.status)}>{PAYOUT_STATUS_LABELS[p.status]}</Badge>
                  {p.failureReason && <p className="text-xs text-destructive">{p.failureReason}</p>}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {p.providerRef ?? "—"}
                  {p.paidAt && (
                    <span className="block font-sans text-muted-foreground">{formatDateTime(p.paidAt)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
