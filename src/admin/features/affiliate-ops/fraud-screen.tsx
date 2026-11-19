"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetV1AdminAffiliateProgramFraudFlagsQuery,
  usePostV1AdminAffiliateProgramFraudFlagsIdResolveMutation,
  type GetV1AdminAffiliateProgramFraudFlagsApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { notifySaved } from "../../lib/notify";
import { FormDialog, firstError } from "../affiliates/affiliate-dialogs";
import { AffiliateOpsNav } from "./ops-nav";
import {
  FRAUD_KIND_LABELS,
  FRAUD_STATUS_LABELS,
  RESOLVE_OUTCOMES,
  buildResolve,
  fraudEvidence,
  fraudStatusVariant,
  type FraudKind,
  type FraudStatus,
  type ResolveForm,
} from "./ops-logic";

type Flag = GetV1AdminAffiliateProgramFraudFlagsApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: Object.entries(FRAUD_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: "affiliateId", label: "Affiliate ID", type: "text", placeholder: "Affiliate ID" },
];

function ResolveDialog({ flag }: { flag: Flag }) {
  const [resolve] = usePostV1AdminAffiliateProgramFraudFlagsIdResolveMutation();
  const [form, setForm] = useState<ResolveForm>({ outcome: "DISMISSED", note: "" });
  const idp = `resolve-${flag.id}`;
  const who = flag.affiliate.customer.email ?? "this affiliate";
  return (
    <FormDialog
      trigger={
        <Button size="xs" variant="outline" aria-label={`Resolve ${FRAUD_KIND_LABELS[flag.kind]} flag for ${who}`}>
          Resolve
        </Button>
      }
      title="Resolve fraud flag"
      description={`${FRAUD_KIND_LABELS[flag.kind]} for ${who}. The decision and note are recorded in the audit log.`}
      submitLabel="Save decision"
      destructive={form.outcome === "SUSPEND"}
      onOpen={() => setForm({ outcome: "DISMISSED", note: "" })}
      onSubmit={() => {
        const result = buildResolve(form);
        if (!result.ok) return result.errors;
        return resolve({ id: flag.id, body: result.body })
          .unwrap()
          .then(() =>
            notifySaved(
              result.body.status === "DISMISSED"
                ? "Flag dismissed"
                : result.body.suspend
                  ? "Flag confirmed; affiliate suspended"
                  : "Flag confirmed",
            ),
          );
      }}
    >
      {(errors) => (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Outcome</legend>
            {RESOLVE_OUTCOMES.filter((o) => o.value !== "SUSPEND" || flag.affiliate.status === "ACTIVE").map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm has-checked:border-primary"
              >
                <input
                  type="radio"
                  name={`${idp}-outcome`}
                  value={o.value}
                  checked={form.outcome === o.value}
                  onChange={() => setForm((f) => ({ ...f, outcome: o.value }))}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.help}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field data-invalid={firstError(errors, "note") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-note`}>Note{form.outcome === "DISMISSED" ? " (optional)" : ""}</FieldLabel>
            <Textarea
              id={`${idp}-note`}
              value={form.note}
              maxLength={1000}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
            <FieldDescription>What you checked and why you decided this.</FieldDescription>
            <FieldError>{firstError(errors, "note")}</FieldError>
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

function FlagActions({ flag }: { flag: Flag }) {
  const canManage = useCan("affiliates.manage");
  if (flag.status !== "OPEN" || !canManage) return null;
  return <ResolveDialog flag={flag} />;
}

const columns: ColumnDef<Flag>[] = [
  {
    header: "Affiliate",
    cell: ({ row: { original: f } }) => (
      <div>
        <Link
          href={`/admin/affiliates/${f.affiliateId}`}
          className="text-xs font-medium underline-offset-4 hover:underline"
        >
          {f.affiliate.customer.email ?? f.affiliateId}
        </Link>
        <p className="text-xs text-muted-foreground">Affiliate is {f.affiliate.status.toLowerCase()}</p>
      </div>
    ),
  },
  {
    header: "Signal",
    cell: ({ row: { original: f } }) => <span className="text-xs">{FRAUD_KIND_LABELS[f.kind as FraudKind]}</span>,
  },
  {
    header: "Evidence",
    cell: ({ row: { original: f } }) => {
      const evidence = fraudEvidence(f.kind, f.details);
      return (
        <div className="text-xs">
          {evidence.length ? (
            <ul>
              {evidence.map((e) => (
                <li key={e.label}>
                  <span className="text-muted-foreground">{e.label}:</span>{" "}
                  <span className="tabular-nums">{e.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
          {f.orderId && (
            <Link href={`/admin/orders/${f.orderId}`} className="underline-offset-4 hover:underline">
              View order
            </Link>
          )}
        </div>
      );
    },
  },
  {
    header: "Status",
    cell: ({ row: { original: f } }) => (
      <div className="space-y-1">
        <Badge variant={fraudStatusVariant(f.status as FraudStatus)}>
          {FRAUD_STATUS_LABELS[f.status as FraudStatus]}
        </Badge>
        {f.resolvedAt && <p className="text-xs text-muted-foreground">{formatDateTime(f.resolvedAt)}</p>}
        {f.note && <p className="max-w-xs text-xs text-muted-foreground">{f.note}</p>}
      </div>
    ),
  },
  {
    header: "Raised",
    cell: ({ row: { original: f } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(f.createdAt)}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row: { original: f } }) => <FlagActions flag={f} />,
  },
];

// Fraud review queue (spec §7.8): flags raised automatically (refund rates, click spikes,
// self-referrals, margin caps) or by staff; dismiss or confirm them, optionally suspending.
export function FraudScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const { status, affiliateId } = filters.values;
  const flags = useGetV1AdminAffiliateProgramFraudFlagsQuery({
    limit: 25,
    ...(status && status in FRAUD_STATUS_LABELS ? { status: status as FraudStatus } : {}),
    ...(affiliateId ? { affiliateId } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  return (
    <>
      <PageHeader
        title="Fraud review"
        description="Suspicious affiliate activity. Check the evidence, then dismiss the flag or confirm it, suspending the affiliate if needed."
        actions={<AffiliateOpsNav current="fraud" />}
      />
      <DataTable
        tableKey="affiliate-fraud"
        columns={columns}
        data={flags.data?.items}
        loading={flags.isFetching}
        error={flags.error}
        getRowId={(f) => f.id}
        filters={FILTERS}
        emptyMessage="No flags match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!flags.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(flags.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
