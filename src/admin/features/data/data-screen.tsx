"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan, useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { errorMessage } from "../../store/api-errors";
import { ExportPanel } from "./export-panel";
import { ImportWizard } from "./import-wizard";
import { JobHistory } from "./job-history";
import { JobProgress, JobReport, useJob } from "./job-report";
import { jobTitle } from "./jobs";

const TABS = ["import", "export", "history"] as const;
type Tab = (typeof TABS)[number];

// Import & export (spec §6.2). The open tab (?tab=) and an opened job report (?job=) live in
// the URL, so a report can be linked to. Imports need products.write; exports and the job
// history need products.read.
export function DataScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const me = useMe();
  const canImport = useCan("products.write");
  const canRead = useCan("products.read");
  const available = TABS.filter((t) => t !== "import" || canImport);
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && available.includes(requested) ? requested : (available[0] ?? "export");
  const jobId = params.get("job");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Import & export"
        description="Bring products in from a CSV or JSON file, with a dry run that checks every row first, and export the catalogue in the same format."
      />
      {!me.data ? (
        <Skeleton className="h-64 w-full" />
      ) : !canRead ? (
        <Alert>
          <AlertDescription>Your role can&apos;t see product imports and exports.</AlertDescription>
        </Alert>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParam("tab", String(v))}>
          <TabsList>
            {canImport && <TabsTrigger value="import">Import</TabsTrigger>}
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="history">Job history</TabsTrigger>
          </TabsList>
          {/* the wizard keeps its place while another tab is open */}
          {canImport && (
            <TabsContent value="import" keepMounted className="pt-4">
              <ImportWizard />
            </TabsContent>
          )}
          <TabsContent value="export" keepMounted className="pt-4">
            <ExportPanel />
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <JobHistory />
          </TabsContent>
        </Tabs>
      )}
      <JobDialog id={jobId} onClose={() => setParam("job", null)} />
    </>
  );
}

function JobDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const job = useJob(id);
  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{job.data ? jobTitle(job.data) : "Job report"}</DialogTitle>
          <DialogDescription>
            {job.data
              ? `Started ${formatDateTime(job.data.createdAt)}${job.data.finishedAt ? ` · finished ${formatDateTime(job.data.finishedAt)}` : ""}`
              : "Loading…"}
          </DialogDescription>
        </DialogHeader>
        {job.error && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(job.error)}</AlertDescription>
          </Alert>
        )}
        {!job.data && !job.error && <Skeleton className="h-40 w-full" />}
        {job.data && (
          <div className="space-y-4">
            <JobProgress job={job.data} label={jobTitle(job.data)} />
            <JobReport job={job.data} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
