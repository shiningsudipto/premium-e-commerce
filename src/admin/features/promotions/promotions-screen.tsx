"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { FlaskConicalIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useGetV1AdminPromotionsQuery, type GetV1AdminPromotionsApiResponse } from "../../store/api.generated";
import { Can } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import {
  EFFECTIVE_STATUS_LABELS,
  effectiveStatusVariant,
  TYPE_LABELS,
  type PromotionStatus,
  type PromotionType,
} from "./promotion-form";
import { readActions, readConditions, summarizeAction, summarizeConditions } from "./promotion-rules";
import { DEFAULT_CURRENCY } from "../../lib/money";

type PromotionRow = GetV1AdminPromotionsApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Search by name" },
  {
    key: "type",
    label: "Type",
    type: "select",
    options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    // the API filters by stored status; scheduled and expired are active promotions outside their window
    options: [
      { value: "DRAFT", label: "Draft" },
      { value: "ACTIVE", label: "Active (incl. scheduled and expired)" },
      { value: "ARCHIVED", label: "Archived" },
    ],
  },
];

const columns: ColumnDef<PromotionRow>[] = [
  {
    header: "Promotion",
    cell: ({ row: { original: p } }) => {
      const actions = readActions(p.actions);
      return (
        <div className="max-w-md space-y-0.5 whitespace-normal">
          <Link href={`/admin/promotions/${p.id}`} className="font-medium underline-offset-4 hover:underline">
            {p.name}
          </Link>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {actions.map((a) => summarizeAction(a, DEFAULT_CURRENCY)).join(" + ") || "No actions"}
            {" · when "}
            {summarizeConditions(readConditions(p.conditions), DEFAULT_CURRENCY).replace(/^Every/, "every")}
          </p>
        </div>
      );
    },
  },
  {
    header: "Type",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs">
        {TYPE_LABELS[p.type]}
        {p.type === "CODE" && (
          <span className="text-muted-foreground">
            {" "}
            · {p._count.codes} code{p._count.codes === 1 ? "" : "s"}
          </span>
        )}
      </span>
    ),
  },
  {
    header: "Status",
    cell: ({ row: { original: p } }) => (
      <Badge variant={effectiveStatusVariant(p.effectiveStatus)}>{EFFECTIVE_STATUS_LABELS[p.effectiveStatus]}</Badge>
    ),
  },
  {
    header: "Window",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {p.startsAt || p.endsAt ? `${formatDateTime(p.startsAt)} → ${formatDateTime(p.endsAt)}` : "Always"}
      </span>
    ),
  },
  {
    header: "Priority",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs tabular-nums">
        {p.priority}
        {p.stopFurther && <span className="text-muted-foreground"> · stops</span>}
        {p.exclusivityGroup && <span className="text-muted-foreground"> · {p.exclusivityGroup}</span>}
      </span>
    ),
  },
  {
    header: "Uses",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs tabular-nums">
        {p.usageCount}
        {p.usageLimit !== null && <span className="text-muted-foreground"> / {p.usageLimit}</span>}
      </span>
    ),
  },
  {
    header: "Updated",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(p.updatedAt)}</span>
    ),
  },
];

// Promotions (spec §8): automatic and code promotions, newest first, filtered from the URL.
export function PromotionsScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const { q, type, status } = filters.values;
  const promotions = useGetV1AdminPromotionsQuery({
    limit: 25,
    ...(q ? { q } : {}),
    ...(type ? { type: type as PromotionType } : {}),
    ...(status ? { status: status as PromotionStatus } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Automatic discounts and promo codes. Build the rules, test them in the simulator, then activate."
        actions={
          <>
            <Link href="/admin/promotions/simulator" className={buttonVariants({ size: "sm", variant: "outline" })}>
              <FlaskConicalIcon /> Simulator
            </Link>
            <Can permission="promotions.write">
              <Link href="/admin/promotions/new" className={buttonVariants({ size: "sm" })}>
                <PlusIcon /> New promotion
              </Link>
            </Can>
          </>
        }
      />
      <DataTable
        tableKey="promotions"
        columns={columns}
        data={promotions.data?.items}
        loading={promotions.isFetching}
        error={promotions.error}
        getRowId={(p) => p.id}
        filters={FILTERS}
        emptyMessage="No promotions match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!promotions.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(promotions.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
