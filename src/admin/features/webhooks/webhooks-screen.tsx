"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { KeyRoundIcon, PencilIcon, PlusIcon, PowerIcon, SendIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useDeleteV1AdminWebhooksIdMutation,
  useGetV1AdminWebhooksEventsQuery,
  useGetV1AdminWebhooksQuery,
  usePatchV1AdminWebhooksIdMutation,
  usePostV1AdminWebhooksIdPingMutation,
  usePostV1AdminWebhooksIdRotateSecretMutation,
  usePostV1AdminWebhooksMutation,
} from "../../store/api.generated";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { GuideLink } from "../guides/guide-link";
import { DataTable } from "../../components/data-table/data-table";
import { humanize } from "../../components/json-schema-form/schema";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { OneTimeSecretDialog } from "../api-keys/one-time-secret";
import { DeliveriesLog } from "./deliveries-log";
import {
  ALL_EVENTS,
  createBody,
  ENDPOINT_STATUS,
  endpointStatus,
  eventsSummary,
  formFromEndpoint,
  groupEvents,
  MAX_DESCRIPTION,
  patchBody,
  toggleEvent,
  toggleGroup,
  validateEndpoint,
  type Endpoint,
  type EndpointErrors,
  type EndpointForm,
} from "./webhook-logic";

type Reveal = { title: string; secret: string };

const SIGNATURE_HELP =
  'Each request carries x-premium-signature: t=<unix time>,v1=<HMAC-SHA256 of "<t>.<raw body>" with this secret>.';

// Outbound webhooks (spec §11.3): signed event deliveries to HTTPS endpoints, retried with backoff,
// logged for replay, and switched off automatically after repeated failures.
export function WebhooksScreen() {
  const endpoints = useGetV1AdminWebhooksQuery({});
  const [editing, setEditing] = useState<Endpoint | "new" | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const columns: ColumnDef<Endpoint>[] = [
    {
      header: "Endpoint",
      cell: ({ row: { original: e } }) => (
        <div className="max-w-sm space-y-0.5 whitespace-normal">
          <p className="font-mono text-xs break-all">{e.url}</p>
          {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
        </div>
      ),
    },
    {
      header: "Events",
      cell: ({ row: { original: e } }) => (
        <span className="text-xs" title={e.events.join(", ")}>
          {eventsSummary(e.events)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: e } }) => {
        const status = ENDPOINT_STATUS[endpointStatus(e)];
        return (
          <div className="max-w-56 space-y-0.5 whitespace-normal">
            <Badge variant={status.variant}>{status.label}</Badge>
            {e.disabledAt && <p className="text-xs text-muted-foreground">{formatDateTime(e.disabledAt)}</p>}
          </div>
        );
      },
    },
    {
      header: "Failures in a row",
      cell: ({ row: { original: e } }) => (
        <span className={`text-xs tabular-nums ${e.consecutiveFailures ? "font-medium text-destructive" : ""}`}>
          {e.consecutiveFailures}
        </span>
      ),
    },
    {
      header: "Created",
      cell: ({ row: { original: e } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(e.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Send store events to other systems. Payloads are signed, failed deliveries are retried, and an endpoint that keeps failing is switched off."
        actions={
          <>
            <GuideLink href="/admin/webhooks/guide" />
            <Button size="sm" onClick={() => setEditing("new")}>
              <PlusIcon /> New endpoint
            </Button>
          </>
        }
      />
      <DataTable
        tableKey="webhooks"
        columns={columns}
        data={endpoints.data}
        loading={endpoints.isLoading}
        error={endpoints.error}
        getRowId={(e) => e.id}
        renderExpanded={(e) => <EndpointDetail endpoint={e} onEdit={() => setEditing(e)} onReveal={setReveal} />}
        emptyMessage="No webhook endpoints yet."
      />
      {editing && (
        <EndpointDialog
          endpoint={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onCreated={(secret) => {
            setEditing(null);
            setReveal({ title: "Endpoint created", secret });
          }}
        />
      )}
      {reveal && (
        <OneTimeSecretDialog
          title={reveal.title}
          description={SIGNATURE_HELP}
          label="Signing secret"
          secret={reveal.secret}
          onClose={() => setReveal(null)}
        />
      )}
    </>
  );
}

function EndpointDetail({
  endpoint: e,
  onEdit,
  onReveal,
}: {
  endpoint: Endpoint;
  onEdit: () => void;
  onReveal: (r: Reveal) => void;
}) {
  const [patch, patching] = usePatchV1AdminWebhooksIdMutation();
  const [ping, pinging] = usePostV1AdminWebhooksIdPingMutation();
  const [rotate] = usePostV1AdminWebhooksIdRotateSecretMutation();
  const [remove] = useDeleteV1AdminWebhooksIdMutation();
  const status = endpointStatus(e);

  return (
    <div className="space-y-4">
      {status === "auto_disabled" && (
        <Alert variant="destructive">
          <AlertTitle>Switched off after repeated failures</AlertTitle>
          <AlertDescription>
            {e.disabledReason ?? "Deliveries kept failing."} Fix the endpoint, then enable it again; that also resets
            the failure count. Events in the meantime weren&apos;t sent.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label={`Actions for ${e.url}`}>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <PencilIcon /> Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={patching.isLoading}
          onClick={() =>
            patch({ id: e.id, body: { isActive: !e.isActive } })
              .unwrap()
              .then(() => notifySaved(e.isActive ? "Endpoint disabled" : "Endpoint enabled"), notifyError)
          }
        >
          <PowerIcon /> {e.isActive ? "Disable" : "Enable"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pinging.isLoading || !e.isActive}
          title={e.isActive ? undefined : "Enable the endpoint to ping it"}
          onClick={() =>
            ping({ id: e.id })
              .unwrap()
              .then(
                () => toast.success("Test event queued. It shows in the delivery log once sent; refresh in a moment."),
                notifyError,
              )
          }
        >
          <SendIcon /> Send test event
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline">
              <KeyRoundIcon /> Rotate secret
            </Button>
          }
          title="Rotate the signing secret?"
          description="A new secret is issued and the old one stops working at once. Update the receiving system straight after."
          confirmLabel="Rotate secret"
          onConfirm={() =>
            rotate({ id: e.id })
              .unwrap()
              .then((res) => onReveal({ title: "New signing secret", secret: res.secret }), notifyError)
          }
        />
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="text-destructive">
              <Trash2Icon /> Delete
            </Button>
          }
          title="Delete this endpoint?"
          description={`${e.url} stops receiving events. Its delivery log is kept until it expires.`}
          confirmLabel="Delete endpoint"
          destructive
          onConfirm={() =>
            remove({ id: e.id })
              .unwrap()
              .then(() => notifySaved("Endpoint deleted"), notifyError)
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Events: {e.events.includes(ALL_EVENTS) ? "all events" : e.events.join(", ")}
      </p>
      <section aria-label="Delivery log" className="space-y-2">
        <h3 className="text-sm font-medium">Deliveries</h3>
        <DeliveriesLog endpointId={e.id} />
      </section>
    </div>
  );
}

function EndpointDialog({
  endpoint,
  onClose,
  onCreated,
}: {
  endpoint: Endpoint | null;
  onClose: () => void;
  onCreated: (secret: string) => void;
}) {
  const catalog = useGetV1AdminWebhooksEventsQuery({});
  const groups = groupEvents(catalog.data?.events ?? []);
  const [form, setForm] = useState<EndpointForm>(() =>
    endpoint ? formFromEndpoint(endpoint) : { url: "", description: "", events: [], isActive: true },
  );
  const [errors, setErrors] = useState<EndpointErrors>({});
  const [create, creating] = usePostV1AdminWebhooksMutation();
  const [update, updating] = usePatchV1AdminWebhooksIdMutation();
  const all = form.events.includes(ALL_EVENTS);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          className="space-y-5"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            const found = validateEndpoint(form);
            setErrors(found);
            if (Object.keys(found).length) return;
            if (!endpoint) {
              create({ body: createBody(form) })
                .unwrap()
                .then((res) => {
                  notifySaved("Endpoint created");
                  onCreated(res.secret);
                }, notifyError);
              return;
            }
            const body = patchBody(form, endpoint);
            if (!Object.keys(body).length) return onClose();
            update({ id: endpoint.id, body })
              .unwrap()
              .then(() => {
                notifySaved("Endpoint saved");
                onClose();
              }, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>{endpoint ? "Edit endpoint" : "New endpoint"}</DialogTitle>
            <DialogDescription>
              {endpoint
                ? "Changes apply to the next delivery."
                : "The signing secret is shown once, right after the endpoint is created."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="endpoint-url">URL</FieldLabel>
              <Input
                id="endpoint-url"
                type="url"
                className="font-mono text-xs"
                placeholder="https://example.com/webhooks"
                value={form.url}
                aria-invalid={errors.url ? true : undefined}
                onChange={(ev) => setForm({ ...form, url: ev.target.value })}
              />
              <FieldDescription>A public HTTPS address. Private and local addresses are refused.</FieldDescription>
              {errors.url && <FieldError>{errors.url}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="endpoint-description">Description</FieldLabel>
              <Input
                id="endpoint-description"
                maxLength={MAX_DESCRIPTION}
                placeholder="e.g. ERP order sync"
                value={form.description}
                aria-invalid={errors.description ? true : undefined}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
              />
              {errors.description && <FieldError>{errors.description}</FieldError>}
            </Field>
            {endpoint && (
              <Field orientation="horizontal">
                <Switch
                  id="endpoint-active"
                  checked={form.isActive}
                  onCheckedChange={(on) => setForm({ ...form, isActive: on })}
                />
                <FieldLabel htmlFor="endpoint-active">Enabled</FieldLabel>
                {!endpoint.isActive && form.isActive && (
                  <FieldDescription>Enabling also resets the failure count.</FieldDescription>
                )}
              </Field>
            )}
            <FieldSet>
              <FieldLegend variant="label">Events</FieldLegend>
              {errors.events && <FieldError>{errors.events}</FieldError>}
              <Field orientation="horizontal">
                <Checkbox
                  id="event-all"
                  checked={all}
                  onCheckedChange={(on) => setForm({ ...form, events: toggleEvent(form.events, ALL_EVENTS, !!on) })}
                />
                <FieldLabel htmlFor="event-all">All events, including ones added later</FieldLabel>
              </Field>
              {!all && (
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {groups.map(([group, events]) => {
                    const on = events.filter((ev) => form.events.includes(ev)).length;
                    const groupId = `event-group-${group}`;
                    return (
                      <div key={group} className="space-y-1.5" role="group" aria-labelledby={groupId}>
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`${groupId}-all`}
                            checked={on === events.length}
                            indeterminate={on > 0 && on < events.length}
                            onCheckedChange={(checked) =>
                              setForm({ ...form, events: toggleGroup(form.events, events, !!checked) })
                            }
                          />
                          <FieldLabel
                            id={groupId}
                            htmlFor={`${groupId}-all`}
                            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                          >
                            {humanize(group)}
                          </FieldLabel>
                        </Field>
                        {events.map((ev) => (
                          <Field key={ev} orientation="horizontal" className="pl-5">
                            <Checkbox
                              id={`event-${ev}`}
                              checked={form.events.includes(ev)}
                              onCheckedChange={(checked) =>
                                setForm({ ...form, events: toggleEvent(form.events, ev, !!checked) })
                              }
                            />
                            <FieldLabel htmlFor={`event-${ev}`} className="font-mono text-xs font-normal">
                              {ev}
                            </FieldLabel>
                          </Field>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <span className="mr-auto self-center text-xs text-muted-foreground" aria-live="polite">
              {all ? "All events" : `${form.events.length} event${form.events.length === 1 ? "" : "s"} selected`}
            </span>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating.isLoading || updating.isLoading}>
              {endpoint ? "Save endpoint" : "Create endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
