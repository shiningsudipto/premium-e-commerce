"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { InfoIcon, PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminFlagsQuery,
  usePutV1AdminFlagsKeyMutation,
  type GetV1AdminFlagsApiResponse,
  type PutV1AdminFlagsKeyApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { HelpContent } from "../settings/help-content";
import { FlagEditor } from "./flag-editor";
import { FLAG_BASICS, FLAG_HELP, type FlagHelp } from "./flag-help";
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
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-mono text-xs font-medium">{f.key}</p>
            <FlagStatus help={FLAG_HELP[f.key]} />
            <FlagInfo flagKey={f.key} help={FLAG_HELP[f.key]} description={f.description} />
          </div>
          <p className="text-xs text-muted-foreground">{FLAG_HELP[f.key]?.what ?? f.description}</p>
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
      <FlagBasics />
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

// "Live", "Partly built" or "Not built yet", so nobody expects a placeholder flag to do anything
function FlagStatus({ help }: { help: FlagHelp | undefined }) {
  if (!help)
    return (
      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
        Custom
      </Badge>
    );
  if (help.status === "live")
    return (
      <Badge
        variant="outline"
        className="h-5 border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] font-normal text-emerald-700 dark:text-emerald-300"
      >
        Live
      </Badge>
    );
  if (help.status === "partial")
    return (
      <Badge
        variant="outline"
        className="h-5 border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] font-normal text-amber-800 dark:text-amber-300"
      >
        Partly built
      </Badge>
    );
  return (
    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
      Not built yet
    </Badge>
  );
}

// The flag's explanation in a popover: what it is, why, what it does, recommendation, pitfalls.
function FlagInfo({
  flagKey,
  help,
  description,
}: {
  flagKey: string;
  help: FlagHelp | undefined;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            aria-label={`About the ${flagKey} flag: what it does and recommended setting`}
            title="What is this?"
          >
            {open ? <XIcon /> : <InfoIcon />}
          </Button>
        }
      />
      <PopoverContent align="start" className="max-h-[70vh] w-[28rem] max-w-[calc(100vw-2rem)] overflow-y-auto">
        <PopoverTitle className="mb-2 font-mono text-sm">{flagKey}</PopoverTitle>
        {help ? (
          <HelpContent help={help} />
        ) : (
          <p className="text-sm">
            {description || "A custom flag created in admin."} It only has an effect where your developers check it in
            code.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// A short explainer of how flags work, above the list.
function FlagBasics() {
  return (
    <details className="mb-4 rounded-lg border bg-card p-4 text-sm [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <InfoIcon className="size-4 text-muted-foreground" aria-hidden /> How feature flags work
      </summary>
      <dl className="mt-3 grid gap-3 md:grid-cols-2">
        {FLAG_BASICS.map((b) => (
          <div key={b.title}>
            <dt className="font-medium">{b.title}</dt>
            <dd className="text-muted-foreground">{b.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
