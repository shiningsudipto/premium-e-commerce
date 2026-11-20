"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CustomFieldProps } from "../../components/json-schema-form/schema-field";

// Editor for the "Text section" block's elements: each element is a card with only the fields its
// kind needs (eyebrow, heading, text, quote, details, button), reorderable, with "add" buttons for
// each kind. Values match premium-ec-backend's content_stack schema.

type Row = { label: string; value: string; href?: string };
export type StackElement = {
  kind: Kind;
  text?: string;
  size?: "xl" | "lg" | "md";
  tone?: "normal" | "muted" | "note";
  author?: string;
  rows?: Row[];
  label?: string;
  href?: string;
  style?: "primary" | "secondary" | "link";
  buttonSize?: "md" | "lg";
};
type Kind = "eyebrow" | "heading" | "text" | "quote" | "details" | "button";

const MAX = 20;

export const KIND_INFO: Record<Kind, { label: string; hint: string; make: () => StackElement }> = {
  eyebrow: { label: "Eyebrow", hint: "Small uppercase label with a line", make: () => ({ kind: "eyebrow", text: "" }) },
  heading: { label: "Heading", hint: "Big serif heading", make: () => ({ kind: "heading", text: "", size: "lg" }) },
  text: { label: "Text", hint: "Paragraphs", make: () => ({ kind: "text", text: "", tone: "muted" }) },
  quote: { label: "Quote", hint: "Italic quote with a rule", make: () => ({ kind: "quote", text: "", author: "" }) },
  details: {
    label: "Details",
    hint: "Label / value rows",
    make: () => ({ kind: "details", rows: [{ label: "Phone", value: "" }] }),
  },
  button: {
    label: "Button",
    hint: "Button or text link",
    make: () => ({ kind: "button", label: "", href: "", style: "primary", buttonSize: "md" }),
  },
};
const KINDS = Object.keys(KIND_INFO) as Kind[];

function Choice<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} disabled={disabled} onValueChange={(v) => v && onChange(v as T)}>
        <SelectTrigger id={id} size="sm" className="w-full">
          <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function StackElementsEditor({ value, onChange, label, error, disabled, path }: CustomFieldProps) {
  const elements = (Array.isArray(value) ? value : []) as StackElement[];
  const set = (next: StackElement[]) => onChange(next);
  const update = (i: number, patch: Partial<StackElement>) =>
    set(elements.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, by: number) => {
    const next = [...elements];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item!);
    set(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          The pieces of this section, top to bottom. Add what you need; each piece has its own style.
        </p>
      </div>

      {elements.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          Empty. Add a heading or text below.
        </p>
      )}

      <ol className="space-y-3">
        {elements.map((el, i) => {
          const id = `${path}-${i}`;
          const info = KIND_INFO[el.kind] ?? KIND_INFO.text;
          return (
            <li key={i} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-1.5">
                <span className="text-sm font-medium">{info.label}</span>
                <span className="text-xs text-muted-foreground">{info.hint}</span>
                {!disabled && (
                  <div className="ml-auto flex gap-0.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === 0}
                      aria-label={`Move ${info.label} up`}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={i === elements.length - 1}
                      aria-label={`Move ${info.label} down`}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 hover:text-destructive"
                      aria-label={`Remove ${info.label}`}
                      onClick={() => set(elements.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <ElementFields id={id} el={el} disabled={disabled} onChange={(patch) => update(i, patch)} />
              </div>
            </li>
          );
        })}
      </ol>

      {!disabled && elements.length < MAX && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Add a piece">
          {KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => set([...elements, KIND_INFO[k].make()])}
            >
              <PlusIcon /> {KIND_INFO[k].label}
            </Button>
          ))}
        </div>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function ElementFields({
  id,
  el,
  disabled,
  onChange,
}: {
  id: string;
  el: StackElement;
  disabled?: boolean;
  onChange: (patch: Partial<StackElement>) => void;
}) {
  switch (el.kind) {
    case "eyebrow":
      return (
        <Field>
          <FieldLabel htmlFor={`${id}-text`}>Text</FieldLabel>
          <Input
            id={`${id}-text`}
            value={el.text ?? ""}
            maxLength={60}
            disabled={disabled}
            placeholder="e.g. About us"
            onChange={(e) => onChange({ text: e.target.value })}
          />
          <FieldDescription>Shown in small capitals with a short line before it.</FieldDescription>
        </Field>
      );
    case "heading":
      return (
        <>
          <Field>
            <FieldLabel htmlFor={`${id}-text`}>Heading</FieldLabel>
            <Textarea
              id={`${id}-text`}
              rows={2}
              value={el.text ?? ""}
              maxLength={300}
              disabled={disabled}
              placeholder="Made to be *repaired,* not replaced."
              onChange={(e) => onChange({ text: e.target.value })}
            />
            <FieldDescription>
              Put <code className="rounded bg-muted px-1">*stars*</code> around words to show them in italics and the
              brand colour. Press Enter to start a new line.
            </FieldDescription>
          </Field>
          <Choice
            id={`${id}-size`}
            label="Size"
            value={el.size ?? "lg"}
            disabled={disabled}
            onChange={(size) => onChange({ size })}
            options={[
              { value: "xl", label: "Extra large (page opening)" },
              { value: "lg", label: "Large (section heading)" },
              { value: "md", label: "Medium (card or small section)" },
            ]}
          />
        </>
      );
    case "text":
      return (
        <>
          <Field>
            <FieldLabel htmlFor={`${id}-text`}>Text</FieldLabel>
            <Textarea
              id={`${id}-text`}
              rows={4}
              value={el.text ?? ""}
              maxLength={3000}
              disabled={disabled}
              onChange={(e) => onChange({ text: e.target.value })}
            />
            <FieldDescription>Leave a blank line between paragraphs.</FieldDescription>
          </Field>
          <Choice
            id={`${id}-tone`}
            label="Style"
            value={el.tone ?? "muted"}
            disabled={disabled}
            onChange={(tone) => onChange({ tone })}
            options={[
              { value: "muted", label: "Body text (soft colour)" },
              { value: "normal", label: "Body text (full colour)" },
              { value: "note", label: "Small note" },
            ]}
          />
        </>
      );
    case "quote":
      return (
        <>
          <Field>
            <FieldLabel htmlFor={`${id}-text`}>Quote</FieldLabel>
            <Textarea
              id={`${id}-text`}
              rows={3}
              value={el.text ?? ""}
              maxLength={600}
              disabled={disabled}
              placeholder="A short line from the founder…"
              onChange={(e) => onChange({ text: e.target.value })}
            />
            <FieldDescription>Quotation marks are added for you.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-author`}>Who said it (optional)</FieldLabel>
            <Input
              id={`${id}-author`}
              value={el.author ?? ""}
              maxLength={120}
              disabled={disabled}
              placeholder="e.g. Rafiq Hasan, founder"
              onChange={(e) => onChange({ author: e.target.value })}
            />
          </Field>
        </>
      );
    case "details": {
      const rows = el.rows ?? [];
      const setRows = (next: Row[]) => onChange({ rows: next });
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Rows like Workshop, Phone, Email, Hours. Add a link to make the value clickable (e.g.{" "}
            <code className="rounded bg-muted px-1">tel:+8801…</code> or{" "}
            <code className="rounded bg-muted px-1">mailto:hello@…</code>).
          </p>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input
                aria-label={`Row ${i + 1} label`}
                placeholder="Label"
                value={r.label}
                maxLength={60}
                disabled={disabled}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Input
                aria-label={`Row ${i + 1} value`}
                placeholder="Value"
                value={r.value}
                maxLength={300}
                disabled={disabled}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              <Input
                aria-label={`Row ${i + 1} link (optional)`}
                placeholder="Link (optional)"
                value={r.href ?? ""}
                maxLength={500}
                disabled={disabled}
                onChange={(e) =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, href: e.target.value || undefined } : x)))
                }
              />
              {!disabled && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Remove row ${i + 1}`}
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          ))}
          {!disabled && rows.length < 12 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRows([...rows, { label: "", value: "" }])}
            >
              <PlusIcon /> Add row
            </Button>
          )}
        </div>
      );
    }
    case "button":
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-label`}>Label</FieldLabel>
              <Input
                id={`${id}-label`}
                value={el.label ?? ""}
                maxLength={60}
                disabled={disabled}
                placeholder="e.g. Shop the collection"
                onChange={(e) => onChange({ label: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-href`}>Link</FieldLabel>
              <Input
                id={`${id}-href`}
                value={el.href ?? ""}
                maxLength={500}
                disabled={disabled}
                placeholder="/products or https://…"
                onChange={(e) => onChange({ href: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              id={`${id}-style`}
              label="Style"
              value={el.style ?? "primary"}
              disabled={disabled}
              onChange={(style) => onChange({ style })}
              options={[
                { value: "primary", label: "Filled button" },
                { value: "secondary", label: "Outlined button" },
                { value: "link", label: "Underlined text link" },
              ]}
            />
            <Choice
              id={`${id}-bsize`}
              label="Size"
              value={el.buttonSize ?? "md"}
              disabled={disabled || el.style === "link"}
              onChange={(buttonSize) => onChange({ buttonSize })}
              options={[
                { value: "md", label: "Medium" },
                { value: "lg", label: "Large" },
              ]}
            />
          </div>
        </>
      );
    default:
      return null;
  }
}
