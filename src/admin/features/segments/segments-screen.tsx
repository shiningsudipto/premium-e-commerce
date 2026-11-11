"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { EyeIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminSegmentsIdMutation,
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminSegmentsQuery,
  usePostV1AdminSegmentsIdRefreshMutation,
  usePostV1AdminSegmentsMutation,
  usePostV1AdminSegmentsPreviewMutation,
  usePutV1AdminSegmentsIdMutation,
  type GetV1AdminSegmentsApiResponse,
  type PostV1AdminSegmentsPreviewApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_CURRENCY } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { slug } from "../products/product-form";
import { customerName } from "../customers/customers-screen";
import {
  blankCondition,
  changeField,
  fieldDef,
  MAX_CONDITIONS,
  SEGMENT_FIELDS,
  summarizeRules,
  toDraft,
  toRules,
  validateDraft,
  type CustomValueType,
  type DraftCondition,
  type DraftRules,
  type SegmentField,
} from "./rules";

type Segment = GetV1AdminSegmentsApiResponse[number];
type Groups = { handle: string; name: string }[];

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// amounts are compared in the store's currency
const CURRENCY = DEFAULT_CURRENCY;

function useGroups(): Groups {
  return useGetV1AdminCustomerGroupsQuery({}).data ?? [];
}

const groupNamer = (groups: Groups) => (handle: string) => groups.find((g) => g.handle === handle)?.name;

// Segments (spec §6.6): customers matching rules on spend, orders, tags, groups and more.
// Membership is recomputed hourly and on save; promotions, flags and page blocks target it.
export function SegmentsScreen() {
  const segments = useGetV1AdminSegmentsQuery({});
  const canWrite = useCan("customers.write");
  const groups = useGroups();
  const [creating, setCreating] = useState(false);

  const columns: ColumnDef<Segment>[] = [
    {
      header: "Segment",
      cell: ({ row: { original: s } }) => (
        <div className="space-y-0.5">
          <p className="font-medium">{s.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">{s.handle}</p>
        </div>
      ),
    },
    {
      header: "Rules",
      cell: ({ row: { original: s } }) => (
        <span className="line-clamp-2 max-w-md text-xs whitespace-normal">
          {summarizeRules(s.rules, { currency: CURRENCY, groupName: groupNamer(groups) })}
        </span>
      ),
    },
    {
      header: "Members",
      cell: ({ row: { original: s } }) => <span className="text-sm tabular-nums">{s.memberCount}</span>,
    },
    {
      header: "Refreshed",
      cell: ({ row: { original: s } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {s.refreshedAt ? formatDateTime(s.refreshedAt) : "Not yet"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Segments"
        description="Groups of customers defined by rules. Membership updates every hour and whenever a segment is saved."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon /> New segment
            </Button>
          )
        }
      />
      <DataTable
        tableKey="segments"
        columns={columns}
        data={segments.data}
        loading={segments.isLoading}
        error={segments.error}
        getRowId={(s) => s.id}
        renderExpanded={(s) => <SegmentEditor key={s.version} segment={s} readOnly={!canWrite} />}
        emptyMessage="No segments yet."
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New segment</DialogTitle>
            <DialogDescription>Members are worked out as soon as you create it.</DialogDescription>
          </DialogHeader>
          <SegmentEditor segment={null} readOnly={false} onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SegmentEditor({
  segment,
  readOnly,
  onCreated,
}: {
  segment: Segment | null;
  readOnly: boolean;
  onCreated?: () => void;
}) {
  const idBase = `segment-${segment?.id ?? "new"}`;
  const [name, setName] = useState(segment?.name ?? "");
  const [handle, setHandle] = useState(segment?.handle ?? "");
  const [draft, setDraft] = useState<DraftRules>(() =>
    segment ? toDraft(segment.rules, CURRENCY) : { match: "all", conditions: [blankCondition()] },
  );
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [preview, setPreview] = useState<PostV1AdminSegmentsPreviewApiResponse | null>(null);
  const [createSegment, create] = usePostV1AdminSegmentsMutation();
  const [updateSegment, update] = usePutV1AdminSegmentsIdMutation();
  const [refreshSegment, refresh] = usePostV1AdminSegmentsIdRefreshMutation();
  const [deleteSegment] = useDeleteV1AdminSegmentsIdMutation();
  const [runPreview, previewing] = usePostV1AdminSegmentsPreviewMutation();

  const ruleErrors = validateDraft(draft, CURRENCY);
  const handleValid = HANDLE.test(handle);
  const rulesValid = Object.keys(ruleErrors).length === 0;
  const invalid = !name.trim() || !handleValid || !rulesValid;

  function submit() {
    setShowErrors(true);
    if (invalid) return;
    const body = { name: name.trim(), handle, rules: toRules(draft, CURRENCY) };
    const onError = (error: unknown) => {
      setServerErrors(fieldErrors(error));
      notifyError(error);
    };
    if (segment) {
      updateSegment({ id: segment.id, body: { ...body, version: segment.version } })
        .unwrap()
        .then((s) => notifySaved(`${s.name} saved: ${s.memberCount} members`), onError);
    } else {
      createSegment({ body })
        .unwrap()
        .then((s) => {
          notifySaved(`${s.name} created: ${s.memberCount} members`);
          onCreated?.();
        }, onError);
    }
  }

  function showPreview() {
    setShowErrors(true);
    if (!rulesValid) return;
    runPreview({ body: { rules: toRules(draft, CURRENCY) } })
      .unwrap()
      .then(setPreview, notifyError);
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={showErrors && !name.trim() ? true : undefined}>
          <FieldLabel htmlFor={`${idBase}-name`}>Name</FieldLabel>
          <Input
            id={`${idBase}-name`}
            value={name}
            disabled={readOnly}
            onChange={(e) => {
              if (!segment && (!handle || handle === slug(name))) setHandle(slug(e.target.value));
              setName(e.target.value);
            }}
          />
          {showErrors && !name.trim() && <FieldError>Enter a name</FieldError>}
        </Field>
        <Field data-invalid={(handle && !handleValid) || serverErrors.handle ? true : undefined}>
          <FieldLabel htmlFor={`${idBase}-handle`}>Handle</FieldLabel>
          <Input
            id={`${idBase}-handle`}
            value={handle}
            className="font-mono"
            disabled={readOnly}
            onChange={(e) => setHandle(e.target.value.trim())}
          />
          <FieldDescription>Promotions, flags and page blocks refer to the segment by this.</FieldDescription>
          <FieldError>
            {(handle || showErrors) && !handleValid
              ? "Lowercase letters, numbers and dashes"
              : serverErrors.handle?.[0]}
          </FieldError>
        </Field>
      </div>

      <RuleBuilder
        idBase={idBase}
        draft={draft}
        onChange={(next) => {
          setDraft(next);
          setPreview(null);
        }}
        errors={showErrors ? ruleErrors : {}}
        readOnly={readOnly}
      />
      {serverErrors._form && <p className="text-sm text-destructive">{serverErrors._form[0]}</p>}

      <PreviewResult preview={preview} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {segment && !readOnly && (
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" variant="ghost" className="mr-auto">
                <Trash2Icon /> Delete
              </Button>
            }
            title={`Delete ${segment.name}?`}
            description="Promotions, feature flags and page blocks that target it stop matching anyone. Customers aren't affected."
            confirmLabel="Delete segment"
            destructive
            onConfirm={() =>
              deleteSegment({ id: segment.id })
                .unwrap()
                .then(() => notifySaved(`${segment.name} deleted`), notifyError)
            }
          />
        )}
        <Button type="button" size="sm" variant="outline" disabled={previewing.isLoading} onClick={showPreview}>
          <EyeIcon /> {previewing.isLoading ? "Checking…" : "Preview matches"}
        </Button>
        {segment && !readOnly && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={refresh.isLoading}
            onClick={() =>
              refreshSegment({ id: segment.id })
                .unwrap()
                .then(
                  (r) =>
                    notifySaved(`${segment.name}: ${r.memberCount} members (${r.entered} joined, ${r.exited} left)`),
                  notifyError,
                )
            }
          >
            <RefreshCwIcon /> {refresh.isLoading ? "Refreshing…" : "Refresh members"}
          </Button>
        )}
        {!readOnly && (
          <Button type="submit" size="sm" disabled={create.isLoading || update.isLoading}>
            {segment ? "Save segment" : "Create segment"}
          </Button>
        )}
      </div>
    </form>
  );
}

function PreviewResult({ preview }: { preview: PostV1AdminSegmentsPreviewApiResponse | null }) {
  if (!preview) return null;
  return (
    <section aria-live="polite" className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <h3 className="text-sm font-medium">
        {preview.count === 0
          ? "No customers match these rules right now."
          : `${preview.count} ${preview.count === 1 ? "customer matches" : "customers match"}`}
      </h3>
      {preview.sample.length > 0 && (
        <>
          <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {preview.sample.map((c) => (
              <li key={c.id} className="truncate">
                <Link href={`/admin/customers/${c.id}`} className="underline-offset-4 hover:underline">
                  {customerName(c) || c.email || "Unnamed customer"}
                </Link>
                {customerName(c) && c.email && <span className="text-xs text-muted-foreground"> · {c.email}</span>}
              </li>
            ))}
          </ul>
          {preview.count > preview.sample.length && (
            <p className="text-xs text-muted-foreground">Showing {preview.sample.length} of them.</p>
          )}
        </>
      )}
    </section>
  );
}

function RuleBuilder({
  idBase,
  draft,
  onChange,
  errors,
  readOnly,
}: {
  idBase: string;
  draft: DraftRules;
  onChange: (draft: DraftRules) => void;
  errors: Record<string, string>;
  readOnly: boolean;
}) {
  const groups = useGroups();
  const setCondition = (i: number, next: DraftCondition) =>
    onChange({ ...draft, conditions: draft.conditions.map((c, j) => (j === i ? next : c)) });

  return (
    <FieldSet>
      <FieldLegend variant="label">Rules</FieldLegend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        Customers must match
        <Select
          value={draft.match}
          disabled={readOnly}
          onValueChange={(v) => onChange({ ...draft, match: v as DraftRules["match"] })}
        >
          <SelectTrigger aria-label="Match all or any conditions" size="sm" className="w-24">
            <SelectValue>{draft.match}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="any">any</SelectItem>
          </SelectContent>
        </Select>
        of these conditions:
      </div>
      <ol className="space-y-2">
        {draft.conditions.map((c, i) => {
          const def = fieldDef(c.field);
          const label = `Condition ${i + 1}`;
          return (
            <li key={i} className="space-y-1 rounded-md border bg-background p-2">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={c.field}
                  disabled={readOnly}
                  onValueChange={(v) => setCondition(i, changeField(c, v as SegmentField))}
                >
                  <SelectTrigger aria-label={`${label} field`} size="sm" className="w-48">
                    <SelectValue>{def.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {def.kind === "custom" && (
                  <Input
                    aria-label={`${label} custom field key`}
                    placeholder="Field key"
                    className="h-7 w-32 font-mono"
                    value={c.key}
                    disabled={readOnly}
                    onChange={(e) => setCondition(i, { ...c, key: e.target.value })}
                  />
                )}
                {def.ops.length > 1 ? (
                  <Select
                    value={c.op}
                    disabled={readOnly}
                    onValueChange={(v) => setCondition(i, { ...c, op: String(v) })}
                  >
                    <SelectTrigger aria-label={`${label} comparison`} size="sm" className="w-32">
                      <SelectValue>{def.ops.find((o) => o.value === c.op)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {def.ops.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm text-muted-foreground">{def.ops[0].label}</span>
                )}
                <ConditionValue
                  id={`${idBase}-cond-${i}`}
                  label={label}
                  condition={c}
                  groups={groups}
                  invalid={!!errors[i]}
                  readOnly={readOnly}
                  onChange={(next) => setCondition(i, next)}
                />
                {!readOnly && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto"
                    aria-label={`Remove ${label.toLowerCase()}`}
                    onClick={() => onChange({ ...draft, conditions: draft.conditions.filter((_, j) => j !== i) })}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </div>
              {errors[i] && (
                <p id={`${idBase}-cond-${i}-error`} className="text-xs text-destructive">
                  {errors[i]}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {errors._form && <FieldError>{errors._form}</FieldError>}
      {!readOnly && draft.conditions.length < MAX_CONDITIONS && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => onChange({ ...draft, conditions: [...draft.conditions, blankCondition()] })}
        >
          <PlusIcon /> Add condition
        </Button>
      )}
      {Object.keys(validateDraft(draft, CURRENCY)).length === 0 && (
        <FieldDescription>
          {summarizeRules(toRules(draft, CURRENCY), { currency: CURRENCY, groupName: groupNamer(groups) })}
        </FieldDescription>
      )}
    </FieldSet>
  );
}

function ConditionValue({
  id,
  label,
  condition: c,
  groups,
  invalid,
  readOnly,
  onChange,
}: {
  id: string;
  label: string;
  condition: DraftCondition;
  groups: Groups;
  invalid: boolean;
  readOnly: boolean;
  onChange: (next: DraftCondition) => void;
}) {
  const def = fieldDef(c.field);
  const describedBy = invalid ? `${id}-error` : undefined;
  const yesNo = (aria: string) => (
    <Select value={c.value} disabled={readOnly} onValueChange={(v) => onChange({ ...c, value: String(v) })}>
      <SelectTrigger aria-label={aria} aria-describedby={describedBy} size="sm" className="w-24">
        <SelectValue>{c.value === "true" ? "Yes" : c.value === "false" ? "No" : "Choose"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">Yes</SelectItem>
        <SelectItem value="false">No</SelectItem>
      </SelectContent>
    </Select>
  );

  if (def.kind === "boolean") return yesNo(`${label} value`);

  if (def.kind === "group") {
    if (!groups.length)
      return (
        <Alert className="w-auto px-2 py-1">
          <AlertDescription className="text-xs">
            No customer groups yet. Create one on the Customers page.
          </AlertDescription>
        </Alert>
      );
    return (
      <Select value={c.value} disabled={readOnly} onValueChange={(v) => onChange({ ...c, value: String(v) })}>
        <SelectTrigger aria-label={`${label} group`} aria-describedby={describedBy} size="sm" className="w-44">
          <SelectValue>{groups.find((g) => g.handle === c.value)?.name ?? (c.value || "Choose a group")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((g) => (
            <SelectItem key={g.handle} value={g.handle}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (def.kind === "custom") {
    return (
      <>
        <Select
          value={c.valueType}
          disabled={readOnly}
          onValueChange={(v) => {
            const valueType = v as CustomValueType;
            onChange({ ...c, valueType, value: valueType === "boolean" ? "true" : c.value });
          }}
        >
          <SelectTrigger aria-label={`${label} value type`} size="sm" className="w-28">
            <SelectValue>{{ text: "Text", number: "Number", boolean: "Yes/no" }[c.valueType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">Yes/no</SelectItem>
          </SelectContent>
        </Select>
        {c.valueType === "boolean" ? (
          yesNo(`${label} value`)
        ) : (
          <Input
            aria-label={`${label} value`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            inputMode={c.valueType === "number" ? "decimal" : undefined}
            className="h-7 w-36"
            value={c.value}
            disabled={readOnly}
            onChange={(e) => onChange({ ...c, value: e.target.value })}
          />
        )}
      </>
    );
  }

  const placeholder =
    def.kind === "money"
      ? `Amount in ${CURRENCY}`
      : def.kind === "countries"
        ? "BD, IN"
        : def.kind === "text"
          ? "Tag"
          : undefined;
  return (
    <span className="flex items-center gap-1.5">
      <Input
        aria-label={`${label} value`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        inputMode={def.kind === "money" ? "decimal" : def.kind === "number" ? "numeric" : undefined}
        placeholder={placeholder}
        className={def.kind === "number" ? "h-7 w-24" : "h-7 w-40"}
        value={c.value}
        disabled={readOnly}
        onChange={(e) => onChange({ ...c, value: e.target.value })}
      />
      {def.unit && <span className="text-sm text-muted-foreground">{def.unit}</span>}
      {def.kind === "money" && <span className="text-sm text-muted-foreground">{CURRENCY}</span>}
    </span>
  );
}
