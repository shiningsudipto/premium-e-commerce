"use client";

import { useState } from "react";
import { CheckCircle2Icon, CircleAlertIcon, DownloadIcon, LoaderCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMe } from "../../components/can";
import { notifyError } from "../../lib/notify";
import { adminApi, useGetV1AdminDataJobsIdQuery } from "../../store/api.generated";
import { downloadFromApi, saveTextFile } from "./download";
import {
  ERROR_LIST_CAP,
  STATUS_LABELS,
  errorsCsv,
  exportFileName,
  failedProductsCsv,
  isFinished,
  jobOutcome,
  pollingInterval,
  type DataJob,
  type JobStatus,
} from "./jobs";
import { fieldLabel, rowLabel } from "./mapping";

// A job, polled until the worker has finished it. Polling stops by itself once the job is
// COMPLETED or FAILED (the interval drops to 0).
export function useJob(id: string | null) {
  const arg = { id: id ?? "" };
  const cached = adminApi.endpoints.getV1AdminDataJobsId.useQueryState(arg, { skip: !id });
  return useGetV1AdminDataJobsIdQuery(arg, {
    skip: !id,
    pollingInterval: pollingInterval(cached.data),
    skipPollingIfUnfocused: false,
  });
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const Icon = status === "COMPLETED" ? CheckCircle2Icon : status === "FAILED" ? CircleAlertIcon : LoaderCircleIcon;
  return (
    <Badge
      variant={status === "FAILED" ? "destructive" : status === "COMPLETED" ? "secondary" : "outline"}
      className="gap-1"
    >
      <Icon className={cn("size-3", !isFinished(status) && "animate-spin motion-reduce:animate-none")} aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const STAGES: { status: JobStatus[]; label: string }[] = [
  { status: ["PENDING"], label: "Queued" },
  { status: ["RUNNING"], label: "Running" },
  { status: ["COMPLETED", "FAILED"], label: "Finished" },
];

// The API reports a job's stage, not a percentage, so progress is shown as stages with an
// indeterminate bar while the job is queued or running.
export function JobProgress({ job, label }: { job: DataJob; label: string }) {
  const current = STAGES.findIndex((s) => s.status.includes(job.status));
  const done = isFinished(job.status);
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <StatusBadge status={job.status} />
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuetext={done ? STATUS_LABELS[job.status] : `${STATUS_LABELS[job.status]}…`}
        {...(done ? { "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": 100 } : {})}
        className="relative h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            job.status === "FAILED" ? "bg-destructive" : "bg-primary",
            done ? "w-full" : "w-1/3 animate-pulse motion-reduce:animate-none",
            job.status === "RUNNING" && "w-2/3",
          )}
        />
      </div>
      <ol className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {STAGES.map((s, i) => (
          <li
            key={s.label}
            aria-current={i === current ? "step" : undefined}
            className={cn(i <= current && "text-foreground", i === current && "font-medium")}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {jobOutcome(job)}
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "bad" }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold", tone === "bad" && "text-destructive")}>{value}</dd>
    </div>
  );
}

// What a finished job found or did: counts, row errors (downloadable), failed products and,
// for exports, the file.
export function JobReport({ job }: { job: DataJob }) {
  const r = job.report;
  const errors = r.errorList ?? [];
  const failed = r.failed ?? [];
  const day = job.createdAt.slice(0, 10);

  if (!isFinished(job.status)) return null;
  if (r.error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>The job stopped with an error</AlertTitle>
        <AlertDescription>{r.error}</AlertDescription>
      </Alert>
    );
  }
  if (job.kind === "EXPORT") return job.status === "COMPLETED" ? <ExportDownload job={job} /> : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Rows" value={r.rows ?? 0} />
        <Stat label="Products to create" value={r.productsToCreate ?? 0} />
        <Stat label="Products to update" value={r.productsToUpdate ?? 0} />
        <Stat label="Variants" value={r.variants ?? 0} />
        <Stat label="Problems" value={r.errors ?? 0} tone={r.errors ? "bad" : undefined} />
        {r.applied && <Stat label="Imported" value={r.imported ?? 0} />}
        {r.applied && failed.length > 0 && <Stat label="Failed" value={failed.length} tone="bad" />}
      </dl>

      {!job.dryRun && !r.applied && (r.errors ?? 0) > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Nothing was imported</AlertTitle>
          <AlertDescription>
            An import only runs when every row is valid. Fix the rows below and import the file again.
          </AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <section aria-labelledby={`errors-${job.id}`} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`errors-${job.id}`} className="text-sm font-medium">
              Row problems
              {(r.errors ?? 0) > errors.length && (
                <span className="ml-1 font-normal text-muted-foreground">
                  (first {Math.min(errors.length, ERROR_LIST_CAP)} of {r.errors})
                </span>
              )}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveTextFile(`import-problems-${day}.csv`, errorsCsv(errors, job.format))}
            >
              <DownloadIcon /> Download as CSV
            </Button>
          </div>
          <ErrorTable errors={errors} format={job.format} />
        </section>
      )}

      {failed.length > 0 && (
        <section aria-labelledby={`failed-${job.id}`} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`failed-${job.id}`} className="text-sm font-medium">
              Products that couldn&apos;t be saved
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveTextFile(`import-failed-${day}.csv`, failedProductsCsv(failed))}
            >
              <DownloadIcon /> Download as CSV
            </Button>
          </div>
          <div className="max-h-80 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Handle</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failed.map((f) => (
                  <TableRow key={f.handle}>
                    <TableCell className="font-mono text-xs">{f.handle}</TableCell>
                    <TableCell className="text-sm whitespace-normal">{f.error ?? "Unknown error"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}

const PAGE = 100;

function ErrorTable({ errors, format }: { errors: NonNullable<DataJob["report"]["errorList"]>; format: string }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <div className="space-y-2">
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table>
          <caption className="sr-only">Problems found, by row</caption>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">{format === "json" ? "Item" : "Row"}</TableHead>
              <TableHead scope="col">Field</TableHead>
              <TableHead scope="col">Problem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {errors.slice(0, shown).map((e, i) => (
              <TableRow key={`${e.row}-${e.field ?? ""}-${i}`}>
                <TableCell className="text-xs whitespace-nowrap tabular-nums">{rowLabel(e.row, format)}</TableCell>
                <TableCell className="text-xs">
                  {e.field ? fieldLabel(e.field) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm whitespace-normal">{e.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {errors.length > shown && (
        <Button size="sm" variant="ghost" onClick={() => setShown((s) => s + PAGE)}>
          Show {Math.min(PAGE, errors.length - shown)} more
        </Button>
      )}
    </div>
  );
}

export function ExportDownload({ job, size = "default" }: { job: DataJob; size?: "default" | "sm" }) {
  const me = useMe();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant={size === "sm" ? "outline" : "default"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFromApi(`/v1/admin/data-jobs/${job.id}/download`, exportFileName(job), () => me.refetch());
        } catch (err) {
          notifyError({ data: { code: "DOWNLOAD_FAILED", message: (err as Error).message } });
        } finally {
          setBusy(false);
        }
      }}
    >
      <DownloadIcon /> {size === "sm" ? "Download" : `Download ${exportFileName(job)}`}
    </Button>
  );
}
