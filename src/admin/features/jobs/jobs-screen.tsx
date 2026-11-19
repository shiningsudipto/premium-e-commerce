"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { RefreshCwIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetV1AdminOpsQueuesQuery,
  useGetV1AdminOpsQueuesQueueJobsQuery,
  usePostV1AdminOpsQueuesQueueJobsIdCancelMutation,
  usePostV1AdminOpsQueuesQueueJobsIdRetryMutation,
  type GetV1AdminOpsQueuesApiResponse,
  type GetV1AdminOpsQueuesQueueJobsApiResponse,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime, shortId } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  JOB_STATE_LABELS,
  JOB_STATES,
  QUEUE_KIND_LABELS,
  isJobState,
  jobStateVariant,
  queueAttention,
  queueLabel,
  timeAgo,
} from "./job-logic";

type Queue = GetV1AdminOpsQueuesApiResponse["queues"][number];
type Job = GetV1AdminOpsQueuesQueueJobsApiResponse["items"][number];

// Live status: refreshed every 15 seconds while this tab is in front.
const POLL = { pollingInterval: 15_000, skipPollingIfUnfocused: true } as const;

const STATE_FILTER: FilterDef = {
  key: "state",
  label: "State",
  type: "select",
  options: JOB_STATES.map((s) => ({ value: s, label: JOB_STATE_LABELS[s] })),
};

function Count({ n, tone }: { n: number; tone?: "bad" }) {
  return (
    <span
      className={`tabular-nums ${n === 0 ? "text-muted-foreground" : tone === "bad" ? "font-medium text-destructive" : ""}`}
    >
      {n.toLocaleString("en-GB")}
    </span>
  );
}

function QueueTable({
  queues,
  selected,
  onSelect,
}: {
  queues: Queue[];
  selected: string | undefined;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Queue</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Waiting</TableHead>
            <TableHead className="text-right">Retrying</TableHead>
            <TableHead className="text-right">Running</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead>Last completed</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queues.map((q) => {
            const attention = queueAttention(q);
            return (
              <TableRow key={q.name} data-state={q.name === selected ? "selected" : undefined}>
                <TableCell>
                  <span className="text-sm font-medium">{queueLabel(q.name)}</span>
                  {attention === "failed" && (
                    <Badge variant="destructive" className="ml-2">
                      {q.kind === "dead-letter" ? "Has dead letters" : `${q.failedLast24h} failed today`}
                    </Badge>
                  )}
                  {attention === "backlog" && (
                    <Badge variant="default" className="ml-2">
                      Backlog
                    </Badge>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">{q.name}</p>
                </TableCell>
                <TableCell className="text-xs">{QUEUE_KIND_LABELS[q.kind]}</TableCell>
                <TableCell className="text-right text-xs">
                  <Count n={q.counts.created} />
                </TableCell>
                <TableCell className="text-right text-xs">
                  <Count n={q.counts.retry} />
                </TableCell>
                <TableCell className="text-right text-xs">
                  <Count n={q.counts.active} />
                </TableCell>
                <TableCell className="text-right text-xs">
                  <Count n={q.counts.failed} tone="bad" />
                </TableCell>
                <TableCell className="text-right text-xs">
                  <Count n={q.counts.completed} />
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap" title={formatDateTime(q.lastCompletedAt)}>
                  {timeAgo(q.lastCompletedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="xs"
                    variant={q.name === selected ? "secondary" : "outline"}
                    aria-pressed={q.name === selected}
                    aria-label={`View jobs in ${queueLabel(q.name)}`}
                    onClick={() => onSelect(q.name)}
                  >
                    View jobs
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function JobActions({ job }: { job: Job }) {
  const canWrite = useCan("settings.write");
  const [retry, retrying] = usePostV1AdminOpsQueuesQueueJobsIdRetryMutation();
  const [cancel] = usePostV1AdminOpsQueuesQueueJobsIdCancelMutation();
  if (!canWrite || (!job.actions.retry && !job.actions.cancel)) return null;
  return (
    <div className="flex justify-end gap-1">
      {job.actions.retry && (
        <Button
          size="xs"
          variant="outline"
          disabled={retrying.isLoading}
          aria-label={`Retry job ${shortId(job.id)}`}
          onClick={() =>
            retry({ queue: job.queue, id: job.id })
              .unwrap()
              .then(() => notifySaved("Job queued to run again"), notifyError)
          }
        >
          <RotateCcwIcon data-icon="inline-start" /> Retry
        </Button>
      )}
      {job.actions.cancel && (
        <ConfirmDialog
          trigger={
            <Button size="xs" variant="outline" aria-label={`Cancel job ${shortId(job.id)}`}>
              <XIcon data-icon="inline-start" /> Cancel
            </Button>
          }
          title="Cancel this job?"
          description="The job won't run. Whatever it was going to do (send an email, deliver a webhook, refresh a page) won't happen."
          confirmLabel="Cancel job"
          destructive
          onConfirm={() =>
            cancel({ queue: job.queue, id: job.id })
              .unwrap()
              .then(() => notifySaved("Job cancelled"), notifyError)
          }
        />
      )}
    </div>
  );
}

function fieldSummary(job: Job) {
  const entries = Object.entries(job.data.fields);
  if (!entries.length)
    return job.data.keys.length ? `${job.data.keys.length} field${job.data.keys.length === 1 ? "" : "s"}` : "—";
  return entries
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

const columns: ColumnDef<Job>[] = [
  {
    header: "Job",
    cell: ({ row: { original: j } }) => (
      <span className="font-mono text-xs" title={j.id}>
        {shortId(j.id)}
      </span>
    ),
  },
  {
    header: "State",
    cell: ({ row: { original: j } }) => <Badge variant={jobStateVariant(j.state)}>{JOB_STATE_LABELS[j.state]}</Badge>,
  },
  {
    header: "Created",
    cell: ({ row: { original: j } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(j.createdAt)}</span>
    ),
  },
  {
    header: "Started",
    cell: ({ row: { original: j } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(j.startedAt)}</span>
    ),
  },
  {
    header: "Finished",
    cell: ({ row: { original: j } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(j.completedAt)}</span>
    ),
  },
  {
    header: "Retries",
    cell: ({ row: { original: j } }) => (
      <span className="text-xs tabular-nums">
        {j.retryCount} of {j.retryLimit}
      </span>
    ),
  },
  {
    header: "Details",
    cell: ({ row: { original: j } }) => (
      <span className="block max-w-xs truncate font-mono text-xs text-muted-foreground">
        {j.error ? j.error.split("\n")[0] : fieldSummary(j)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row: { original: j } }) => <JobActions job={j} />,
  },
];

function JobDetail({ job }: { job: Job }) {
  const fields = Object.entries(job.data.fields);
  return (
    <div className="grid gap-4 p-2 text-xs sm:grid-cols-2">
      <div className="space-y-2">
        <h3 className="font-medium">Error</h3>
        {job.error ? (
          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 whitespace-pre-wrap">{job.error}</pre>
        ) : (
          <p className="text-muted-foreground">No error recorded.</p>
        )}
        {job.sourceQueue && (
          <p>
            Came from <span className="font-mono">{job.sourceQueue}</span>
            {job.sourceJobId && (
              <>
                {" "}
                (job <span className="font-mono">{shortId(job.sourceJobId)}</span>)
              </>
            )}
            . It ran out of retries there.
          </p>
        )}
        <p className="text-muted-foreground">
          Runs from {formatDateTime(job.startAfter)}
          {job.singletonKey ? ` · key ${job.singletonKey}` : ""}
        </p>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">Payload</h3>
        {fields.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {fields.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono break-all">{String(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-muted-foreground">No IDs in the payload.</p>
        )}
        {job.data.keys.length > 0 && (
          <p className="text-muted-foreground">
            Fields: {job.data.keys.join(", ")}. Personal details and message contents aren&apos;t shown.
          </p>
        )}
      </div>
    </div>
  );
}

function JobList({ queue, filters }: { queue: Queue; filters: FilterDef[] }) {
  const table = useTableFilters(filters);
  const pages = useCursorPages(table.key);
  const state = table.values.state;
  const jobs = useGetV1AdminOpsQueuesQueueJobsQuery(
    {
      queue: queue.name,
      limit: 25,
      ...(isJobState(state) ? { state } : {}),
      ...(pages.cursor ? { cursor: pages.cursor } : {}),
    },
    POLL,
  );
  return (
    <section className="mt-8 space-y-3" aria-labelledby="jobs-heading">
      <div>
        <h2 id="jobs-heading" className="text-sm font-medium">
          {queueLabel(queue.name)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {queue.kind === "dead-letter"
            ? "Copies of jobs that failed on every retry. They're kept for reference; retry the original job from its own queue."
            : "Newest first. Retry a failed job once its cause is fixed; cancel a waiting job to stop it from running."}
        </p>
      </div>
      <DataTable
        tableKey="ops-jobs"
        columns={columns}
        data={jobs.data?.items}
        loading={jobs.isLoading}
        error={jobs.error}
        getRowId={(j) => j.id}
        filters={filters}
        renderExpanded={(j) => <JobDetail job={j} />}
        emptyMessage="No jobs match these filters. Finished jobs are removed after their retention period."
        pagination={{
          page: pages.page,
          hasNext: !!jobs.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(jobs.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </section>
  );
}

// Job monitor (plan B-Phase 3): pg-boss queues with job counts per state, and each queue's jobs.
export function JobsScreen() {
  const summary = useGetV1AdminOpsQueuesQuery({}, POLL);
  const queues = summary.data?.queues;
  const filters = useMemo<FilterDef[]>(
    () => [
      {
        key: "queue",
        label: "Queue",
        type: "select",
        options: (queues ?? []).map((q) => ({ value: q.name, label: queueLabel(q.name) })),
      },
      STATE_FILTER,
    ],
    [queues],
  );
  const table = useTableFilters(filters);
  const selected = queues?.find((q) => q.name === table.values.queue);
  const totals = queues?.reduce(
    (t, q) => ({ failed: t.failed + q.failedLast24h, waiting: t.waiting + q.counts.created + q.counts.retry }),
    {
      failed: 0,
      waiting: 0,
    },
  );

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Background work: emails, webhooks, imports, scheduled tasks. Watch for failures and backlogs, and retry what failed."
        actions={
          <Button size="sm" variant="outline" onClick={() => summary.refetch()} disabled={summary.isFetching}>
            <RefreshCwIcon data-icon="inline-start" className={summary.isFetching ? "animate-spin" : undefined} />{" "}
            Refresh
          </Button>
        }
      />
      {summary.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(summary.error)}</AlertDescription>
        </Alert>
      ) : !queues ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
            {totals && totals.failed > 0
              ? `${totals.failed} job${totals.failed === 1 ? "" : "s"} failed in the last 24 hours. `
              : "No failures in the last 24 hours. "}
            {totals ? `${totals.waiting.toLocaleString("en-GB")} waiting. ` : ""}
            Checked {formatDateTime(summary.data?.checkedAt)}; refreshes every 15 seconds.
          </p>
          <QueueTable
            queues={queues}
            selected={selected?.name}
            onSelect={(name) => table.setValues({ ...table.values, queue: name })}
          />
          {selected ? (
            <JobList queue={selected} filters={filters} />
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Choose a queue to see its jobs.</p>
          )}
        </>
      )}
    </>
  );
}
