"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  blankCondition,
  factFor,
  FACTS,
  MAX_CONDITIONS,
  moveItem,
  OP_LABELS,
  opsFor,
  setConditionField,
  setConditionKind,
  type ConditionDraft,
  type FormErrors,
  type Match,
  type Op,
  type ValueKind,
} from "./workflow-rules";

const CUSTOM = "__custom";
const KIND_LABELS: Record<ValueKind, string> = { string: "Text", number: "Number", boolean: "Yes / no", list: "List" };

type Props = {
  match: Match;
  conditions: ConditionDraft[];
  errors: FormErrors;
  onChange: (next: { match?: Match; conditions?: ConditionDraft[] }) => void;
};

// Flat condition list joined by all/any: the engine evaluates exactly this shape.
export function RuleConditions({ match, conditions, errors, onChange }: Props) {
  const set = (list: ConditionDraft[]) => onChange({ conditions: list });
  return (
    <div className="space-y-3">
      {conditions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No conditions: the rule runs on every event of its trigger.</p>
      ) : (
        <Field orientation="horizontal" className="w-auto">
          <FieldLabel htmlFor="rule-match" className="font-normal">
            Run when
          </FieldLabel>
          <Select
            items={[
              { value: "all", label: "all conditions hold" },
              { value: "any", label: "any condition holds" },
            ]}
            value={match}
            onValueChange={(v) => v && onChange({ match: v as Match })}
          >
            <SelectTrigger id="rule-match" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all conditions hold</SelectItem>
              <SelectItem value="any">any condition holds</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <ol className="space-y-2">
        {conditions.map((c, i) => (
          <li key={i} className="rounded-md border bg-background p-3">
            <ConditionRow
              index={i}
              condition={c}
              error={errors[`conditions.${i}`]}
              count={conditions.length}
              onChange={(next) => set(conditions.map((x, j) => (j === i ? next : x)))}
              onMove={(by) => set(moveItem(conditions, i, by))}
              onRemove={() => set(conditions.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ol>
      {errors.conditions && <FieldError>{errors.conditions}</FieldError>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={conditions.length >= MAX_CONDITIONS}
        onClick={() => set([...conditions, blankCondition()])}
      >
        <PlusIcon /> Add condition
      </Button>
    </div>
  );
}

function ConditionRow({
  index,
  condition: c,
  error,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  condition: ConditionDraft;
  error?: string;
  count: number;
  onChange: (c: ConditionDraft) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const id = (part: string) => `condition-${index}-${part}`;
  const known = factFor(c.field);
  const ops = opsFor(c.kind);
  const fieldItems = [
    ...FACTS.map((f) => ({ value: f.path, label: f.label })),
    { value: CUSTOM, label: "Other fact…" },
  ];

  return (
    <div className="space-y-2" role="group" aria-label={`Condition ${n}`}>
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-56">
          <FieldLabel htmlFor={id("field")} className="text-xs">
            Fact
          </FieldLabel>
          <Select
            items={fieldItems}
            value={known ? c.field : CUSTOM}
            onValueChange={(v) => v && onChange(v === CUSTOM ? { ...c, field: "event." } : setConditionField(c, v))}
          >
            <SelectTrigger id={id("field")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fieldItems.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {!known && (
          <>
            <Field className="w-48">
              <FieldLabel htmlFor={id("path")} className="text-xs">
                Path
              </FieldLabel>
              <Input
                id={id("path")}
                className="font-mono text-xs"
                value={c.field}
                placeholder="event.segmentId"
                aria-invalid={!!error || undefined}
                onChange={(e) => onChange(setConditionField(c, e.target.value))}
              />
            </Field>
            <Field className="w-32">
              <FieldLabel htmlFor={id("kind")} className="text-xs">
                Value type
              </FieldLabel>
              <Select
                items={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
                value={c.kind}
                onValueChange={(v) => v && onChange(setConditionKind(c, v as ValueKind))}
              >
                <SelectTrigger id={id("kind")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
        <Field className="w-40">
          <FieldLabel htmlFor={id("op")} className="text-xs">
            Test
          </FieldLabel>
          <Select
            items={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
            value={c.op}
            onValueChange={(v) =>
              v && onChange({ ...c, op: v as Op, value: v === "exists" ? "true" : c.op === "exists" ? "" : c.value })
            }
          >
            <SelectTrigger id={id("op")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ops.map((op) => (
                <SelectItem key={op} value={op}>
                  {OP_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="min-w-40 flex-1">
          <FieldLabel htmlFor={id("value")} className="text-xs">
            Value
          </FieldLabel>
          <ValueInput
            id={id("value")}
            condition={c}
            invalid={!!error}
            onChange={(value) => onChange({ ...c, value })}
          />
        </Field>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move condition ${n} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move condition ${n} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove condition ${n}`} onClick={onRemove}>
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {known?.hint && <FieldDescription className="text-xs">{known.hint}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function ValueInput({
  id,
  condition: c,
  invalid,
  onChange,
}: {
  id: string;
  condition: ConditionDraft;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const choice = (items: { value: string; label: string }[]) => (
    <Select items={items} value={c.value || null} onValueChange={(v) => v !== null && onChange(String(v))}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined}>
        <SelectValue placeholder="Choose" />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  if (c.op === "exists")
    return choice([
      { value: "true", label: "Yes, it has a value" },
      { value: "false", label: "No, it's empty" },
    ]);
  if (c.kind === "boolean")
    return choice([
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ]);
  const list = c.op === "in" || c.op === "not_in";
  const options = factFor(c.field)?.options;
  if (options && !list) return choice(options.map((o) => ({ value: o, label: o })));
  return (
    <Input
      id={id}
      value={c.value}
      inputMode={c.kind === "number" ? "decimal" : undefined}
      placeholder={list ? "Comma-separated, e.g. BD, IN" : c.kind === "number" ? "0" : ""}
      aria-invalid={invalid || undefined}
      className={c.kind === "number" ? "font-mono" : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
