"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  useGetV1AdminAffiliateProgramPayoutBatchesQuery,
  usePostV1AdminAffiliateProgramPayoutBatchesMutation,
  type GetV1AdminAffiliateProgramPayoutBatchesApiResponse,
} from "../../store/api.generated";
import { useCan, useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime, shortId } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { notifySaved } from "../../lib/notify";
import { FormDialog, firstError } from "../affiliates/affiliate-dialogs";
import { AffiliateOpsNav } from "./ops-nav";
import { BATCH_STATUS_LABELS, PERMS, payoutStatusVariant, staffLabel } from "./ops-logic";

type Batch = GetV1AdminAffiliateProgramPayoutBatchesApiResponse["items"][number];

function PrepareBatchDialog() {
  const router = useRouter();
  const [prepare] = usePostV1AdminAffiliateProgramPayoutBatchesMutation();
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon data-icon="inline-start" /> Prepare batch
        </Button>
      }
      title="Prepare a payout batch"
      description="Creates one payout for every active affiliate whose approved cash earnings in this currency reach the payout minimum. The batch then waits for the Owner's approval."
      submitLabel="Prepare batch"
      onOpen={() => setCurrency(DEFAULT_CURRENCY)}
      onSubmit={() => {
        const code = currency.trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(code)) return { currency: "Enter a three-letter currency code, e.g. BDT." };
        return prepare({ body: { currency: code } })
          .unwrap()
          .then((batch) => {
            notifySaved(`Batch prepared with ${batch.payouts.length} payout${batch.payouts.length === 1 ? "" : "s"}`);
            router.push(`/admin/affiliates/payouts/${batch.id}`);
          });
      }}
    >
      {(errors) => (
        <Field data-invalid={firstError(errors, "currency") ? true : undefined}>
          <FieldLabel htmlFor="batch-currency">Currency</FieldLabel>
          <Input
            id="batch-currency"
            value={currency}
            maxLength={3}
            className="w-28 uppercase"
            onChange={(e) => setCurrency(e.target.value)}
          />
          <FieldDescription>Earnings in other currencies are left for their own batch.</FieldDescription>
          <FieldError>{firstError(errors, "currency")}</FieldError>
        </Field>
      )}
    </FormDialog>
  );
}

// Payout batches (spec §7.6): prepared by staff, approved by the Owner, paid outside the system
// and recorded with references.
export function PayoutBatchesScreen() {
  const me = useMe();
  const canPrepare = useCan(PERMS.prepare);
  const pages = useCursorPages();
  const batches = useGetV1AdminAffiliateProgramPayoutBatchesQuery({
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  const columns: ColumnDef<Batch>[] = [
    {
      header: "Batch",
      cell: ({ row: { original: b } }) => (
        <Link
          href={`/admin/affiliates/payouts/${b.id}`}
          className="font-mono text-xs font-medium underline-offset-4 hover:underline"
          title={b.id}
        >
          {shortId(b.id)}
        </Link>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: b } }) => (
        <Badge variant={payoutStatusVariant(b.status)}>{BATCH_STATUS_LABELS[b.status]}</Badge>
      ),
    },
    {
      header: "Total",
      cell: ({ row: { original: b } }) => (
        <span className="text-xs tabular-nums">{formatMoney(b.totalMinor, b.currency)}</span>
      ),
    },
    {
      header: "Payouts",
      cell: ({ row: { original: b } }) => <span className="text-xs tabular-nums">{b.payoutCount}</span>,
    },
    {
      header: "Prepared",
      cell: ({ row: { original: b } }) => (
        <span className="text-xs">
          {staffLabel(b.preparedBy, me.data?.id)}
          <span className="block text-muted-foreground">{formatDateTime(b.createdAt)}</span>
        </span>
      ),
    },
    {
      header: "Approved",
      cell: ({ row: { original: b } }) =>
        b.approvedBy ? (
          <span className="text-xs">
            {staffLabel(b.approvedBy, me.data?.id)}
            <span className="block text-muted-foreground">{formatDateTime(b.approvedAt)}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not yet</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payout batches"
        description="Pay affiliates in batches. Staff prepare a batch, the Owner approves it, then payments are sent (bank, bKash, Nagad, Rocket) and recorded with references."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <AffiliateOpsNav current="payouts" />
            {canPrepare && <PrepareBatchDialog />}
          </div>
        }
      />
      <DataTable
        tableKey="affiliate-payout-batches"
        columns={columns}
        data={batches.data?.items}
        loading={batches.isFetching}
        error={batches.error}
        getRowId={(b) => b.id}
        emptyMessage="No payout batches yet."
        pagination={{
          page: pages.page,
          hasNext: !!batches.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(batches.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
