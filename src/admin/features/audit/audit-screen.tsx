"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useGetV1AdminAuditQuery, type GetV1AdminAuditApiResponse } from "../../store/api.generated";
import { AuditDiff } from "../../components/audit-diff/audit-diff";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime, shortId } from "../../lib/format";

type AuditEvent = GetV1AdminAuditApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  { key: "entityType", label: "Entity type", type: "text", placeholder: "e.g. Setting" },
  { key: "entityId", label: "Entity ID", type: "text" },
  { key: "action", label: "Action", type: "text", placeholder: "e.g. setting.updated" },
  { key: "actorId", label: "Actor ID", type: "text" },
];

const columns: ColumnDef<AuditEvent>[] = [
  {
    header: "When",
    cell: ({ row: { original: e } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(e.occurredAt)}</span>
    ),
  },
  {
    header: "Who",
    cell: ({ row: { original: e } }) => (
      <span className="font-mono text-xs" title={e.actor.id ?? undefined}>
        {e.actor.type}
        {e.actor.id ? `:${shortId(e.actor.id)}` : ""}
      </span>
    ),
  },
  {
    header: "Action",
    cell: ({ row: { original: e } }) => (
      <Badge variant="secondary" className="font-mono">
        {e.action}
      </Badge>
    ),
  },
  {
    header: "Entity",
    cell: ({ row: { original: e } }) => (
      <span className="text-xs" title={e.entityId}>
        {e.entityType} <span className="font-mono text-muted-foreground">{shortId(e.entityId)}</span>
      </span>
    ),
  },
  {
    header: "Reason",
    cell: ({ row: { original: e } }) => (
      <span className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{e.reason ?? ""}</span>
    ),
  },
];

// Audit log (spec §6.13): who changed what, with a field-level diff. Staff with only
// audit.read_own see their own actions; the API applies that.
export function AuditScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const audit = useGetV1AdminAuditQuery({
    ...filters.values,
    limit: 50,
    ...(pages.cursor ? { before: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made in the back office or through the API, newest first."
      />
      <DataTable
        tableKey="audit"
        columns={columns}
        data={audit.data?.items}
        loading={audit.isFetching}
        error={audit.error}
        getRowId={(e) => e.id}
        filters={FILTERS}
        emptyMessage="No audit events match these filters."
        renderExpanded={(e) => (
          <div className="space-y-3">
            <AuditDiff event={e} />
            <p className="font-mono text-[11px] text-muted-foreground">
              event {e.id}
              {e.correlationId ? ` · request ${e.correlationId}` : ""}
            </p>
          </div>
        )}
        pagination={{
          page: pages.page,
          hasNext: !!audit.data?.nextBefore,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(audit.data?.nextBefore),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
