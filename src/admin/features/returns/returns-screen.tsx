"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useGetV1AdminReturnsQuery, type GetV1AdminReturnsApiResponse } from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { RESOLUTION_LABELS, RETURN_STATUS_LABELS, returnStatusVariant, type ReturnStatus } from "./return-actions";

type ReturnRow = GetV1AdminReturnsApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: Object.entries(RETURN_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const columns: ColumnDef<ReturnRow>[] = [
  {
    header: "Return",
    cell: ({ row: { original: r } }) => (
      <Link
        href={`/admin/returns/${r.id}`}
        className="font-mono text-xs font-medium underline-offset-4 hover:underline"
      >
        #{r.number}
      </Link>
    ),
  },
  {
    header: "Order",
    cell: ({ row: { original: r } }) => (
      <Link href={`/admin/orders/${r.orderId}`} className="font-mono text-xs underline-offset-4 hover:underline">
        #{r.order.number}
      </Link>
    ),
  },
  { header: "Customer", cell: ({ row: { original: r } }) => <span className="text-xs">{r.order.email}</span> },
  {
    header: "Resolution",
    cell: ({ row: { original: r } }) => <span className="text-xs">{RESOLUTION_LABELS[r.resolution]}</span>,
  },
  {
    header: "Status",
    cell: ({ row: { original: r } }) => (
      <Badge variant={returnStatusVariant(r.status)}>{RETURN_STATUS_LABELS[r.status]}</Badge>
    ),
  },
  {
    header: "Units",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs tabular-nums">{r.lines.reduce((n, l) => n + l.quantity, 0)}</span>
    ),
  },
  {
    header: "Requested",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
    ),
  },
];

// Returns queue (spec §6.5, §14.4): newest first; open a return to move it through the workflow.
export function ReturnsScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const { status } = filters.values;
  const returns = useGetV1AdminReturnsQuery({
    limit: 25,
    ...(status && status in RETURN_STATUS_LABELS ? { status: status as ReturnStatus } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Returns"
        description="Return and exchange requests from customers. Approve them, track the parcel back, inspect what arrives and settle."
      />
      <DataTable
        tableKey="returns"
        columns={columns}
        data={returns.data?.items}
        loading={returns.isFetching}
        error={returns.error}
        getRowId={(r) => r.id}
        filters={FILTERS}
        emptyMessage="No returns match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!returns.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(returns.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
