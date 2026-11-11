"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime } from "../../lib/format";
import { adminApi, useGetV1AdminDataJobsQuery } from "../../store/api.generated";
import { ExportDownload, StatusBadge } from "./job-report";
import { POLL_MS, isFinished, jobOutcome, jobTitle, type DataJob } from "./jobs";

const LIMIT = 25;

// Recent import and export jobs, newest first. While any job on the page is still queued or
// running the list refreshes itself.
export function JobHistory() {
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = useCursorPages();
  const arg = { limit: LIMIT, cursor: pages.cursor };
  const cached = adminApi.endpoints.getV1AdminDataJobs.useQueryState(arg);
  const busy = cached.data?.items.some((j) => !isFinished(j.status)) ?? false;
  const list = useGetV1AdminDataJobsQuery(arg, { pollingInterval: busy ? POLL_MS : 0 });

  const reportHref = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("job", id);
    return `${pathname}?${next.toString()}`;
  };

  const columns: ColumnDef<DataJob>[] = [
    {
      id: "createdAt",
      header: "Started",
      cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
    },
    { id: "job", header: "Job", cell: ({ row }) => <span className="text-sm">{jobTitle(row.original)}</span> },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "outcome",
      header: "Outcome",
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-sm text-xs whitespace-normal text-muted-foreground">
          {jobOutcome(row.original)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex justify-end gap-1">
            {job.kind === "EXPORT" && job.status === "COMPLETED" && <ExportDownload job={job} size="sm" />}
            <Link
              href={reportHref(job.id)}
              scroll={false}
              className={buttonVariants({ size: "sm", variant: "ghost" })}
              aria-label={`Report for ${jobTitle(job)}, ${formatDateTime(job.createdAt)}`}
            >
              Report
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      tableKey="data-jobs"
      columns={columns}
      data={list.currentData?.items}
      getRowId={(j) => j.id}
      loading={list.currentData === undefined && !list.error}
      error={list.error}
      emptyMessage="No imports or exports yet."
      pagination={{
        page: pages.page,
        hasNext: !!list.data?.nextCursor,
        hasPrevious: pages.hasPrevious,
        onNext: () => pages.next(list.data?.nextCursor),
        onPrevious: pages.previous,
      }}
    />
  );
}
