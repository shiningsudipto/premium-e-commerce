"use client";

import { useId, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "../../components/can";
import { SchemaField, type CustomFieldProps } from "../../components/json-schema-form/schema-field";
import {
  fromLocalDateTime,
  humanize,
  toLocalDateTime,
  type JsonSchema,
} from "../../components/json-schema-form/schema";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import {
  useGetV1AdminMarketsQuery,
  useGetV1AdminMediaQuery,
  useGetV1AdminPagesQuery,
  useGetV1AdminSegmentsQuery,
} from "../../store/api.generated";
import { blockSchema, type Block, type BlockDef, type BlockSettings } from "./block-tree";

// Edits the selected block: its props with a form generated from the block's JSON Schema, and
// the settings every block shares (visibility, audience, schedule, experiment).

type Props = {
  block: Block;
  def: BlockDef | undefined;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (block: Block) => void;
};

export function BlockInspector({ block, def, errors, readOnly, onChange }: Props) {
  const settingsErrors = Object.keys(errors).some((k) => k.startsWith("settings."));
  const propErrors = Object.keys(errors).some((k) => k !== "" && !k.startsWith("settings."));
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">{def?.label ?? block.type}</h2>
        <p className="font-mono text-[11px] text-muted-foreground">{block.type}</p>
      </div>
      {errors[""] && (
        <Alert variant="destructive">
          <AlertDescription>{errors[""]}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content{propErrors ? " (errors)" : ""}</TabsTrigger>
          <TabsTrigger value="settings">Visibility{settingsErrors ? " (errors)" : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="pt-3">
          {def ? (
            <BlockPropsForm
              schema={blockSchema(def)}
              props={block.props ?? {}}
              errors={errors}
              readOnly={readOnly}
              onChange={(props) => onChange({ ...block, props })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              This block type isn&apos;t in the block library any more. The storefront skips it; remove it or leave it
              as it is.
            </p>
          )}
        </TabsContent>
        <TabsContent value="settings" className="pt-3">
          <BlockSettingsForm
            settings={block.settings ?? {}}
            errors={errors}
            readOnly={readOnly}
            onChange={(settings) => onChange({ ...block, settings })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BlockPropsForm({
  schema,
  props,
  errors,
  readOnly,
  onChange,
}: {
  schema: JsonSchema;
  props: Record<string, unknown>;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (props: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(schema.properties ?? {});
  if (!entries.length) return <p className="text-sm text-muted-foreground">This block has no content to edit.</p>;
  return (
    <div className="space-y-4">
      {entries.map(([key, sub]) => (
        <SchemaField
          key={key}
          schema={sub}
          value={props[key]}
          label={`${sub.title ?? humanize(key)}${schema.required?.includes(key) ? "" : " (optional)"}`}
          path={key}
          errors={errors}
          disabled={readOnly}
          renderField={renderBlockField}
          onChange={(next) => onChange({ ...props, [key]: next })}
        />
      ))}
    </div>
  );
}

// A schema with no type at all is the API's free-form value: rich text.
const isFreeform = (schema: JsonSchema) =>
  !schema.type && !schema.enum && !schema.anyOf && !schema.oneOf && !schema.properties && schema.const === undefined;

// Controls the generated form doesn't know about, chosen by field name and shape.
function renderBlockField(field: CustomFieldProps) {
  const { schema, name } = field;
  if (schema.type === "string" && (name === "mediaId" || name.endsWith("MediaId"))) return <MediaField {...field} />;
  if (schema.type === "string" && name === "sectionHandle") return <SectionHandleField {...field} />;
  if (isFreeform(schema) && (field.value === null || field.value === undefined || typeof field.value === "string"))
    return <RichTextField {...field} />;
  if (schema.type === "string" && !schema.enum && !schema.format && (schema.maxLength ?? 0) >= 500)
    return <LongTextField {...field} code={name === "html"} />;
  return null;
}

function LongTextField({
  value,
  onChange,
  label,
  error,
  disabled,
  schema,
  code,
}: CustomFieldProps & { code: boolean }) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={code ? 10 : 3}
        className={code ? "font-mono text-xs" : undefined}
        maxLength={schema.maxLength}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {code && <FieldDescription>Runs on the storefront as-is. Only add HTML from sources you trust.</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function RichTextField({ value, onChange, label, error, disabled }: CustomFieldProps) {
  const id = useId();
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={6}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
      <FieldDescription>Plain text. Leave a blank line between paragraphs.</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function SectionHandleField({ value, onChange, label, error, disabled }: CustomFieldProps) {
  const id = useId();
  const sections = useGetV1AdminPagesQuery({ kind: "SECTION", limit: 100 });
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        list={`${id}-list`}
        className="font-mono"
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      <datalist id={`${id}-list`}>
        {sections.data?.items.map((s) => (
          <option key={s.id} value={s.handle}>
            {s.title}
          </option>
        ))}
      </datalist>
      <FieldDescription>
        The handle of a global section. Its published blocks are shown here.
        {sections.data && sections.data.items.length === 0 && " No global sections exist yet."}
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

// A media ID, typed or picked from the library (the list needs products.read).
function MediaField({ value, onChange, label, error, disabled }: CustomFieldProps) {
  const id = useId();
  const canBrowse = useCan("products.read");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ id: string; url: string; alt: string | null } | null>(null);
  const current = typeof value === "string" ? value : "";
  const preview = picked && picked.id === current ? picked : null;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
          <img src={preview.url} alt={preview.alt ?? ""} className="size-9 shrink-0 rounded-md border object-cover" />
        )}
        <Input
          id={id}
          className="font-mono"
          value={current}
          disabled={disabled}
          placeholder="Media ID"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        {canBrowse && !disabled && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button type="button" variant="outline" size="sm">
                  <ImageIcon /> Choose
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choose from the media library</DialogTitle>
                <DialogDescription>Upload new files from a product&apos;s media section.</DialogDescription>
              </DialogHeader>
              {open && (
                <MediaGrid
                  selected={current}
                  onPick={(m) => {
                    setPicked(m);
                    onChange(m.id);
                    setOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
      <FieldDescription>
        {canBrowse ? "Pick an image, or paste a media ID." : "Paste the ID of an item in the media library."}
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function MediaGrid({
  selected,
  onPick,
}: {
  selected: string;
  onPick: (m: { id: string; url: string; alt: string | null }) => void;
}) {
  const pages = useCursorPages();
  const media = useGetV1AdminMediaQuery({ limit: 24, ...(pages.cursor ? { cursor: pages.cursor } : {}) });
  const images = media.data?.items.filter((m) => m.mimeType.startsWith("image/"));
  return (
    <>
      {media.isLoading && <Skeleton className="h-40 w-full" />}
      {images?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No images here.</p>}
      <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
        {images?.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={`${m.alt ?? m.key}${m.id === selected ? " (selected)" : ""}`}
            aria-pressed={m.id === selected}
            onClick={() => onPick({ id: m.id, url: m.url, alt: m.alt })}
            className="aspect-square overflow-hidden rounded-md border outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host */}
            <img src={m.url} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
      {(pages.hasPrevious || media.data?.nextCursor) && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={!pages.hasPrevious} onClick={pages.previous}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!media.data?.nextCursor}
            onClick={() => pages.next(media.data?.nextCursor)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

// ---- settings --------------------------------------------------------------------------------

const DEVICES = ["mobile", "tablet", "desktop"] as const;
const ANY = "any";

function tri(value: boolean | undefined): string {
  return value === undefined ? ANY : value ? "yes" : "no";
}
const fromTri = (v: string | null): boolean | undefined => (v === "yes" ? true : v === "no" ? false : undefined);

function BlockSettingsForm({
  settings,
  errors,
  readOnly,
  onChange,
}: {
  settings: BlockSettings;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (settings: BlockSettings) => void;
}) {
  const id = useId();
  const canMarkets = useCan("settings.read");
  const canSegments = useCan("customers.read");
  const markets = useGetV1AdminMarketsQuery({}, { skip: !canMarkets });
  const segments = useGetV1AdminSegmentsQuery({}, { skip: !canSegments });
  const audience = settings.audience ?? {};
  const setAudience = (patch: Partial<NonNullable<BlockSettings["audience"]>>) =>
    onChange({ ...settings, audience: { ...audience, ...patch } });
  const hideOn = settings.hideOn ?? [];
  const schedule = settings.schedule ?? {};
  const experiment = settings.experiment ?? { key: "", variant: "" };

  return (
    <div className="space-y-5">
      <FieldSet>
        <FieldLegend variant="label">Hide on</FieldLegend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {DEVICES.map((d) => (
            <Field key={d} orientation="horizontal" className="w-auto">
              <Checkbox
                id={`${id}-hide-${d}`}
                checked={hideOn.includes(d)}
                disabled={readOnly}
                onCheckedChange={(on) =>
                  onChange({ ...settings, hideOn: on ? [...hideOn, d] : hideOn.filter((x) => x !== d) })
                }
              />
              <FieldLabel htmlFor={`${id}-hide-${d}`} className="font-normal">
                {humanize(d)}
              </FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Audience</FieldLegend>
        <FieldDescription>Leave everything open to show the block to every visitor.</FieldDescription>
        <ChoiceList
          legend="Markets"
          hint="Only in these markets."
          disabled={readOnly}
          options={markets.data?.map((m) => ({ value: m.handle, label: `${m.name} (${m.handle})` }))}
          value={audience.markets ?? []}
          onChange={(markets) => setAudience({ markets })}
        />
        <ChoiceList
          legend="Customer segments"
          hint="Only for signed-in customers in any of these segments."
          disabled={readOnly}
          options={segments.data?.map((s) => ({ value: s.id, label: s.name }))}
          value={audience.segmentIds ?? []}
          onChange={(segmentIds) => setAudience({ segmentIds })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-signed-in`}>Signed in</FieldLabel>
            <Select
              value={tri(audience.loggedIn)}
              disabled={readOnly}
              onValueChange={(v) => setAudience({ loggedIn: fromTri(v as string | null) })}
            >
              <SelectTrigger id={`${id}-signed-in`} className="w-full">
                <SelectValue>
                  {{ any: "Anyone", yes: "Signed-in shoppers", no: "Signed-out shoppers" }[tri(audience.loggedIn)]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Anyone</SelectItem>
                <SelectItem value="yes">Signed-in shoppers</SelectItem>
                <SelectItem value="no">Signed-out shoppers</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-new`}>New visitors</FieldLabel>
            <Select
              value={tri(audience.newVisitors)}
              disabled={readOnly}
              onValueChange={(v) => setAudience({ newVisitors: fromTri(v as string | null) })}
            >
              <SelectTrigger id={`${id}-new`} className="w-full">
                <SelectValue>
                  {
                    { any: "Anyone", yes: "New visitors only", no: "Returning visitors only" }[
                      tri(audience.newVisitors)
                    ]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Anyone</SelectItem>
                <SelectItem value="yes">New visitors only</SelectItem>
                <SelectItem value="no">Returning visitors only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FieldSet>

      <FieldSet data-invalid={errors["settings.schedule"] ? true : undefined}>
        <FieldLegend variant="label">Schedule</FieldLegend>
        <FieldDescription>Show the block only within this window (your local time).</FieldDescription>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-starts`}>Starts</FieldLabel>
            <Input
              id={`${id}-starts`}
              type="datetime-local"
              value={toLocalDateTime(schedule.startsAt)}
              disabled={readOnly}
              onChange={(e) =>
                onChange({ ...settings, schedule: { ...schedule, startsAt: fromLocalDateTime(e.target.value) } })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-ends`}>Ends</FieldLabel>
            <Input
              id={`${id}-ends`}
              type="datetime-local"
              value={toLocalDateTime(schedule.endsAt)}
              disabled={readOnly}
              onChange={(e) =>
                onChange({ ...settings, schedule: { ...schedule, endsAt: fromLocalDateTime(e.target.value) } })
              }
            />
          </Field>
        </div>
        <FieldError>{errors["settings.schedule"]}</FieldError>
      </FieldSet>

      <FieldSet data-invalid={errors["settings.experiment"] ? true : undefined}>
        <FieldLegend variant="label">Experiment</FieldLegend>
        <FieldDescription>
          Show the block only to visitors in this variant of an A/B test. Until the storefront assigns variants, blocks
          with an experiment stay hidden.
        </FieldDescription>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-exp-key`}>Experiment key</FieldLabel>
            <Input
              id={`${id}-exp-key`}
              className="font-mono"
              value={experiment.key}
              disabled={readOnly}
              onChange={(e) => onChange({ ...settings, experiment: { ...experiment, key: e.target.value } })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-exp-variant`}>Variant</FieldLabel>
            <Input
              id={`${id}-exp-variant`}
              className="font-mono"
              value={experiment.variant}
              disabled={readOnly}
              onChange={(e) => onChange({ ...settings, experiment: { ...experiment, variant: e.target.value } })}
            />
          </Field>
        </div>
        <FieldError>{errors["settings.experiment"]}</FieldError>
      </FieldSet>
    </div>
  );
}

// Checkboxes when the options can be listed; otherwise a free list of values (IDs/handles).
function ChoiceList({
  legend,
  hint,
  options,
  value,
  disabled,
  onChange,
}: {
  legend: string;
  hint: string;
  options: { value: string; label: string }[] | undefined;
  value: string[];
  disabled: boolean;
  onChange: (value: string[]) => void;
}) {
  const id = useId();
  if (!options) {
    return (
      <SchemaField
        schema={{ type: "array", items: { type: "string" } }}
        value={value}
        label={legend}
        description={`${hint} Enter ${legend === "Markets" ? "market handles" : "segment IDs"}.`}
        disabled={disabled}
        onChange={(v) => onChange(v as string[])}
      />
    );
  }
  const unknown = value.filter((v) => !options.some((o) => o.value === v));
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldDescription>{hint}</FieldDescription>
      {options.length === 0 && <p className="text-xs text-muted-foreground">None exist yet.</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {[...options, ...unknown.map((v) => ({ value: v, label: `${v} (not found)` }))].map((o) => (
          <Field key={o.value} orientation="horizontal" className="w-auto">
            <Checkbox
              id={`${id}-${o.value}`}
              checked={value.includes(o.value)}
              disabled={disabled}
              onCheckedChange={(on) => onChange(on ? [...value, o.value] : value.filter((v) => v !== o.value))}
            />
            <FieldLabel htmlFor={`${id}-${o.value}`} className="font-normal">
              {o.label}
            </FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}
