"use client";

import {
  ActivityIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminApi,
  useGetV1AdminOpsIntegrationsQuery,
  type GetV1AdminOpsIntegrationsApiResponse,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError } from "../../lib/notify";
import {
  HEALTH_LABELS,
  healthVariant,
  isStale,
  overallMessage,
  overallStatus,
  sortChecks,
  type HealthStatus,
} from "./health-logic";

type Check = GetV1AdminOpsIntegrationsApiResponse["checks"][number];

const POLL_MS = 30_000;

const ICONS: Record<HealthStatus, typeof CircleCheckIcon> = {
  up: CircleCheckIcon,
  degraded: CircleAlertIcon,
  down: CircleXIcon,
  disabled: CircleMinusIcon,
};

const ICON_TONE: Record<HealthStatus, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  degraded: "text-amber-600 dark:text-amber-400",
  down: "text-destructive",
  disabled: "text-muted-foreground",
};

function StatusCard({ check }: { check: Check }) {
  const Icon = ICONS[check.status];
  const headingId = `health-${check.key}`;
  return (
    <Card size="sm" aria-labelledby={headingId} role="region">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle id={headingId} className="flex items-center gap-2">
            <Icon className={`size-4 shrink-0 ${ICON_TONE[check.status]}`} aria-hidden />
            {check.name}
          </CardTitle>
          <Badge variant={healthVariant(check.status)}>{HEALTH_LABELS[check.status]}</Badge>
        </div>
        <CardDescription>{check.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {check.action && (check.status === "down" || check.status === "degraded" || check.status === "disabled") && (
          <p className="rounded-md bg-muted p-2">
            <span className="font-medium">What to do: </span>
            {check.action}
          </p>
        )}
        {check.details.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {check.details.map((d, i) => (
              <div key={`${d.label}-${i}`} className="contents">
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="break-words">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-muted-foreground">
          {check.adapter ? `Adapter: ${check.adapter} · ` : ""}Checked {formatDateTime(check.checkedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

// Integration health (plan B-Phase 3): the database, queue and worker, log store and the
// configured adapters. Polls the configuration every 30 seconds; "Run live checks" also asks the
// adapters that have a health check of their own (e.g. the mail server).
export function IntegrationsScreen() {
  const polled = useGetV1AdminOpsIntegrationsQuery({}, { pollingInterval: POLL_MS, skipPollingIfUnfocused: true });
  const [runLive, live] = adminApi.endpoints.getV1AdminOpsIntegrations.useLazyQuery();
  // whichever answer is newer: a live check, or the latest poll
  const data =
    live.data && polled.data && new Date(live.data.checkedAt) > new Date(polled.data.checkedAt)
      ? live.data
      : (polled.data ?? live.data);
  const checks = data ? sortChecks(data.checks) : [];
  const status = overallStatus(checks.map((c) => c.status));
  const stale = !!polled.data && isStale(polled.data.checkedAt, POLL_MS) && !polled.isFetching;

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Whether the services the store depends on are working, and what to do when one isn't."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => polled.refetch()} disabled={polled.isFetching}>
              <RefreshCwIcon data-icon="inline-start" className={polled.isFetching ? "animate-spin" : undefined} />{" "}
              Refresh
            </Button>
            <Button
              size="sm"
              disabled={live.isFetching}
              onClick={() =>
                runLive({ check: "true" })
                  .unwrap()
                  .catch((e: unknown) => notifyError(e))
              }
            >
              <ActivityIcon data-icon="inline-start" /> {live.isFetching ? "Checking…" : "Run live checks"}
            </Button>
          </>
        }
      />
      {polled.error && !data ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(polled.error)}</AlertDescription>
        </Alert>
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Alert variant={status === "down" ? "destructive" : "default"} className="mb-4" aria-live="polite">
            {(() => {
              const Icon = ICONS[status];
              return <Icon aria-hidden />;
            })()}
            <AlertTitle>{HEALTH_LABELS[status]}</AlertTitle>
            <AlertDescription>
              {overallMessage(checks)} Last checked {formatDateTime(data.checkedAt)}
              {data.live ? " (with live checks)" : "; refreshes every 30 seconds"}.
              {stale && " These results may be out of date: the latest refresh didn't arrive."}
              {polled.error ? ` Refresh failed: ${errorMessage(polled.error)}` : ""}
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {checks.map((c) => (
              <StatusCard key={c.key} check={c} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
