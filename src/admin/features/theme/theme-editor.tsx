"use client";

import { useState } from "react";
import { CheckCircle2Icon, RadioTowerIcon, TriangleAlertIcon, Undo2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminChannelsQuery,
  usePostV1AdminThemesIdActivateMutation,
  usePutV1AdminThemesIdMutation,
  type PutV1AdminThemesIdApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { checkContrast, formatRatio, normalizeHex, type Palette, type PaletteKey } from "./contrast";
import { ThemePreview } from "./theme-preview";
import type { Theme } from "./theme-screen";
import {
  BUTTON_RADII,
  PALETTE_FIELDS,
  paletteFor,
  setColor,
  setDarkMode,
  validateTokens,
  type ButtonRadius,
  type ColorMode,
  type ThemeTokens,
} from "./tokens";

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LABELS = Object.fromEntries(PALETTE_FIELDS.map((f) => [f.key, f.label])) as Record<PaletteKey, string>;

export function ThemeEditor({ theme, themes }: { theme: Theme; themes: Theme[] }) {
  const canCss = useCan("theme.css.write");
  const [name, setName] = useState(theme.name);
  const [handle, setHandle] = useState(theme.handle);
  const [tokens, setTokens] = useState<ThemeTokens>(theme.tokens);
  const [customCss, setCustomCss] = useState(theme.customCss ?? "");
  const [mode, setMode] = useState<ColorMode>("light");
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({});
  const [saveTheme, save] = usePutV1AdminThemesIdMutation();

  const tokenErrors = validateTokens(tokens);
  const handleValid = HANDLE.test(handle);
  const invalid = !name.trim() || !handleValid || Object.keys(tokenErrors).length > 0;
  const dirty =
    name !== theme.name ||
    handle !== theme.handle ||
    JSON.stringify(tokens) !== JSON.stringify(theme.tokens) ||
    (canCss && customCss !== (theme.customCss ?? ""));
  const activeMode: ColorMode = mode === "dark" && tokens.dark ? "dark" : "light";
  const results = checkContrast(paletteFor(tokens, activeMode));
  const failing = results.filter((r) => !r.passes);

  function submit() {
    if (invalid) return;
    const body: PutV1AdminThemesIdApiArg["body"] = {
      name: name.trim(),
      handle,
      tokens,
      version: theme.version,
      // sending customCss at all needs theme.css.write, so others leave it untouched
      ...(canCss ? { customCss: customCss.trim() ? customCss : null } : {}),
    };
    saveTheme({ id: theme.id, body })
      .unwrap()
      .then(
        (saved) => {
          setServerErrors({});
          notifySaved(
            saved.contrastWarnings.length
              ? `${saved.name} saved with ${saved.contrastWarnings.length} contrast ${saved.contrastWarnings.length === 1 ? "warning" : "warnings"}`
              : `${saved.name} saved`,
          );
        },
        (error: unknown) => {
          setServerErrors(fieldErrors(error));
          notifyError(error);
        },
      );
  }

  function reset() {
    setName(theme.name);
    setHandle(theme.handle);
    setTokens(theme.tokens);
    setCustomCss(theme.customCss ?? "");
    setMode("light");
  }

  const num = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

  return (
    <form
      aria-label={`Edit ${theme.name}`}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <Field data-invalid={!name.trim() ? true : undefined}>
            <FieldLabel htmlFor="theme-name">Name</FieldLabel>
            <Input id="theme-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            {!name.trim() && <FieldError>Enter a name</FieldError>}
          </Field>
          <Field data-invalid={!handleValid || serverErrors.handle ? true : undefined}>
            <FieldLabel htmlFor="theme-handle">Handle</FieldLabel>
            <Input
              id="theme-handle"
              value={handle}
              className="font-mono"
              onChange={(e) => setHandle(e.target.value.trim())}
            />
            <FieldError>{!handleValid ? "Lowercase letters, numbers and dashes" : serverErrors.handle?.[0]}</FieldError>
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Last saved {formatDateTime(theme.updatedAt)}.{" "}
            {theme.channels.length
              ? `Live on ${theme.channels.map((c) => c.handle).join(", ")}: saving updates the storefront straight away.`
              : "Not live on any channel."}
          </p>
        </div>

        <Tabs defaultValue="colors">
          <TabsList>
            <TabsTrigger value="colors">Colours</TabsTrigger>
            <TabsTrigger value="type">Typography</TabsTrigger>
            <TabsTrigger value="shape">Shape &amp; spacing</TabsTrigger>
            <TabsTrigger value="css">Custom CSS</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={activeMode} onValueChange={(v) => setMode(v as ColorMode)}>
                <TabsList aria-label="Colour mode">
                  <TabsTrigger value="light">Light</TabsTrigger>
                  <TabsTrigger value="dark" disabled={!tokens.dark}>
                    Dark
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Field orientation="horizontal" className="w-fit">
                <Switch
                  id="theme-dark"
                  checked={!!tokens.dark}
                  onCheckedChange={(on) => {
                    setTokens(setDarkMode(tokens, on));
                    setMode(on ? "dark" : "light");
                  }}
                />
                <FieldLabel htmlFor="theme-dark">Dark mode colours</FieldLabel>
              </Field>
            </div>
            {activeMode === "dark" && (
              <p className="text-xs text-muted-foreground">
                Shoppers whose device is set to dark mode see these. Leave a colour empty to keep the light one.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {PALETTE_FIELDS.map((f) => (
                <ColorField
                  key={`${activeMode}-${f.key}`}
                  id={`theme-${activeMode}-${f.key}`}
                  label={f.label}
                  hint={f.hint}
                  value={activeMode === "dark" ? (tokens.dark?.colors[f.key] ?? "") : tokens.colors[f.key]}
                  fallback={activeMode === "dark" ? tokens.colors[f.key] : undefined}
                  error={tokenErrors[`${activeMode === "dark" ? "dark" : "colors"}.${f.key}`]}
                  failing={failing.some((r) => r.foreground === f.key || r.background === f.key)}
                  onChange={(value) => setTokens(setColor(tokens, activeMode, f.key, value))}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="type" className="grid gap-4 pt-4 sm:grid-cols-2">
            <Field data-invalid={tokenErrors["typography.fontBody"] ? true : undefined}>
              <FieldLabel htmlFor="theme-font-body">Body font stack</FieldLabel>
              <Input
                id="theme-font-body"
                value={tokens.typography.fontBody}
                onChange={(e) =>
                  setTokens({ ...tokens, typography: { ...tokens.typography, fontBody: e.target.value } })
                }
              />
              <FieldDescription>Comma-separated, best first, e.g. Figtree, system-ui, sans-serif</FieldDescription>
              <FieldError>{tokenErrors["typography.fontBody"]}</FieldError>
            </Field>
            <Field data-invalid={tokenErrors["typography.fontHeading"] ? true : undefined}>
              <FieldLabel htmlFor="theme-font-heading">Heading font stack</FieldLabel>
              <Input
                id="theme-font-heading"
                value={tokens.typography.fontHeading}
                onChange={(e) =>
                  setTokens({ ...tokens, typography: { ...tokens.typography, fontHeading: e.target.value } })
                }
              />
              <FieldDescription>
                Fonts not installed on the shopper&apos;s device load from Google Fonts.
              </FieldDescription>
              <FieldError>{tokenErrors["typography.fontHeading"]}</FieldError>
            </Field>
            <NumberField
              id="theme-base-size"
              label="Base text size (px)"
              value={tokens.typography.baseSizePx}
              min={12}
              max={22}
              step={1}
              error={tokenErrors["typography.baseSizePx"]}
              onChange={(v) => setTokens({ ...tokens, typography: { ...tokens.typography, baseSizePx: num(v) } })}
            />
            <NumberField
              id="theme-scale"
              label="Heading scale"
              description="Each heading level is this many times larger than the one below."
              value={tokens.typography.scale}
              min={1}
              max={1.6}
              step={0.025}
              error={tokenErrors["typography.scale"]}
              onChange={(v) => setTokens({ ...tokens, typography: { ...tokens.typography, scale: num(v) } })}
            />
          </TabsContent>

          <TabsContent value="shape" className="space-y-5 pt-4">
            <FieldSet>
              <FieldLegend variant="label">Corner radius (px)</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["sm", "Small", 32],
                    ["md", "Medium", 32],
                    ["lg", "Large", 48],
                  ] as const
                ).map(([key, label, max]) => (
                  <NumberField
                    key={key}
                    id={`theme-radius-${key}`}
                    label={label}
                    value={tokens.radius[key]}
                    min={0}
                    max={max}
                    step={1}
                    error={tokenErrors[`radius.${key}`]}
                    onChange={(v) => setTokens({ ...tokens, radius: { ...tokens.radius, [key]: num(v) } })}
                  />
                ))}
              </div>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                id="theme-spacing"
                label="Spacing unit (px)"
                description="Padding and gaps are multiples of this."
                value={tokens.spacing.unitPx}
                min={2}
                max={8}
                step={1}
                error={tokenErrors["spacing.unitPx"]}
                onChange={(v) => setTokens({ ...tokens, spacing: { unitPx: num(v) } })}
              />
              <Field>
                <FieldLabel htmlFor="theme-button-radius">Button shape</FieldLabel>
                <Select
                  value={tokens.buttons.radius}
                  onValueChange={(v) =>
                    setTokens({ ...tokens, buttons: { ...tokens.buttons, radius: v as ButtonRadius } })
                  }
                >
                  <SelectTrigger id="theme-button-radius" className="w-full">
                    <SelectValue>{BUTTON_RADII.find((r) => r.value === tokens.buttons.radius)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BUTTON_RADII.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field orientation="horizontal" className="self-end">
                <Switch
                  id="theme-uppercase"
                  checked={tokens.buttons.uppercase}
                  onCheckedChange={(on) => setTokens({ ...tokens, buttons: { ...tokens.buttons, uppercase: on } })}
                />
                <FieldLabel htmlFor="theme-uppercase">Uppercase button labels</FieldLabel>
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="css" className="space-y-2 pt-4">
            {canCss ? (
              <Field data-invalid={serverErrors.customCss ? true : undefined}>
                <FieldLabel htmlFor="theme-css">Custom CSS</FieldLabel>
                <Textarea
                  id="theme-css"
                  value={customCss}
                  rows={12}
                  maxLength={100_000}
                  spellCheck={false}
                  className="font-mono text-xs"
                  onChange={(e) => setCustomCss(e.target.value)}
                />
                <FieldDescription>
                  Added after the theme&apos;s variables on every storefront page. Style and script tags aren&apos;t
                  allowed. It isn&apos;t shown in the preview here.
                </FieldDescription>
                <FieldError>{serverErrors.customCss?.[0]}</FieldError>
              </Field>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Editing custom CSS needs the theme.css.write permission.
                  {theme.customCss ? " This theme has custom CSS, which is kept as it is when you save." : ""}
                </p>
                {theme.customCss && (
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
                    {theme.customCss}
                  </pre>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {serverErrors._form && <p className="text-sm text-destructive">{serverErrors._form[0]}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <ActivateTheme theme={theme} themes={themes} dirty={dirty} />
          <span className="flex-1" />
          {dirty && (
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <Undo2Icon /> Discard changes
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!dirty || invalid || save.isLoading}>
            {save.isLoading ? "Saving…" : "Save theme"}
          </Button>
        </div>
      </div>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start" aria-label="Preview and contrast">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Preview</h2>
          <span className="text-xs text-muted-foreground">
            {activeMode === "dark" ? "Dark colours" : "Light colours"}
          </span>
        </div>
        <ThemePreview tokens={tokens} mode={activeMode} />
        <ContrastReport results={results} palette={paletteFor(tokens, activeMode)} mode={activeMode} />
      </aside>
    </form>
  );
}

function ColorField({
  id,
  label,
  hint,
  value,
  fallback,
  error,
  failing,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  fallback?: string;
  error?: string;
  failing: boolean;
  onChange: (value: string) => void;
}) {
  const shown = normalizeHex(value) ?? normalizeHex(fallback ?? "") ?? "#000000";
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="flex items-center gap-1.5">
        {label}
        {failing && (
          <TriangleAlertIcon className="size-3.5 text-amber-600 dark:text-amber-400" aria-label="Low contrast" />
        )}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={shown}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={value}
          placeholder={fallback ? `${fallback} (light)` : "#1a1a1a"}
          className="font-mono"
          aria-describedby={`${id}-hint`}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.trim())}
          onBlur={() => {
            const normalized = normalizeHex(value);
            if (normalized && normalized !== value) onChange(normalized);
          }}
        />
        {fallback !== undefined && value && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={`Use the light ${label}`}
            onClick={() => onChange("")}
          >
            <Undo2Icon />
          </Button>
        )}
      </div>
      <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function NumberField({
  id,
  label,
  description,
  value,
  min,
  max,
  step,
  error,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function ContrastReport({
  results,
  palette,
  mode,
}: {
  results: ReturnType<typeof checkContrast>;
  palette: Palette;
  mode: ColorMode;
}) {
  const failing = results.filter((r) => !r.passes);
  return (
    <section aria-labelledby="contrast-heading" className="space-y-2">
      <h2 id="contrast-heading" className="text-sm font-medium">
        Contrast ({mode})
      </h2>
      {failing.length > 0 ? (
        <Alert className="border-amber-500/50">
          <TriangleAlertIcon className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>
            {failing.length} {failing.length === 1 ? "pair is" : "pairs are"} below WCAG AA
          </AlertTitle>
          <AlertDescription>
            Shoppers with low vision may struggle to read these. Text needs 4.5:1; buttons against the page need 3:1.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Every checked pair meets WCAG AA.
        </p>
      )}
      <ul className="divide-y rounded-lg border bg-card text-sm">
        {results.map((r) => (
          <li key={`${r.foreground}-${r.background}`} className="flex items-center gap-3 px-3 py-2">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
              style={{ background: palette[r.background], color: palette[r.foreground] }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{r.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {LABELS[r.foreground]} on {LABELS[r.background].toLowerCase()}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-xs tabular-nums">{formatRatio(r.ratio)}</span>
              {r.passes ? (
                <Badge variant="secondary">Pass</Badge>
              ) : (
                <Badge variant="destructive">Needs {r.required}:1</Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivateTheme({ theme, themes, dirty }: { theme: Theme; themes: Theme[]; dirty: boolean }) {
  const canReadChannels = useCan("settings.read");
  const channelsQuery = useGetV1AdminChannelsQuery({}, { skip: !canReadChannels });
  // without settings.read, offer the channels some theme is already live on
  const known = themes.flatMap((t) => t.channels.map((c) => ({ id: c.id, handle: c.handle, name: c.handle })));
  const channels =
    channelsQuery.data?.map((c) => ({ id: c.id, handle: c.handle, name: c.name })) ??
    known.filter((c, i) => known.findIndex((k) => k.id === c.id) === i);
  const [channelId, setChannelId] = useState<string>("");
  const [activate] = usePostV1AdminThemesIdActivateMutation();
  const channel = channels.find((c) => c.id === channelId) ?? channels[0];
  if (!channel) return null;
  const current = themes.find((t) => t.channels.some((c) => c.id === channel.id));
  const isLive = current?.id === theme.id;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={channel.id} onValueChange={(v) => setChannelId(String(v))}>
        <SelectTrigger aria-label="Channel" size="sm" className="w-40">
          <SelectValue>{channel.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {channels.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLive ? (
        <Badge variant="secondary">Live on {channel.name}</Badge>
      ) : (
        <ConfirmDialog
          trigger={
            <Button type="button" size="sm" variant="outline">
              <RadioTowerIcon /> Activate
            </Button>
          }
          title={`Make ${theme.name} live on ${channel.name}?`}
          description={`Every shopper on ${channel.name} sees it straight away${current ? `, replacing ${current.name}` : ""}.${dirty ? " Unsaved changes aren't included: save first if you want them live." : ""}`}
          confirmLabel="Activate theme"
          onConfirm={() =>
            activate({ id: theme.id, body: { channelId: channel.id } })
              .unwrap()
              .then(() => notifySaved(`${theme.name} is live on ${channel.name}`), notifyError)
          }
        />
      )}
    </div>
  );
}
