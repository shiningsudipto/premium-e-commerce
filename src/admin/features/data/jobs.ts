import type { GetV1AdminDataJobsIdApiResponse } from "../../store/api.generated";
import { tableToCsv } from "./csv";
import { fieldLabel, rowLabel } from "./mapping";

export type DataJob = GetV1AdminDataJobsIdApiResponse;
export type JobStatus = DataJob["status"];
export type RowError = NonNullable<DataJob["report"]["errorList"]>[number];

// Jobs run on the worker; the screen polls a job until it's done.
export const POLL_MS = 1500;
export const isFinished = (status: JobStatus | undefined) => status === "COMPLETED" || status === "FAILED";
export const pollingInterval = (job: Pick<DataJob, "status"> | undefined) => (isFinished(job?.status) ? 0 : POLL_MS);

// the API keeps the first 500 row errors in a job's report
export const ERROR_LIST_CAP = 500;

export const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Queued",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function jobTitle(job: Pick<DataJob, "kind" | "dryRun" | "format">): string {
  const format = job.format.toUpperCase();
  if (job.kind === "EXPORT") return `Product export (${format})`;
  return job.dryRun ? `Product import dry run (${format})` : `Product import (${format})`;
}

// One line saying how a finished job went.
export function jobOutcome(job: DataJob): string {
  const r = job.report;
  if (!isFinished(job.status)) return job.status === "PENDING" ? "Waiting for the worker" : "Working…";
  if (r.error) return r.error;
  if (job.kind === "EXPORT")
    return job.status === "COMPLETED" ? `File ready (${formatBytes(r.bytes ?? 0)})` : "Export failed";
  const errors = r.errors ?? 0;
  const rows = `${r.rows ?? 0} row${r.rows === 1 ? "" : "s"}`;
  if (job.dryRun) {
    return errors ? `${errors} problem${errors === 1 ? "" : "s"} found in ${rows}` : `${rows} ready to import`;
  }
  if (!r.applied) return `Not imported: ${errors} problem${errors === 1 ? "" : "s"} found`;
  const failed = r.failed?.length ?? 0;
  return `${r.imported ?? 0} product${r.imported === 1 ? "" : "s"} imported${failed ? `, ${failed} failed` : ""}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// The validation report as a spreadsheet staff can fix their file from.
export function errorsCsv(errors: RowError[], format: string): string {
  return tableToCsv(
    [
      { header: format === "json" ? "item" : "row", value: (e: RowError) => (format === "json" ? e.row - 1 : e.row) },
      { header: "location", value: (e) => rowLabel(e.row, format) },
      { header: "field", value: (e) => (e.field ? fieldLabel(e.field) : "") },
      { header: "column", value: (e) => e.field ?? "" },
      { header: "message", value: (e) => e.message },
    ],
    errors,
  );
}

export function failedProductsCsv(failed: NonNullable<DataJob["report"]["failed"]>): string {
  return tableToCsv(
    [
      { header: "handle", value: (f: (typeof failed)[number]) => f.handle },
      { header: "error", value: (f) => f.error ?? "" },
    ],
    failed,
  );
}

export const exportFileName = (job: Pick<DataJob, "createdAt" | "format">) =>
  `products-${job.createdAt.slice(0, 10)}.${job.format}`;

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
