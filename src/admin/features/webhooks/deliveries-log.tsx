"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetV1AdminWebhooksIdDeliveriesQuery,
  usePostV1AdminWebhooksDeliveriesIdReplayMutation,
} from "../../store/api.generated";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime, shortId } from "../../lib/format";
import { notifyError } from "../../lib/notify";
import {
  DELIVERY_PAGE,
  deliveryOutcome,
  deliveryStatusLabel,
  eventTypesIn,
  filterDeliveries,
  formatDuration,
  MAX_DELIVERIES,
  previewJson,
  type Delivery,
  type DeliveryFilter,
} from "./webhook-logic";

const OUTCOMES = [
  { value: "all", label: "All outcomes" },
  { value: "ok", label: "Delivered" },
  { value: "failed", label: "Failed" },
];

// One endpoint's delivery attempts, newest first. The API returns the latest entries (up to 200)
// without server-side filters, so filtering happens here over what's loaded.
export function DeliveriesLog({ endpointId }: { endpointId: string }) {
  const [limit, setLimit] = useState(DELIVERY_PAGE);
  const [filter, setFilter] = useState<DeliveryFilter>({ outcome: "all", eventType: "" });
  const log = useGetV1AdminWebhooksIdDeliveriesQuery({ id: endpointId, limit });
  const items = log.data?.items ?? [];
  const shown = filterDeliveries(items, filter);
  const types = eventTypesIn(items);
  const canLoadMore = items.length >= limit && limit < MAX_DELIVERIES;

  if (log.data && !log.data.available) {
    return (
      <Alert>
        <AlertDescription>
          The delivery log isn&apos;t available right now (its store, MongoDB, isn&apos;t connected). Deliveries still
          go out.
        </AlertDescription>
      </Alert>
    );
  }

  const columns: ColumnDef<Delivery>[] = [
    {
      header: "When",
      cell: ({ row: { original: d } }) => (
        <span className="text-xs whitespace-nowrap">{formatDateTime(d.occurredAt)}</span>
      ),
    },
    {
      header: "Event",
      cell: ({ row: { original: d } }) => (
        <div className="space-y-0.5">
          <p className="font-mono text-xs">{d.eventType}</p>
          <p className="font-mono text-[0.7rem] text-muted-foreground" title={d.eventId}>
            {shortId(d.eventId)}
          </p>
        </div>
      ),
    },
    {
      header: "Result",
      cell: ({ row: { original: d } }) => {
        const outcome = deliveryOutcome(d);
        return (
          <Badge variant={outcome === "ok" ? "secondary" : "destructive"} className="max-w-64 truncate">
            {deliveryStatusLabel(d)}
          </Badge>
        );
      },
    },
    {
      header: "Attempt",
      cell: ({ row: { original: d } }) => <span className="text-xs tabular-nums">{d.attempt ?? "—"}</span>,
    },
    {
      header: "Duration",
      cell: ({ row: { original: d } }) => <span className="text-xs tabular-nums">{formatDuration(d.durationMs)}</span>,
    },
    {
      id: "replay",
      header: () => <span className="sr-only">Replay</span>,
      cell: ({ row }) => <Replay delivery={row.original} />,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filter deliveries">
        <Select
          items={OUTCOMES}
          value={filter.outcome}
          onValueChange={(v) => v && setFilter({ ...filter, outcome: v as DeliveryFilter["outcome"] })}
        >
          <SelectTrigger aria-label="Outcome" className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[{ value: "__all", label: "All events" }, ...types.map((t) => ({ value: t, label: t }))]}
          value={filter.eventType || "__all"}
          onValueChange={(v) => v && setFilter({ ...filter, eventType: v === "__all" ? "" : String(v) })}
        >
          <SelectTrigger aria-label="Event type" className="h-8 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All events</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => log.refetch()} disabled={log.isFetching}>
          <RefreshCwIcon /> Refresh
        </Button>
        <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {log.data ? `${shown.length} of the latest ${items.length}` : ""}
        </span>
      </div>
      <DataTable
        tableKey={`webhook-deliveries-${endpointId}`}
        columns={columns}
        data={log.data ? shown : undefined}
        loading={log.isFetching}
        error={log.error}
        getRowId={(d) => d.id}
        renderExpanded={(d) => <DeliveryPreview delivery={d} />}
        emptyMessage={items.length ? "No deliveries match these filters." : "Nothing delivered yet."}
      />
      {canLoadMore && (
        <Button
          size="sm"
          variant="outline"
          disabled={log.isFetching}
          onClick={() => setLimit(Math.min(limit + DELIVERY_PAGE, MAX_DELIVERIES))}
        >
          Show older deliveries
        </Button>
      )}
      {items.length >= MAX_DELIVERIES && (
        <p className="text-xs text-muted-foreground">
          Showing the latest {MAX_DELIVERIES} deliveries, the most the log returns.
        </p>
      )}
    </div>
  );
}

function DeliveryPreview({ delivery: d }: { delivery: Delivery }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs font-medium">Payload sent</p>
        <pre className="max-h-72 overflow-auto rounded bg-background p-3 font-mono text-xs">
          {previewJson(d.payload)}
        </pre>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium">Response</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Status</dt>
          <dd>{typeof d.status === "number" ? d.status : "No response"}</dd>
          <dt className="text-muted-foreground">Error</dt>
          <dd className="break-all">{d.error ?? "—"}</dd>
          <dt className="text-muted-foreground">URL</dt>
          <dd className="font-mono break-all">{d.url ?? "—"}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">The log keeps the status and error, not the response body.</p>
      </div>
    </div>
  );
}

function Replay({ delivery }: { delivery: Delivery }) {
  const [replay, replaying] = usePostV1AdminWebhooksDeliveriesIdReplayMutation();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={replaying.isLoading}
      aria-label={`Replay ${delivery.eventType} delivery from ${formatDateTime(delivery.occurredAt)}`}
      onClick={() =>
        replay({ id: delivery.id })
          .unwrap()
          .then(() => toast.success("Delivery queued again. The new attempt shows in the log once sent."), notifyError)
      }
    >
      <RotateCcwIcon /> Replay
    </Button>
  );
}
