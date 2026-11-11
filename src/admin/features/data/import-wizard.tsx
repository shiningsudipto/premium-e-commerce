"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileUpIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchCheckIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { notifyError } from "../../lib/notify";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminImportsColumnsQuery,
  usePostV1AdminImportsMutation,
  type PostV1AdminImportsApiArg,
} from "../../store/api.generated";
import { detectFormat, summariseFile, toCsv, type FileSummary, type ImportFormat } from "./csv";
import { saveTextFile } from "./download";
import { JobProgress, JobReport, useJob } from "./job-report";
import { MAX_FILE_BYTES, formatBytes, isFinished } from "./jobs";
import {
  REQUIRED_FIELDS,
  autoMap,
  describeIssue,
  fieldLabel,
  isFixedColumn,
  mappingForApi,
  mappingIssues,
  type Mapping,
} from "./mapping";

type ImportBody = PostV1AdminImportsApiArg["body"];
type Upload = { fileName: string; size: number; content: string; format: ImportFormat };
type Parsed = Extract<FileSummary, { ok: true }>;

const STEPS = ["Upload file", "Map columns", "Check (dry run)", "Import"] as const;
const SKIP = "__skip";

// Example row for the downloadable template (prices in the store currency's major units).
const TEMPLATE_EXAMPLE: Record<string, string> = {
  handle: "linen-shirt",
  title: "Linen shirt",
  description: "Breathable linen in a relaxed fit.",
  vendor: "House label",
  tags: "summer;linen",
  status: "DRAFT",
  option1_name: "Size",
  option1_value: "M",
  sku: "LINEN-SHIRT-M",
  price: "1850.00",
  stock: "10",
};

// Product import (spec §6.2): upload → map columns → dry run with a validation report →
// import with job status. The file is read in the browser and sent as text in the body, as
// the API expects; nothing is written until the last step.
export function ImportWizard() {
  const columns = useGetV1AdminImportsColumnsQuery({});
  const fields = columns.data?.columns ?? [];
  const [step, setStep] = useState(0);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [dryRunId, setDryRunId] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setUpload(null);
    setParsed(null);
    setMapping({});
    setDryRunId(null);
    setImportId(null);
  };

  if (columns.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(columns.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!columns.data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Stepper step={step} />
      {step === 0 && (
        <UploadStep
          fields={fields}
          upload={upload}
          parsed={parsed}
          onLoaded={(u, p) => {
            setUpload(u);
            setParsed(p);
            setMapping(autoMap(p.headers, fields));
            setDryRunId(null);
          }}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && parsed && (
        <MappingStep
          fields={fields}
          parsed={parsed}
          mapping={mapping}
          onChange={(m) => {
            setMapping(m);
            // a new mapping needs a new check
            setDryRunId(null);
          }}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && upload && (
        <DryRunStep
          upload={upload}
          mapping={mapping}
          jobId={dryRunId}
          onStarted={setDryRunId}
          onBack={() => setStep(1)}
          onImported={(id) => {
            setImportId(id);
            setStep(3);
          }}
        />
      )}
      {step === 3 && importId && <ImportStep jobId={importId} onRestart={reset} />}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <nav aria-label="Import steps">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              i === step && "border-primary bg-primary/10 font-medium text-foreground",
              i < step && "text-foreground",
              i > step && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[11px] tabular-nums",
                i < step && "border-primary bg-primary text-primary-foreground",
              )}
              aria-hidden
            >
              {i < step ? <CheckIcon className="size-3" /> : i + 1}
            </span>
            {label}
            {i < step && <span className="sr-only">(done)</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function UploadStep({
  fields,
  upload,
  parsed,
  onLoaded,
  onNext,
}: {
  fields: string[];
  upload: Upload | null;
  parsed: Parsed | null;
  onLoaded: (upload: Upload, parsed: Parsed) => void;
  onNext: () => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function read(file: File | undefined) {
    if (!file) return;
    setProblem(null);
    if (file.size > MAX_FILE_BYTES) {
      setProblem(`${file.name} is ${formatBytes(file.size)}; files can be at most 8 MB.`);
      return;
    }
    setReading(true);
    try {
      const content = await file.text();
      const format = detectFormat(file.name, content);
      const summary = summariseFile(format, content);
      if (!summary.ok) setProblem(`${file.name}: ${summary.message}`);
      else onLoaded({ fileName: file.name, size: file.size, content, format }, summary);
    } catch {
      setProblem(`${file.name} couldn't be read.`);
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section aria-labelledby="upload-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 id="upload-heading" className="text-base font-medium">
            Upload a product file
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            CSV or JSON, one row per variant (rows with the same handle form one product). Prices are in the
            store&apos;s currency, like 1850.00. At most 8 MB.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            saveTextFile("product-import-template.csv", toCsv([fields, fields.map((f) => TEMPLATE_EXAMPLE[f] ?? "")]))
          }
        >
          <DownloadIcon /> CSV template
        </Button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void read(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <FileUpIcon className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Drop a file here, or</p>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="sr-only"
          onChange={(e) => void read(e.target.files?.[0])}
        />
        <Button variant="secondary" disabled={reading} onClick={() => input.current?.click()}>
          {reading ? "Reading…" : "Choose a file"}
        </Button>
        <label htmlFor={inputId} className="sr-only">
          Product file (CSV or JSON)
        </label>
      </div>

      {problem && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden />
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}

      {upload && parsed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{upload.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {upload.format.toUpperCase()} · {formatBytes(upload.size)} · {parsed.rowCount} row
              {parsed.rowCount === 1 ? "" : "s"} · {parsed.headers.length} column
              {parsed.headers.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button onClick={onNext}>
            Map columns <ArrowRightIcon />
          </Button>
        </div>
      )}
    </section>
  );
}

function MappingStep({
  fields,
  parsed,
  mapping,
  onChange,
  onBack,
  onNext,
}: {
  fields: string[];
  parsed: Parsed;
  mapping: Mapping;
  onChange: (m: Mapping) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const issues = mappingIssues(mapping, fields);
  const used = new Set(
    Object.entries(mapping).map(([column, f]) => f || (isFixedColumn(column, fields) ? column : "")),
  );
  const issuesId = useId();

  return (
    <section aria-labelledby="mapping-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="mapping-heading" className="text-base font-medium">
          Match your columns to product fields
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Columns were matched by name where possible. Required fields:{" "}
          {REQUIRED_FIELDS.map((f, i) => (
            <span key={f}>
              {i > 0 && ", "}
              <span className="inline-flex items-center gap-1">
                {fieldLabel(f)}
                {used.has(f) ? (
                  <CheckIcon className="size-3.5 text-primary" aria-label="matched" />
                ) : (
                  <CircleAlertIcon className="size-3.5 text-destructive" aria-label="not matched" />
                )}
              </span>
            </span>
          ))}
          .
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <caption className="sr-only">Your file&apos;s columns and the product field each one fills</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Your column</TableHead>
              <TableHead scope="col">Sample values</TableHead>
              <TableHead scope="col">Product field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsed.headers.map((header) => {
              const fixed = isFixedColumn(header, fields);
              const value = mapping[header] || (fixed ? header : SKIP);
              const samples = parsed.sample.map((r) => r[header]).filter((v) => v && v.trim() !== "");
              const items = [
                ...(fixed ? [] : [{ value: SKIP, label: "Don't import" }]),
                ...fields.map((f) => ({ value: f, label: `${fieldLabel(f)}${isRequired(f) ? " (required)" : ""}` })),
              ];
              return (
                <TableRow key={header}>
                  <TableCell className="font-mono text-xs">{header}</TableCell>
                  <TableCell className="max-w-xs text-xs text-muted-foreground">
                    <span className="line-clamp-2 whitespace-normal">
                      {samples.length ? samples.join(" · ") : "(empty)"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      items={items}
                      value={value}
                      onValueChange={(v) => onChange({ ...mapping, [header]: v === SKIP || !v ? "" : String(v) })}
                    >
                      <SelectTrigger
                        aria-label={`Product field for column ${header}`}
                        aria-describedby={issues.length ? issuesId : undefined}
                        className="w-56"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fixed && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Named like a field, so it&apos;s always read.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {issues.length > 0 && (
        <Alert variant="destructive" id={issuesId}>
          <CircleAlertIcon aria-hidden />
          <AlertTitle>Fix the mapping to continue</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {issues.map((issue) => (
                <li key={`${issue.kind}-${issue.field}`}>{describeIssue(issue)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon /> Back
        </Button>
        <Button disabled={issues.length > 0} onClick={onNext}>
          Continue to check <ArrowRightIcon />
        </Button>
      </div>
    </section>
  );
}

const isRequired = (field: string) => (REQUIRED_FIELDS as readonly string[]).includes(field);

function DryRunStep({
  upload,
  mapping,
  jobId,
  onStarted,
  onBack,
  onImported,
}: {
  upload: Upload;
  mapping: Mapping;
  jobId: string | null;
  onStarted: (id: string) => void;
  onBack: () => void;
  onImported: (id: string) => void;
}) {
  const [start, state] = usePostV1AdminImportsMutation();
  const job = useJob(jobId);
  const finished = job.data && isFinished(job.data.status);
  const ready = finished && job.data!.status === "COMPLETED" && !job.data!.report.error && !job.data!.report.errors;
  const body = (dryRun: boolean): ImportBody => ({
    format: upload.format,
    content: upload.content,
    // every mapped value is one of the columns the API listed
    mapping: mappingForApi(mapping) as ImportBody["mapping"],
    dryRun,
  });

  return (
    <section aria-labelledby="dryrun-heading" className="space-y-4">
      <div className="space-y-1">
        <h2 id="dryrun-heading" className="text-base font-medium">
          Check the file
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A dry run validates every row against the catalogue (handles, SKUs, prices, categories) without saving
          anything, and reports what an import would create or update.
        </p>
      </div>

      {!jobId && (
        <Button
          disabled={state.isLoading}
          onClick={() =>
            start({ body: body(true) })
              .unwrap()
              .then((created) => onStarted(created.id), notifyError)
          }
        >
          <SearchCheckIcon /> {state.isLoading ? "Uploading…" : `Check ${upload.fileName}`}
        </Button>
      )}

      {job.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(job.error)}</AlertDescription>
        </Alert>
      )}
      {jobId && !job.data && !job.error && <Skeleton className="h-28 w-full" />}
      {job.data && (
        <>
          <JobProgress job={job.data} label="Dry run" />
          <JobReport job={job.data} />
        </>
      )}

      {finished && !ready && !job.data!.report.error && (
        <p className="text-sm text-muted-foreground">
          Fix the problems in your file, then upload it again. The import is only available once a check finds no
          problems.
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon /> Back to mapping
        </Button>
        <div className="flex flex-wrap gap-2">
          {finished && (
            <Button
              variant="ghost"
              disabled={state.isLoading}
              onClick={() =>
                start({ body: body(true) })
                  .unwrap()
                  .then((created) => onStarted(created.id), notifyError)
              }
            >
              <RotateCcwIcon /> Check again
            </Button>
          )}
          {ready && (
            <ConfirmDialog
              trigger={
                <Button>
                  <PlayIcon /> Import
                </Button>
              }
              title="Import these products?"
              description={`This creates ${job.data!.report.productsToCreate ?? 0} and updates ${job.data!.report.productsToUpdate ?? 0} products (${job.data!.report.variants ?? 0} variants), including prices and stock. Updated products are overwritten with the file's values.`}
              confirmLabel="Import"
              onConfirm={() =>
                start({ body: body(false) })
                  .unwrap()
                  .then((created) => onImported(created.id), notifyError)
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ImportStep({ jobId, onRestart }: { jobId: string; onRestart: () => void }) {
  const job = useJob(jobId);
  const finished = job.data && isFinished(job.data.status);
  return (
    <section aria-labelledby="import-heading" className="space-y-4">
      <h2 id="import-heading" className="text-base font-medium">
        Importing
      </h2>
      {job.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(job.error)}</AlertDescription>
        </Alert>
      )}
      {!job.data && !job.error && <Skeleton className="h-28 w-full" />}
      {job.data && (
        <>
          <JobProgress job={job.data} label="Import" />
          {finished && job.data.report.applied && (
            <p className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Done</Badge>
              {job.data.report.imported ?? 0} product{job.data.report.imported === 1 ? "" : "s"} saved.
            </p>
          )}
          <JobReport job={job.data} />
        </>
      )}
      {finished && (
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products" className={buttonVariants({ variant: "outline" })}>
            View products
          </Link>
          <Button onClick={onRestart}>
            <RotateCcwIcon /> Import another file
          </Button>
        </div>
      )}
    </section>
  );
}
