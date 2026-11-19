"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useGetV1AdminWorkflowsIdRunsQuery } from "../../store/api.generated";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime, shortId } from "../../lib/format";
import { ACTIONS, RUN_STATUS, runStatus, type ActionType, type Run } from "./workflow-rules";

const actionLabel = (type: string) => ACTIONS[type as ActionType]?.label ?? type;

const columns: ColumnDef<Run>[] = [
  {
    header: "When",
    cell: ({ row: { original: r } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
    ),
  },
  {
    header: "Event",
    cell: ({ row: { original: r } }) => (
      <span className="font-mono text-xs" title={r.eventId}>
        {shortId(r.eventId)}
      </span>
    ),
  },
  {
    header: "Outcome",
    cell: ({ row: { original: r } }) => {
      const status = RUN_STATUS[runStatus(r)];
      return <Badge variant={status.variant}>{status.label}</Badge>;
    },
  },
  {
    header: "Actions",
    cell: ({ row: { original: r } }) =>
      r.result.length === 0 ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        <ul className="space-y-0.5 text-xs whitespace-normal">
          {r.result.map((a, i) => (
            <li key={i}>
              <span className={a.ok ? undefined : "text-destructive"}>
                {actionLabel(a.type)}: {a.ok ? "done" : "failed"}
              </span>
              {a.error && <span className="text-muted-foreground"> — {a.error}</span>}
            </li>
          ))}
        </ul>
      ),
  },
];

// Every event the rule saw: whether it matched and what each action did.
export function RuleRuns({ ruleId }: { ruleId: string }) {
  const pages = useCursorPages(ruleId);
  const runs = useGetV1AdminWorkflowsIdRunsQuery({
    id: ruleId,
    limit: 20,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  return (
    <DataTable
      tableKey="workflow-runs"
      columns={columns}
      data={runs.data?.items}
      loading={runs.isFetching}
      error={runs.error}
      getRowId={(r) => r.id}
      emptyMessage="No runs yet. A run is logged for each event of its trigger while the rule is on."
      pagination={{
        page: pages.page,
        hasNext: !!runs.data?.nextCursor,
        hasPrevious: pages.hasPrevious,
        onNext: () => pages.next(runs.data?.nextCursor),
        onPrevious: pages.previous,
      }}
    />
  );
}
