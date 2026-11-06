"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useGetV1AdminOrdersQuery, type GetV1AdminOrdersApiResponse } from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { formatMoney } from "../../lib/money";
import {
  dateFilter,
  ORDER_STATUS_LABELS,
  orderStatusVariant,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "./order-actions";

type OrderRow = GetV1AdminOrdersApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Order number or email" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  },
  { key: "from", label: "Placed from", type: "text", placeholder: "From (YYYY-MM-DD)" },
  { key: "to", label: "Placed to", type: "text", placeholder: "To (YYYY-MM-DD)" },
  // set by the customer profile's "View all orders" link
  { key: "customerId", label: "Customer ID", type: "text", placeholder: "Customer ID" },
];

const columns: ColumnDef<OrderRow>[] = [
  {
    header: "Order",
    cell: ({ row: { original: o } }) => (
      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium underline-offset-4 hover:underline">
        {o.displayNumber}
      </Link>
    ),
  },
  {
    header: "Placed",
    cell: ({ row: { original: o } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(o.placedAt ?? o.createdAt)}</span>
    ),
  },
  { header: "Email", cell: ({ row: { original: o } }) => <span className="text-xs">{o.email}</span> },
  {
    header: "Status",
    cell: ({ row: { original: o } }) => (
      <Badge variant={orderStatusVariant(o.status)}>{ORDER_STATUS_LABELS[o.status]}</Badge>
    ),
  },
  {
    header: "Payment",
    cell: ({ row: { original: o } }) =>
      o.paymentStatus ? (
        <span className="text-xs">
          {PAYMENT_STATUS_LABELS[o.paymentStatus]}
          <span className="text-muted-foreground"> · {o.paymentProvider}</span>
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  { header: "Lines", cell: ({ row: { original: o } }) => <span className="text-xs">{o.lineCount}</span> },
  {
    header: "Total",
    cell: ({ row: { original: o } }) => (
      <span className="text-xs font-medium tabular-nums">{formatMoney(o.totalMinor, o.currency)}</span>
    ),
  },
];

// Orders (spec §6.4): newest first, filtered from the URL so a view can be saved or shared.
export function OrdersScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const { q, status, from, to, customerId } = filters.values;
  const orders = useGetV1AdminOrdersQuery({
    limit: 25,
    ...(q ? { q } : {}),
    ...(status ? { status: status as OrderStatus } : {}),
    ...(dateFilter(from) ? { from: dateFilter(from) } : {}),
    ...(dateFilter(to, true) ? { to: dateFilter(to, true) } : {}),
    ...(customerId ? { customerId } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order placed in the store. Save a set of filters as a view to come back to it."
      />
      <DataTable
        tableKey="orders"
        columns={columns}
        data={orders.data?.items}
        loading={orders.isFetching}
        error={orders.error}
        getRowId={(o) => o.id}
        filters={FILTERS}
        emptyMessage="No orders match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!orders.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(orders.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
