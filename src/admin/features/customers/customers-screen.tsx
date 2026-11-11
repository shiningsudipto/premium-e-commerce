"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminCustomersQuery,
  type GetV1AdminCustomersApiResponse,
} from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { CustomerGroupsButton } from "./customer-groups";

type CustomerRow = GetV1AdminCustomersApiResponse["items"][number];

export const customerName = (c: { firstName: string | null; lastName: string | null }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ");

const columns: ColumnDef<CustomerRow>[] = [
  {
    header: "Name",
    cell: ({ row: { original: c } }) => (
      <Link href={`/admin/customers/${c.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
        {customerName(c) || c.email || c.phone || "Unnamed customer"}
      </Link>
    ),
  },
  { header: "Email", cell: ({ row: { original: c } }) => <span className="text-xs">{c.email ?? "—"}</span> },
  { header: "Phone", cell: ({ row: { original: c } }) => <span className="text-xs">{c.phone ?? "—"}</span> },
  {
    header: "Account",
    cell: ({ row: { original: c } }) =>
      c.archivedAt ? (
        <Badge variant="outline">Archived</Badge>
      ) : c.hasAccount ? (
        <Badge variant="secondary">Registered</Badge>
      ) : (
        <span className="text-xs text-muted-foreground">Guest</span>
      ),
  },
  {
    header: "Marketing",
    cell: ({ row: { original: c } }) => <span className="text-xs">{c.acceptsMarketing ? "Subscribed" : "—"}</span>,
  },
  {
    header: "Tags",
    cell: ({ row: { original: c } }) => (
      <div className="flex max-w-xs flex-wrap gap-1">
        {c.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    header: "Created",
    cell: ({ row: { original: c } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(c.createdAt)}</span>
    ),
  },
];

// Customers (spec §6.6): search, filter by group or tag, open a profile; manage customer groups.
export function CustomersScreen() {
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const filterDefs = useMemo<FilterDef[]>(
    () => [
      { key: "q", label: "Search", type: "text", placeholder: "Name, email or phone" },
      { key: "tag", label: "Tag", type: "text" },
      {
        key: "groupId",
        label: "Group",
        type: "select",
        options: (groups.data ?? []).map((g) => ({ value: g.id, label: g.name })),
      },
    ],
    [groups.data],
  );
  const filters = useTableFilters(filterDefs);
  const pages = useCursorPages(filters.key);
  const customers = useGetV1AdminCustomersQuery({
    limit: 25,
    ...filters.values,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Shoppers who placed an order or created an account."
        actions={<CustomerGroupsButton />}
      />
      <DataTable
        tableKey="customers"
        columns={columns}
        data={customers.data?.items}
        loading={customers.isFetching}
        error={customers.error}
        getRowId={(c) => c.id}
        filters={filterDefs}
        emptyMessage="No customers match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!customers.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(customers.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
