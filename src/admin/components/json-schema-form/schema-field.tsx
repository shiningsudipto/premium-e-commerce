"use client";

import { useId, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { bounds, describeBounds, emptyValue, fieldKind, humanize, type JsonSchema } from "./schema";

// Renders one value of a JSON Schema as form controls (spec: settings, block props and adapter
// config all describe themselves this way). Controlled: the parent owns the value.

export type SchemaFieldProps = {
  schema: JsonSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  description?: string;
  errors?: Record<string, string>;
  path?: string;
  disabled?: boolean;
  secret?: boolean;
};

export function SchemaField(props: SchemaFieldProps) {
  const { schema, value, onChange, label, description, errors = {}, path = "", disabled, secret } = props;
  const id = useId();
  const kind = fieldKind(schema);
  const error = errors[path];
  const hint = [description ?? schema.description, kind.kind === "number" ? describeBounds(schema) : null]
    .filter(Boolean)
    .join(" · ");
  const invalid = error ? true : undefined;

  switch (kind.kind) {
    case "boolean":
      return (
        <Field orientation="horizontal" data-invalid={invalid}>
          <Switch id={id} checked={value === true} onCheckedChange={(v) => onChange(v)} disabled={disabled} />
          <div className="space-y-0.5">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {hint && <FieldDescription>{hint}</FieldDescription>}
            <FieldError>{error}</FieldError>
          </div>
        </Field>
      );

    case "enum":
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select value={String(value ?? "")} onValueChange={(v) => onChange(v)} disabled={disabled}>
            <SelectTrigger id={id} className="w-full sm:w-72" aria-invalid={invalid}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kind.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {humanize(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hint && <FieldDescription>{hint}</FieldDescription>}
          <FieldError>{error}</FieldError>
        </Field>
      );

    case "text": {
      const common = {
        id,
        value: typeof value === "string" ? value : "",
        disabled,
        "aria-invalid": invalid,
        maxLength: schema.maxLength,
      };
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {kind.multiline && !secret ? (
            <Textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <Input
              {...common}
              type={secret ? "password" : kind.inputType}
              autoComplete="off"
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {hint && <FieldDescription>{hint}</FieldDescription>}
          <FieldError>{error}</FieldError>
        </Field>
      );
    }

    case "number": {
      const { min, max } = bounds(schema);
      return (
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            id={id}
            type="number"
            inputMode={kind.integer ? "numeric" : "decimal"}
            step={kind.integer ? 1 : "any"}
            min={min}
            max={max}
            className="w-full font-mono sm:w-48"
            value={typeof value === "number" && !Number.isNaN(value) ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
            disabled={disabled}
            aria-invalid={invalid}
          />
          {hint && <FieldDescription>{hint}</FieldDescription>}
          <FieldError>{error}</FieldError>
        </Field>
      );
    }

    case "enum-list": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <FieldSet data-invalid={invalid}>
          <FieldLegend variant="label">{label}</FieldLegend>
          {hint && <FieldDescription>{hint}</FieldDescription>}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {kind.options.map((option) => (
              <Field key={option} orientation="horizontal" className="w-auto">
                <Checkbox
                  id={`${id}-${option}`}
                  checked={selected.includes(option)}
                  disabled={disabled}
                  onCheckedChange={(on) => onChange(on ? [...selected, option] : selected.filter((s) => s !== option))}
                />
                <FieldLabel htmlFor={`${id}-${option}`} className="font-normal">
                  {humanize(option)}
                </FieldLabel>
              </Field>
            ))}
          </div>
          <FieldError>{error}</FieldError>
        </FieldSet>
      );
    }

    case "string-list":
      return (
        <StringListField
          id={id}
          label={label}
          hint={hint}
          error={error}
          disabled={disabled}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );

    case "nullable": {
      const isSet = value !== null && value !== undefined;
      return (
        <FieldSet>
          <div className="flex items-center justify-between gap-4">
            <FieldLegend variant="label">{label}</FieldLegend>
            <Field orientation="horizontal" className="w-auto">
              <Switch
                id={`${id}-set`}
                checked={isSet}
                disabled={disabled}
                onCheckedChange={(on) => onChange(on ? emptyValue(kind.inner) : null)}
              />
              <FieldLabel htmlFor={`${id}-set`} className="font-normal text-muted-foreground">
                {isSet ? "Set" : "Not set"}
              </FieldLabel>
            </Field>
          </div>
          {isSet ? (
            <SchemaField {...props} schema={kind.inner} label={`${label} value`} description={hint} />
          ) : (
            hint && <FieldDescription>{hint}</FieldDescription>
          )}
        </FieldSet>
      );
    }

    case "object":
      return (
        <FieldSet className="rounded-lg border p-4">
          <FieldLegend variant="label">{label}</FieldLegend>
          {hint && <FieldDescription>{hint}</FieldDescription>}
          {Object.entries(kind.properties).map(([key, sub]) => {
            const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
            return (
              <SchemaField
                key={key}
                schema={sub}
                value={record[key]}
                label={`${sub.title ?? humanize(key)}${kind.required.includes(key) ? "" : " (optional)"}`}
                errors={errors}
                path={`${path}${path ? "." : ""}${key}`}
                disabled={disabled}
                onChange={(next) => onChange({ ...record, [key]: next })}
              />
            );
          })}
        </FieldSet>
      );

    case "json":
      return (
        <JsonField
          id={id}
          label={label}
          hint={hint}
          error={error}
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      );
  }
}

type SimpleFieldProps<T> = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  value: T;
  onChange: (value: unknown) => void;
};

// Free-text list, e.g. search stop words: type and press Enter (or paste a comma-separated list).
function StringListField({ id, label, hint, error, disabled, value, onChange }: SimpleFieldProps<string[]>) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length) onChange([...new Set([...value, ...items])]);
    setDraft("");
  };
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={`${label} items`}>
          {value.map((item) => (
            <li key={item}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {item}
                <button
                  type="button"
                  disabled={disabled}
                  className="rounded-sm opacity-60 hover:opacity-100"
                  aria-label={`Remove ${item}`}
                  onClick={() => onChange(value.filter((v) => v !== item))}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder="Add an item"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={disabled || !draft.trim()}>
          <PlusIcon /> Add
        </Button>
      </div>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

// Fallback for shapes without a dedicated control: edit as JSON, parsed on every change.
function JsonField({ id, label, hint, error, disabled, value, onChange }: SimpleFieldProps<unknown>) {
  const [text, setText] = useState(() => JSON.stringify(value ?? null, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  return (
    <Field data-invalid={error || parseError ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={6}
        className="font-mono text-xs"
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            setParseError(null);
          } catch {
            setParseError("Not valid JSON yet");
          }
        }}
      />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError>{parseError ?? error}</FieldError>
    </Field>
  );
}
