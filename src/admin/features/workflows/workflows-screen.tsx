"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useDeleteV1AdminWorkflowsIdMutation,
  useGetV1AdminWorkflowsQuery,
  usePutV1AdminWorkflowsIdMutation,
} from "../../store/api.generated";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  formFromRule,
  summarizeAction,
  summarizeConditions,
  toBody,
  triggerLabel,
  type Rule,
  type RuleRow,
} from "./workflow-rules";

// Workflow rules (spec §10.4): when an event happens and its conditions hold, run the actions.
// The whole area needs workflows.write, so everyone who sees it can edit.
export function WorkflowsScreen() {
  const rules = useGetV1AdminWorkflowsQuery({});

  const columns: ColumnDef<RuleRow>[] = [
    {
      header: "Rule",
      cell: ({ row: { original: r } }) => (
        <div className="max-w-md space-y-0.5 whitespace-normal">
          <Link href={`/admin/workflows/${r.id}`} className="font-medium underline-offset-4 hover:underline">
            {r.name}
          </Link>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {summarizeConditions(r.conditions)} → {r.actions.map(summarizeAction).join(", ")}
          </p>
        </div>
      ),
    },
    {
      header: "Trigger",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs" title={r.trigger}>
          {triggerLabel(r.trigger)}
        </span>
      ),
    },
    { header: "Enabled", cell: ({ row: { original: r } }) => <EnabledSwitch rule={r} /> },
    {
      header: "Last run",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {r.lastRunAt ? formatDateTime(r.lastRunAt) : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <DeleteRule rule={row.original} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Automations: when an event happens and its conditions hold, the rule runs its actions. Each event runs a rule once, and every run is logged."
        actions={
          <Link href="/admin/workflows/new" className={buttonVariants({ size: "sm" })}>
            <PlusIcon /> New rule
          </Link>
        }
      />
      <DataTable
        tableKey="workflows"
        columns={columns}
        data={rules.data}
        loading={rules.isLoading}
        error={rules.error}
        getRowId={(r) => r.id}
        emptyMessage="No workflow rules yet."
      />
    </>
  );
}

function EnabledSwitch({ rule }: { rule: Rule }) {
  const [save, saving] = usePutV1AdminWorkflowsIdMutation();
  return (
    <div className="flex items-center gap-2">
      <Switch
        aria-label={`${rule.name} enabled`}
        checked={rule.isActive}
        disabled={saving.isLoading}
        onCheckedChange={(on) =>
          save({ id: rule.id, body: { ...toBody(formFromRule(rule)), isActive: on, version: rule.version } })
            .unwrap()
            .then(() => notifySaved(`${rule.name} ${on ? "enabled" : "disabled"}`), notifyError)
        }
      />
      <Badge variant={rule.isActive ? "secondary" : "outline"}>{rule.isActive ? "On" : "Off"}</Badge>
    </div>
  );
}

export function DeleteRule({ rule, onDeleted }: { rule: Rule; onDeleted?: () => void }) {
  const [remove] = useDeleteV1AdminWorkflowsIdMutation();
  return (
    <ConfirmDialog
      trigger={
        <Button size="icon-sm" variant="ghost" aria-label={`Delete ${rule.name}`}>
          <Trash2Icon />
        </Button>
      }
      title={`Delete ${rule.name}?`}
      description="The rule and its run history are removed. To pause it instead, switch it off."
      confirmLabel="Delete rule"
      destructive
      onConfirm={() =>
        remove({ id: rule.id })
          .unwrap()
          .then(() => {
            notifySaved(`${rule.name} deleted`);
            onDeleted?.();
          }, notifyError)
      }
    />
  );
}
