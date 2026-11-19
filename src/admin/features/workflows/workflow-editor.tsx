"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { errorCode, errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminWorkflowsQuery,
  useGetV1AdminWorkflowsTriggersQuery,
  usePostV1AdminWorkflowsMutation,
  usePutV1AdminWorkflowsIdMutation,
} from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { Section } from "../products/section";
import { RuleActions } from "./rule-actions";
import { RuleConditions } from "./rule-conditions";
import { RuleRuns } from "./rule-runs";
import { RuleTestPanel } from "./rule-test-panel";
import { DeleteRule } from "./workflows-screen";
import {
  blankForm,
  formFromRule,
  hasErrors,
  toBody,
  triggerLabel,
  validateForm,
  type FormErrors,
  type Rule,
  type RuleForm,
} from "./workflow-rules";

function BackLink() {
  return (
    <Link
      href="/admin/workflows"
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" aria-hidden /> Workflows
    </Link>
  );
}

export function NewWorkflowScreen() {
  return (
    <>
      <BackLink />
      <PageHeader
        title="New workflow rule"
        description="Pick the event, narrow it down with conditions, then choose what happens. Test it before you save."
      />
      <RuleEditor rule={null} />
    </>
  );
}

// The API has no single-rule read; the list is small and already cached.
export function WorkflowEditScreen({ id }: { id: string }) {
  const rules = useGetV1AdminWorkflowsQuery({});
  const router = useRouter();
  const rule = rules.data?.find((r) => r.id === id);
  if (rules.error || (rules.data && !rule)) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>
            {rules.error ? errorMessage(rules.error) : "This rule doesn't exist (any more)."}
          </AlertDescription>
        </Alert>
      </>
    );
  }
  if (!rule) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  return (
    <>
      <BackLink />
      <PageHeader
        title={rule.name}
        description={`${triggerLabel(rule.trigger)} · updated ${formatDateTime(rule.updatedAt)} · last run ${rule.lastRunAt ? formatDateTime(rule.lastRunAt) : "never"}`}
        actions={<DeleteRule rule={rule} onDeleted={() => router.push("/admin/workflows")} />}
      />
      {/* a new version (after any save) resets the form to what the API stored */}
      <RuleEditor key={rule.version} rule={rule} onConflict={rules.refetch} />
      <div className="mt-6">
        <Section title="Run history" description="Each event of the trigger while the rule was on, newest first.">
          <RuleRuns ruleId={rule.id} />
        </Section>
      </div>
    </>
  );
}

function RuleEditor({ rule, onConflict }: { rule: Rule | null; onConflict?: () => void }) {
  const router = useRouter();
  const triggers = useGetV1AdminWorkflowsTriggersQuery({});
  const triggerList = triggers.data?.triggers ?? [];
  const [form, setForm] = useState<RuleForm>(() => (rule ? formFromRule(rule) : blankForm()));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [create, creating] = usePostV1AdminWorkflowsMutation();
  const [update, updating] = usePutV1AdminWorkflowsIdMutation();

  const change = (next: Partial<RuleForm>) => {
    const updated = { ...form, ...next };
    setForm(updated);
    // once a save was tried, errors follow the edits
    if (submitted) setErrors(validateForm(updated, triggerList));
  };

  const triggerItems = triggerList.map((t) => ({ value: t, label: `${triggerLabel(t)} (${t})` }));

  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          const found = validateForm(form, triggerList);
          setErrors(found);
          if (hasErrors(found)) return;
          const body = toBody(form);
          const saved = rule ? update({ id: rule.id, body: { ...body, version: rule.version } }) : create({ body });
          saved.unwrap().then(
            (r) => {
              notifySaved(rule ? `${r.name} saved` : `${r.name} created`);
              if (!rule) router.push(`/admin/workflows/${r.id}`);
            },
            (error) => {
              notifyError(error);
              if (errorCode(error) === "VERSION_CONFLICT") onConflict?.();
            },
          );
        }}
      >
        {hasErrors(errors) && (
          <Alert variant="destructive">
            <AlertDescription>Some fields need attention before the rule can be saved.</AlertDescription>
          </Alert>
        )}
        <Section title="Rule">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rule-name">Name</FieldLabel>
              <Input
                id="rule-name"
                value={form.name}
                maxLength={200}
                aria-invalid={errors.name ? true : undefined}
                onChange={(e) => change({ name: e.target.value })}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="rule-trigger">Trigger</FieldLabel>
              <Select
                items={triggerItems}
                value={form.trigger || null}
                onValueChange={(v) => v && change({ trigger: String(v) })}
              >
                <SelectTrigger id="rule-trigger" className="w-full" aria-invalid={errors.trigger ? true : undefined}>
                  <SelectValue placeholder={triggers.isLoading ? "Loading…" : "Choose an event"} />
                </SelectTrigger>
                <SelectContent>
                  {triggerItems.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>The event that makes the rule check its conditions.</FieldDescription>
              {errors.trigger && <FieldError>{errors.trigger}</FieldError>}
            </Field>
          </div>
          <Field orientation="horizontal" className="mt-4">
            <Switch id="rule-active" checked={form.isActive} onCheckedChange={(on) => change({ isActive: on })} />
            <FieldLabel htmlFor="rule-active">Enabled</FieldLabel>
            <Badge variant={form.isActive ? "secondary" : "outline"}>
              {form.isActive ? "Runs on new events" : "Paused"}
            </Badge>
          </Field>
        </Section>

        <Section
          title="Conditions"
          description="Facts about the event's order, customer and affiliate. Leave empty to act on every event."
        >
          <RuleConditions
            match={form.match}
            conditions={form.conditions}
            errors={errors}
            onChange={(next) => change(next)}
          />
        </Section>

        <Section
          title="Actions"
          description="Run in order when the conditions hold. A failed action is logged and the rest still run."
        >
          <RuleActions actions={form.actions} errors={errors} onChange={(actions) => change({ actions })} />
        </Section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={creating.isLoading || updating.isLoading}>
            {rule ? "Save rule" : "Create rule"}
          </Button>
          <Link href="/admin/workflows" className="text-sm text-muted-foreground hover:underline">
            Cancel
          </Link>
        </div>
      </form>

      <Section
        title="Test"
        description="Checks the conditions as edited above against a sample event, without saving or running anything."
      >
        <RuleTestPanel form={form} />
      </Section>
    </div>
  );
}
