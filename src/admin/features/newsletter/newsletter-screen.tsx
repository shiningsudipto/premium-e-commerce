"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { BanIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCan, useMe } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  useDeleteV1AdminNewsletterSubscribersIdMutation,
  useGetV1AdminNewsletterSubscribersCountsQuery,
  useGetV1AdminNewsletterSubscribersQuery,
  usePostV1AdminNewsletterSubscribersIdUnsubscribeMutation,
  type GetV1AdminNewsletterSubscribersApiArg,
  type GetV1AdminNewsletterSubscribersApiResponse,
} from "../../store/api.generated";
import { downloadFromApi } from "../data/download";

// Newsletter sign-ups from the storefront's Newsletter blocks (admin → Marketing → Newsletter):
// who signed up, whether they confirmed, their language and the page they signed up on; with a
// CSV export for your email tool, and unsubscribe / erase for requests that come in by phone.

type Row = GetV1AdminNewsletterSubscribersApiResponse["items"][number];
type Status = Row["status"];

const PAGE_SIZE = 50;

const STATUS: Record<Status, { label: string; variant: "default" | "secondary" | "outline" }> = {
  SUBSCRIBED: { label: "Subscribed", variant: "default" },
  PENDING: { label: "Awaiting confirmation", variant: "secondary" },
  UNSUBSCRIBED: { label: "Unsubscribed", variant: "outline" },
};
const LANGUAGE: Record<string, string> = { en: "English", bn: "বাংলা" };

const filterDefs: FilterDef[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Email" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "SUBSCRIBED", label: "Subscribed" },
      { value: "PENDING", label: "Awaiting confirmation" },
      { value: "UNSUBSCRIBED", label: "Unsubscribed" },
    ],
  },
];

function RowActions({ row }: { row: Row }) {
  const canWrite = useCan("customers.write");
  const [unsubscribe] = usePostV1AdminNewsletterSubscribersIdUnsubscribeMutation();
  const [remove] = useDeleteV1AdminNewsletterSubscribersIdMutation();
  if (!canWrite) return null;
  return (
    <div className="flex justify-end gap-1">
      {row.status !== "UNSUBSCRIBED" && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" aria-label={`Unsubscribe ${row.email}`}>
              <BanIcon /> Unsubscribe
            </Button>
          }
          title={`Unsubscribe ${row.email}?`}
          description="They stop receiving the newsletter and marketing emails. They can sign up again themselves later."
          confirmLabel="Unsubscribe"
          onConfirm={() =>
            unsubscribe({ id: row.id })
              .unwrap()
              .then(() => notifySaved(`${row.email} unsubscribed`), notifyError)
          }
        />
      )}
      <ConfirmDialog
        trigger={
          <Button
            size="icon"
            variant="ghost"
            className="size-8 hover:text-destructive"
            aria-label={`Erase ${row.email}`}
            title="Erase"
          >
            <Trash2Icon />
          </Button>
        }
        title={`Erase ${row.email}?`}
        description="The sign-up is deleted completely, e.g. for a data deletion request. To simply stop emails, unsubscribe instead."
        confirmLabel="Erase"
        destructive
        onConfirm={() =>
          remove({ id: row.id })
            .unwrap()
            .then(() => notifySaved(`${row.email} erased`), notifyError)
        }
      />
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  {
    header: "Email",
    cell: ({ row: { original: r } }) =>
      r.customerId ? (
        <Link
          href={`/admin/customers/${r.customerId}`}
          className="font-medium hover:underline"
          title="Has a customer account"
        >
          {r.email}
        </Link>
      ) : (
        <span className="font-medium">{r.email}</span>
      ),
  },
  {
    header: "Status",
    cell: ({ row: { original: r } }) => <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge>,
  },
  {
    header: "Language",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs">{r.locale ? (LANGUAGE[r.locale] ?? r.locale) : "—"}</span>
    ),
  },
  {
    header: "Signed up",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
    ),
  },
  {
    header: "Confirmed",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {r.unsubscribedAt
          ? `Left ${formatDateTime(r.unsubscribedAt)}`
          : r.confirmedAt
            ? formatDateTime(r.confirmedAt)
            : "Not yet"}
      </span>
    ),
  },
  {
    header: "Signed up on",
    cell: ({ row: { original: r } }) => (
      <span className="font-mono text-[11px] text-muted-foreground" title={r.consentText ?? undefined}>
        {r.source ?? "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row: { original: r } }) => <RowActions row={r} />,
  },
];

export function NewsletterScreen() {
  const filters = useTableFilters(filterDefs);
  const pages = useCursorPages(filters.key);
  const me = useMe();
  const [exporting, setExporting] = useState(false);
  const values = filters.values as Partial<GetV1AdminNewsletterSubscribersApiArg>;
  const list = useGetV1AdminNewsletterSubscribersQuery({
    ...values,
    limit: PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  const counts = useGetV1AdminNewsletterSubscribersCountsQuery({});

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (values.status) params.set("status", values.status);
      if (values.q) params.set("q", values.q);
      const date = new Date().toISOString().slice(0, 10);
      await downloadFromApi(
        `/v1/admin/newsletter/subscribers/export?${params}`,
        `newsletter-subscribers-${date}.csv`,
        () => me.refetch(),
      );
    } catch (err) {
      notifyError(err instanceof Error ? { data: { code: "DOWNLOAD", message: err.message } } : err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Everyone who signed up with a Newsletter block on the storefront. Send your newsletter to the “Subscribed” addresses."
        actions={
          <Button size="sm" variant="outline" onClick={() => void exportCsv()} disabled={exporting}>
            <DownloadIcon /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3" aria-label="Totals">
        {(
          [
            ["subscribed", "Subscribed", "On the list and receiving the newsletter"],
            ["pending", "Awaiting confirmation", "Only used when confirmation emails are on in Settings"],
            ["unsubscribed", "Unsubscribed", "Left the list (they can sign up again)"],
          ] as const
        ).map(([key, label, hint]) => (
          <div key={key} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums">{counts.data ? counts.data[key] : "…"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>
      <Alert className="mb-4">
        <AlertDescription>
          Tip: filter by <strong>Subscribed</strong> and export the CSV to import into Brevo (Contacts → Import) or
          another email tool. Sign-ups are added straight away; if you start getting fake or mistyped addresses, turn on
          confirmation emails in{" "}
          <Link href="/admin/settings" className="underline">
            Settings → Newsletter
          </Link>
          .
        </AlertDescription>
      </Alert>
      <DataTable
        tableKey="newsletter-subscribers"
        columns={columns}
        data={list.data?.items}
        loading={list.isFetching}
        error={list.error}
        getRowId={(r) => r.id}
        filters={filterDefs}
        emptyMessage="No sign-ups match these filters yet."
        pagination={{
          page: pages.page,
          hasNext: !!list.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(list.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
