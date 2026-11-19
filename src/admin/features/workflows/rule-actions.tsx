"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTION_TYPES,
  ACTIONS,
  blankAction,
  MAX_ACTIONS,
  moveItem,
  setActionType,
  type ActionDraft,
  type ActionType,
  type FormErrors,
} from "./workflow-rules";

const TYPE_ITEMS = ACTION_TYPES.map((t) => ({ value: t, label: ACTIONS[t].label }));

// The actions a matching event runs, in order. A failing action doesn't stop the next one.
export function RuleActions({
  actions,
  errors,
  onChange,
}: {
  actions: ActionDraft[];
  errors: FormErrors;
  onChange: (actions: ActionDraft[]) => void;
}) {
  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {actions.map((a, i) => (
          <li key={i} className="rounded-md border bg-background p-3">
            <ActionCard
              index={i}
              action={a}
              count={actions.length}
              errors={errors}
              onChange={(next) => onChange(actions.map((x, j) => (j === i ? next : x)))}
              onMove={(by) => onChange(moveItem(actions, i, by))}
              onRemove={() => onChange(actions.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ol>
      {errors.actions && <FieldError>{errors.actions}</FieldError>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={actions.length >= MAX_ACTIONS}
        onClick={() => onChange([...actions, blankAction()])}
      >
        <PlusIcon /> Add action
      </Button>
    </div>
  );
}

function ActionCard({
  index,
  action: a,
  count,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  action: ActionDraft;
  count: number;
  errors: FormErrors;
  onChange: (a: ActionDraft) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const spec = ACTIONS[a.type];
  const id = (part: string) => `action-${index}-${part}`;
  return (
    <div className="space-y-3" role="group" aria-label={`Action ${n}`}>
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-64">
          <FieldLabel htmlFor={id("type")} className="text-xs">
            Action {n}
          </FieldLabel>
          <Select
            items={TYPE_ITEMS}
            value={a.type}
            onValueChange={(v) => v && onChange(setActionType(a, v as ActionType))}
          >
            <SelectTrigger id={id("type")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ITEMS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <p className="flex-1 pb-1.5 text-xs text-muted-foreground">
          {spec.description}
          {spec.needs && ` Fails for events without ${spec.needs === "order" ? "an order" : `a ${spec.needs}`}.`}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move action ${n} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Move action ${n} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDownIcon />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove action ${n}`} onClick={onRemove}>
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {spec.fields.map((f) => {
          const error = errors[`actions.${index}.${f.key}`];
          const props = {
            id: id(f.key),
            value: a.values[f.key] ?? "",
            "aria-invalid": error ? true : undefined,
            onChange: (e: { target: { value: string } }) =>
              onChange({ ...a, values: { ...a.values, [f.key]: e.target.value } }),
          };
          return (
            <Field key={f.key} className={f.input === "textarea" ? "sm:col-span-2" : undefined}>
              <FieldLabel htmlFor={props.id}>{f.label}</FieldLabel>
              {f.input === "textarea" ? (
                <Textarea {...props} rows={3} maxLength={f.max} />
              ) : (
                <Input
                  {...props}
                  type={f.input === "url" ? "url" : "text"}
                  maxLength={f.input === "emails" ? undefined : f.max}
                  placeholder={
                    f.input === "url"
                      ? "https://example.com/hook"
                      : f.input === "emails"
                        ? "ops@example.com"
                        : undefined
                  }
                  className={f.input === "url" ? "font-mono text-xs" : undefined}
                />
              )}
              {f.hint && <FieldDescription className="text-xs">{f.hint}</FieldDescription>}
              {error && <FieldError>{error}</FieldError>}
            </Field>
          );
        })}
      </div>
    </div>
  );
}
