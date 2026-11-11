"use client";

import { useState } from "react";
import { FileDownIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyError } from "../../lib/notify";
import { errorMessage } from "../../store/api-errors";
import { usePostV1AdminExportsMutation } from "../../store/api.generated";
import { JobProgress, JobReport, useJob } from "./job-report";
import { isFinished } from "./jobs";

const FORMATS = [
  { value: "csv", label: "CSV (spreadsheets; same columns as the import)" },
  { value: "json", label: "JSON (one object per variant)" },
] as const;

// Product export (spec §6.2): every product that isn't archived, one row per variant, in the
// import's columns so a file can be edited and imported back. The API has no filters; the
// format is the only choice.
export function ExportPanel() {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [jobId, setJobId] = useState<string | null>(null);
  const [start, state] = usePostV1AdminExportsMutation();
  const job = useJob(jobId);
  const running = job.data ? !isFinished(job.data.status) : !!jobId;

  return (
    <section aria-labelledby="export-heading" className="max-w-3xl space-y-4">
      <div className="space-y-1">
        <h2 id="export-heading" className="text-base font-medium">
          Export products
        </h2>
        <p className="text-sm text-muted-foreground">
          Every product that isn&apos;t archived, one row per variant, with prices from the default market&apos;s price
          list and stock summed across locations. The file uses the import columns, so it can be edited and imported
          back.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start({ body: { format } })
            .unwrap()
            .then((created) => setJobId(created.id), notifyError);
        }}
      >
        <Field className="w-auto">
          <FieldLabel htmlFor="export-format">Format</FieldLabel>
          <Select items={[...FORMATS]} value={format} onValueChange={(v) => setFormat(v === "json" ? "json" : "csv")}>
            <SelectTrigger id="export-format" className="w-80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Prices are in major units (1850.00).</FieldDescription>
        </Field>
        <Button type="submit" disabled={state.isLoading || running}>
          <FileDownIcon /> {running ? "Exporting…" : "Start export"}
        </Button>
      </form>

      {job.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(job.error)}</AlertDescription>
        </Alert>
      )}
      {jobId && !job.data && !job.error && <Skeleton className="h-28 w-full" />}
      {job.data && (
        <>
          <JobProgress job={job.data} label="Export" />
          <JobReport job={job.data} />
        </>
      )}
    </section>
  );
}
