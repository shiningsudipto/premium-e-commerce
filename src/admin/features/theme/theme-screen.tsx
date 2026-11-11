"use client";

import { useState } from "react";
import { CheckCircle2Icon, CopyIcon, PlusIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminThemesQuery,
  usePostV1AdminThemesMutation,
  type GetV1AdminThemesApiResponse,
  type PostV1AdminThemesApiArg,
} from "../../store/api.generated";
import { useCan, useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { notifyError, notifySaved } from "../../lib/notify";
import { slug } from "../products/product-form";
import { ThemeEditor } from "./theme-editor";
import { copyHandle, defaultTokens } from "./tokens";

export type Theme = GetV1AdminThemesApiResponse[number];

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Themes (spec §9.2): design tokens per theme, one active theme per channel.
export function ThemeScreen() {
  const me = useMe();
  const canWrite = useCan("theme.write");
  const themes = useGetV1AdminThemesQuery({}, { skip: !canWrite });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ source: Theme | null } | null>(null);

  // permissions come with the session; don't flash "no access" while it loads
  if (!me.data && !me.error) {
    return (
      <>
        <PageHeader title="Theme" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }
  if (!canWrite) {
    return (
      <>
        <PageHeader title="Theme" />
        <Alert>
          <AlertDescription>
            Your role can&apos;t edit themes. Ask an owner for the theme.write permission.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const list = themes.data ?? [];
  // default to the theme that's live somewhere, else the first one
  const selected = list.find((t) => t.id === selectedId) ?? list.find((t) => t.channels.length > 0) ?? list[0] ?? null;

  return (
    <>
      <PageHeader
        title="Theme"
        description="Colours, type and shapes for the storefront. Edit a theme, check its contrast, then make it live on a channel."
        actions={
          <>
            {selected && (
              <Button size="sm" variant="outline" onClick={() => setCreating({ source: selected })}>
                <CopyIcon /> Duplicate
              </Button>
            )}
            <Button size="sm" onClick={() => setCreating({ source: null })}>
              <PlusIcon /> New theme
            </Button>
          </>
        }
      />

      {themes.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(themes.error)}</AlertDescription>
        </Alert>
      ) : themes.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No themes yet. Create one to style the storefront.
        </div>
      ) : (
        <>
          <ul aria-label="Themes" className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((t) => {
              const isSelected = t.id === selected?.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(t.id)}
                    className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-foreground"
                  >
                    <span aria-hidden className="flex shrink-0 overflow-hidden rounded-md border">
                      {(["background", "primary", "accent", "foreground"] as const).map((k) => (
                        <span key={k} className="size-5" style={{ background: t.tokens.colors[k] }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{t.name}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{t.handle}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {t.channels.map((c) => (
                        <Badge key={c.id}>Live: {c.handle}</Badge>
                      ))}
                      {t.contrastWarnings.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                          <TriangleAlertIcon className="size-3" aria-hidden />
                          {t.contrastWarnings.length} contrast {t.contrastWarnings.length === 1 ? "issue" : "issues"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2Icon className="size-3" aria-hidden /> AA text contrast
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected && <ThemeEditor key={`${selected.id}:${selected.version}`} theme={selected} themes={list} />}
        </>
      )}

      <Dialog open={!!creating} onOpenChange={(open) => !open && setCreating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creating?.source ? `Duplicate ${creating.source.name}` : "New theme"}</DialogTitle>
            <DialogDescription>
              {creating?.source
                ? "The copy starts with the same tokens and isn't live anywhere until you activate it."
                : "It starts from a neutral, accessible palette. Nothing changes on the storefront until you activate it."}
            </DialogDescription>
          </DialogHeader>
          {creating && (
            <CreateThemeForm
              source={creating.source}
              themes={list}
              onCreated={(id) => {
                setCreating(null);
                setSelectedId(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateThemeForm({
  source,
  themes,
  onCreated,
}: {
  source: Theme | null;
  themes: Theme[];
  onCreated: (id: string) => void;
}) {
  const canCss = useCan("theme.css.write");
  const [name, setName] = useState(source ? `${source.name} (copy)` : "");
  const [handle, setHandle] = useState(
    source
      ? copyHandle(
          source.handle,
          themes.map((t) => t.handle),
        )
      : "",
  );
  const [startFrom, setStartFrom] = useState<string>(source?.id ?? "none");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [createTheme, create] = usePostV1AdminThemesMutation();
  const base = themes.find((t) => t.id === startFrom) ?? null;
  const handleValid = HANDLE.test(handle);
  const losesCss = !!base?.customCss && !canCss;

  function submit() {
    setShowErrors(true);
    if (!name.trim() || !handleValid) return;
    const body: PostV1AdminThemesApiArg["body"] = {
      name: name.trim(),
      handle,
      tokens: base ? base.tokens : defaultTokens(),
      ...(base
        ? {
            logoMediaId: base.logoMediaId,
            faviconMediaId: base.faviconMediaId,
            socialImageMediaId: base.socialImageMediaId,
          }
        : {}),
      // the API refuses customCss from staff without theme.css.write, even when empty
      ...(canCss && base?.customCss ? { customCss: base.customCss } : {}),
    };
    createTheme({ body })
      .unwrap()
      .then(
        (theme) => {
          notifySaved(`${theme.name} created`);
          onCreated(theme.id);
        },
        (error: unknown) => {
          setErrors(fieldErrors(error));
          notifyError(error);
        },
      );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field data-invalid={showErrors && !name.trim() ? true : undefined}>
        <FieldLabel htmlFor="new-theme-name">Name</FieldLabel>
        <Input
          id="new-theme-name"
          value={name}
          maxLength={100}
          autoFocus
          onChange={(e) => {
            if (!source && (!handle || handle === slug(name))) setHandle(slug(e.target.value));
            setName(e.target.value);
          }}
        />
        {showErrors && !name.trim() && <FieldError>Enter a name</FieldError>}
      </Field>
      <Field data-invalid={(showErrors && !handleValid) || errors.handle ? true : undefined}>
        <FieldLabel htmlFor="new-theme-handle">Handle</FieldLabel>
        <Input
          id="new-theme-handle"
          value={handle}
          className="font-mono"
          onChange={(e) => setHandle(e.target.value.trim())}
        />
        <FieldError>
          {showErrors && !handleValid ? "Lowercase letters, numbers and dashes" : errors.handle?.[0]}
        </FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="new-theme-source">Start from</FieldLabel>
        <Select value={startFrom} onValueChange={(v) => setStartFrom(String(v ?? "none"))}>
          <SelectTrigger id="new-theme-source" className="w-full">
            <SelectValue>{base ? base.name : "Neutral defaults"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Neutral defaults</SelectItem>
            {themes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {losesCss && (
          <FieldDescription>
            Custom CSS isn&apos;t copied: your role doesn&apos;t have the theme.css.write permission.
          </FieldDescription>
        )}
      </Field>
      {errors._form && <p className="text-sm text-destructive">{errors._form[0]}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={create.isLoading}>
          {create.isLoading ? "Creating…" : "Create theme"}
        </Button>
      </div>
    </form>
  );
}
