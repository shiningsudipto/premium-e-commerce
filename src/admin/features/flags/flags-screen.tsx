"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
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
  DialogTrigger,
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
import { fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminChannelsQuery,
  useGetV1AdminFlagsQuery,
  useGetV1AdminMarketsQuery,
  usePutV1AdminFlagsKeyMutation,
  type GetV1AdminFlagsApiResponse,
  type PutV1AdminFlagsKeyApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { SchemaField } from "../../components/json-schema-form/schema-field";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";

type Flag = GetV1AdminFlagsApiResponse[number];
type Targeting = NonNullable<PutV1AdminFlagsKeyApiArg["body"]["targeting"]>;

export function targetingSummary(t: Targeting | undefined): string {
  if (!t) return "Everyone";
  const parts = [
    t.markets?.length ? `${t.markets.length} market${t.markets.length > 1 ? "s" : ""}` : null,
    t.channels?.length ? `${t.channels.length} channel${t.channels.length > 1 ? "s" : ""}` : null,
    t.groups?.length ? `${t.groups.length} group${t.groups.length > 1 ? "s" : ""}` : null,
    t.customerIds?.length ? `${t.customerIds.length} customer${t.customerIds.length > 1 ? "s" : ""}` : null,
    t.percentage !== undefined && t.percentage < 100 ? `${t.percentage}% of shoppers` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Everyone";
}

// Feature flags console (spec §2.4): on/off, kill switch and targeting per flag.
export function FlagsScreen() {
  const flags = useGetV1AdminFlagsQuery({});
  const canWrite = useCan("flags.write");
  // the list refetches after every flag change (its OpenAPI tag), including failed ones
  const [updateFlag, update] = usePutV1AdminFlagsKeyMutation();
  const toggle = (f: Flag, enabled: boolean) =>
    updateFlag({ key: f.key, body: { enabled, version: f.version } })
      .unwrap()
      .then(
        (flag) =>
          notifySaved(`${flag.key} ${flag.enabled ? "on" : "off"}${flag.killSwitch ? " (kill switch engaged)" : ""}`),
        notifyError,
      );

  const columns: ColumnDef<Flag>[] = [
    {
      header: "Flag",
      cell: ({ row: { original: f } }) => (
        <div className="max-w-md space-y-0.5 whitespace-normal">
          <p className="font-mono text-xs font-medium">{f.key}</p>
          <p className="text-xs text-muted-foreground">{f.description}</p>
        </div>
      ),
    },
    {
      header: "On",
      cell: ({ row: { original: f } }) => (
        <Switch
          checked={f.enabled}
          disabled={!canWrite || update.isLoading}
          aria-label={`${f.key} enabled`}
          onCheckedChange={(enabled) => toggle(f, enabled)}
        />
      ),
    },
    {
      header: "Audience",
      cell: ({ row: { original: f } }) =>
        f.killSwitch ? (
          <Badge variant="destructive">Kill switch</Badge>
        ) : (
          <span className="text-xs">{targetingSummary(f.targeting as Targeting)}</span>
        ),
    },
    { header: "Owner", cell: ({ row: { original: f } }) => <span className="text-xs">{f.owner ?? "—"}</span> },
    {
      header: "Updated",
      cell: ({ row: { original: f } }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(f.updatedAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Feature flags"
        description="Turn features on per market, channel, customer group or a share of shoppers. The kill switch turns a flag off everywhere, whatever its targeting."
        actions={canWrite && <NewFlagDialog existing={flags.data?.map((f) => f.key) ?? []} />}
      />
      <DataTable
        tableKey="flags"
        columns={columns}
        data={flags.data}
        loading={flags.isLoading}
        error={flags.error}
        getRowId={(f) => f.key}
        renderExpanded={(f) => <FlagEditor flag={f} readOnly={!canWrite} />}
        emptyMessage="No flags yet."
      />
    </>
  );
}

function FlagEditor({ flag, readOnly }: { flag: Flag; readOnly: boolean }) {
  const markets = useGetV1AdminMarketsQuery({});
  const channels = useGetV1AdminChannelsQuery({});
  const [targeting, setTargeting] = useState<Targeting>(() => (flag.targeting as Targeting) ?? {});
  const [killSwitch, setKillSwitch] = useState(flag.killSwitch);
  const [owner, setOwner] = useState(flag.owner ?? "");
  const [saveFlag, save] = usePutV1AdminFlagsKeyMutation();

  const toggle = (list: "markets" | "channels", handle: string, on: boolean) =>
    setTargeting((t) => {
      const current = t[list] ?? [];
      const next = on ? [...current, handle] : current.filter((h) => h !== handle);
      return { ...t, [list]: next.length ? next : undefined };
    });

  return (
    <form
      className="grid gap-6 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        saveFlag({
          key: flag.key,
          body: { targeting, killSwitch, owner: owner.trim() || null, version: flag.version },
        })
          .unwrap()
          .then(() => notifySaved(`${flag.key} targeting saved`), notifyError);
      }}
    >
      <FieldGroup>
        {(["markets", "channels"] as const).map((list) => {
          const options = (list === "markets" ? markets.data : channels.data) ?? [];
          return (
            <FieldSet key={list}>
              <FieldLegend variant="label">{list === "markets" ? "Markets" : "Channels"}</FieldLegend>
              <FieldDescription>None selected means all {list}.</FieldDescription>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {options.map((o) => (
                  <Field key={o.handle} orientation="horizontal" className="w-auto">
                    <Checkbox
                      id={`${flag.key}-${list}-${o.handle}`}
                      checked={targeting[list]?.includes(o.handle) ?? false}
                      disabled={readOnly}
                      onCheckedChange={(on) => toggle(list, o.handle, !!on)}
                    />
                    <FieldLabel htmlFor={`${flag.key}-${list}-${o.handle}`} className="font-normal">
                      {o.name}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </FieldSet>
          );
        })}
        <SchemaField
          schema={{ anyOf: [{ type: "number", minimum: 0, maximum: 100 }, { type: "null" }] }}
          label="Share of shoppers (%)"
          description="A stable share: the same shopper keeps the same answer."
          value={targeting.percentage ?? null}
          disabled={readOnly}
          onChange={(v) => setTargeting((t) => ({ ...t, percentage: v === null ? undefined : (v as number) }))}
        />
      </FieldGroup>
      <FieldGroup>
        <SchemaField
          schema={{ type: "array", items: { type: "string" } }}
          label="Customer groups"
          value={targeting.groups ?? []}
          disabled={readOnly}
          onChange={(v) =>
            setTargeting((t) => ({ ...t, groups: (v as string[]).length ? (v as string[]) : undefined }))
          }
        />
        <SchemaField
          schema={{ type: "array", items: { type: "string" } }}
          label="Customer IDs"
          value={targeting.customerIds ?? []}
          disabled={readOnly}
          onChange={(v) =>
            setTargeting((t) => ({ ...t, customerIds: (v as string[]).length ? (v as string[]) : undefined }))
          }
        />
        <Field>
          <FieldLabel htmlFor={`${flag.key}-owner`}>Owner</FieldLabel>
          <Input
            id={`${flag.key}-owner`}
            value={owner}
            disabled={readOnly}
            onChange={(e) => setOwner(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Switch id={`${flag.key}-kill`} checked={killSwitch} disabled={readOnly} onCheckedChange={setKillSwitch} />
          <div>
            <FieldLabel htmlFor={`${flag.key}-kill`}>Kill switch</FieldLabel>
            <FieldDescription>Off for everyone immediately, whatever the targeting says.</FieldDescription>
          </div>
        </Field>
        {!readOnly && (
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={save.isLoading}>
              {save.isLoading ? "Saving…" : "Save targeting"}
            </Button>
          </div>
        )}
      </FieldGroup>
    </form>
  );
}

// PUT creates or updates, so an existing key is refused here rather than silently overwritten.
function NewFlagDialog({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createFlag, create] = usePutV1AdminFlagsKeyMutation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> New flag
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const key = String(form.get("key")).trim();
            if (!/^[a-z0-9_.]+$/.test(key)) {
              setErrors({ key: ["Lowercase letters, digits, dots and underscores only"] });
              return;
            }
            if (existing.includes(key)) {
              setErrors({ key: ["A flag with this key already exists"] });
              return;
            }
            createFlag({
              key,
              body: {
                description: String(form.get("description")).trim(),
                owner: String(form.get("owner")).trim() || null,
                enabled: false,
              },
            })
              .unwrap()
              .then(
                (flag) => {
                  notifySaved(`${flag.key} created (off)`);
                  setOpen(false);
                },
                (error) => {
                  setErrors(fieldErrors(error));
                  notifyError(error);
                },
              );
          }}
        >
          <DialogHeader>
            <DialogTitle>New feature flag</DialogTitle>
            <DialogDescription>It starts off. Turn it on from the list when the feature is ready.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.key ? true : undefined}>
              <FieldLabel htmlFor="flag-key">Key</FieldLabel>
              <Input id="flag-key" name="key" required placeholder="e.g. product_compare" className="font-mono" />
              <FieldError>{errors.key?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="flag-description">Description</FieldLabel>
              <Input id="flag-description" name="description" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="flag-owner">Owner (optional)</FieldLabel>
              <Input id="flag-owner" name="owner" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading}>
              Create flag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
