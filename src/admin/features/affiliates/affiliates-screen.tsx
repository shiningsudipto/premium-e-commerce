"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SettingsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetV1AdminAffiliatesConfigTiersQuery,
  useGetV1AdminAffiliatesQuery,
  type GetV1AdminAffiliatesApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { StatusActionDialog } from "./affiliate-dialogs";
import {
  AFFILIATE_STATUS_LABELS,
  affiliateStatusVariant,
  customerLabel,
  statusAction,
  type AffiliateStatus,
} from "./affiliate-logic";

type Row = GetV1AdminAffiliatesApiResponse["items"][number];
type Tab = "applications" | "affiliates";

const nameColumn: ColumnDef<Row> = {
  header: "Affiliate",
  cell: ({ row: { original: a } }) => (
    <div className="min-w-0">
      <Link href={`/admin/affiliates/${a.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
        {customerLabel(a.customer)}
      </Link>
      {a.customer.email && customerLabel(a.customer) !== a.customer.email && (
        <p className="truncate text-xs text-muted-foreground">{a.customer.email}</p>
      )}
    </div>
  ),
};

const tierColumn: ColumnDef<Row> = {
  header: "Tier",
  cell: ({ row: { original: a } }) => <span className="text-xs">{a.tier?.name ?? "—"}</span>,
};

const money = (minor: number, currency: string | null) => (
  <span className="text-xs tabular-nums">{formatMoney(minor, currency ?? DEFAULT_CURRENCY)}</span>
);

const affiliateColumns: ColumnDef<Row>[] = [
  nameColumn,
  {
    header: "Status",
    cell: ({ row: { original: a } }) => (
      <Badge variant={affiliateStatusVariant(a.status)}>{AFFILIATE_STATUS_LABELS[a.status]}</Badge>
    ),
  },
  tierColumn,
  {
    header: "Orders",
    cell: ({ row: { original: a } }) => <span className="text-xs tabular-nums">{a.orderCount}</span>,
  },
  { header: "Pending", cell: ({ row: { original: a } }) => money(a.pendingMinor, a.currency) },
  { header: "Payable", cell: ({ row: { original: a } }) => money(a.payableMinor, a.currency) },
  {
    header: "Joined",
    cell: ({ row: { original: a } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(a.createdAt)}</span>
    ),
  },
];

function applicationColumns(canManage: boolean): ColumnDef<Row>[] {
  return [
    nameColumn,
    tierColumn,
    {
      header: "Applied",
      cell: ({ row: { original: a } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(a.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: a } }) => (
        <div className="flex justify-end gap-2">
          <Link href={`/admin/affiliates/${a.id}`} className={buttonVariants({ size: "xs", variant: "ghost" })}>
            Review
          </Link>
          {canManage && (
            <>
              <StatusActionDialog
                affiliateId={a.id}
                name={customerLabel(a.customer)}
                action={statusAction("approve")}
                size="xs"
              />
              <StatusActionDialog
                affiliateId={a.id}
                name={customerLabel(a.customer)}
                action={statusAction("reject")}
                size="xs"
              />
            </>
          )}
        </div>
      ),
    },
  ];
}

// Affiliates (spec §7.8): the applications queue and the affiliate list.
export function AffiliatesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "affiliates" ? "affiliates" : "applications";
  const canManage = useCan("affiliates.manage");
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});

  const filterDefs = useMemo<FilterDef[]>(
    () =>
      tab === "applications"
        ? [{ key: "q", label: "Search", type: "text", placeholder: "Name, email or code" }]
        : [
            { key: "q", label: "Search", type: "text", placeholder: "Name, email or code" },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: (Object.keys(AFFILIATE_STATUS_LABELS) as AffiliateStatus[]).map((s) => ({
                value: s,
                label: AFFILIATE_STATUS_LABELS[s],
              })),
            },
            {
              key: "tierId",
              label: "Tier",
              type: "select",
              options: (tiers.data ?? []).map((t) => ({ value: t.id, label: t.name })),
            },
          ],
    [tab, tiers.data],
  );
  const filters = useTableFilters(filterDefs);
  const pages = useCursorPages(`${tab}:${filters.key}`);
  const status =
    tab === "applications" ? "PENDING" : (filters.values.status as AffiliateStatus | undefined) || undefined;
  const list = useGetV1AdminAffiliatesQuery({
    limit: 25,
    ...(filters.values.q ? { q: filters.values.q } : {}),
    ...(tab === "affiliates" && filters.values.tierId ? { tierId: filters.values.tierId } : {}),
    ...(status ? { status } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  const columns = useMemo(
    () => (tab === "applications" ? applicationColumns(canManage) : affiliateColumns),
    [tab, canManage],
  );

  function switchTab(next: Tab) {
    // filters belong to a tab; switching starts clean
    const search = new URLSearchParams();
    if (next === "affiliates") search.set("tab", "affiliates");
    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Affiliates"
        description="Review applications, manage affiliates, their earnings and payouts."
        actions={
          <Link href="/admin/affiliates/program" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <SettingsIcon data-icon="inline-start" /> Tiers &amp; commission
          </Link>
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => switchTab(v === "affiliates" ? "affiliates" : "applications")}
        className="mb-4"
      >
        <TabsList aria-label="Affiliate lists">
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="affiliates">All affiliates</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        key={tab}
        tableKey={tab === "applications" ? "affiliate-applications" : "affiliates"}
        columns={columns}
        data={list.data?.items}
        loading={list.isFetching}
        error={list.error}
        getRowId={(a) => a.id}
        filters={filterDefs}
        emptyMessage={
          tab === "applications" ? "No applications waiting for review." : "No affiliates match these filters."
        }
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
