"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  adminApi,
  useDeleteV1AdminTranslationsEntityTypeEntityIdLocaleMutation,
  useGetV1AdminTranslationsEntityTypeEntityIdLocaleQuery,
  useGetV1AdminTranslationsLocalesQuery,
  usePutV1AdminTranslationsEntityTypeEntityIdLocaleMutation,
  type GetV1AdminTranslationsEntityTypeEntityIdLocaleApiResponse,
} from "../../store/api.generated";
import { LanguagePicker, StatusBadge, localeText } from "./translation-parts";
import {
  editorHref,
  editorModel,
  ENTITY_LABELS,
  isEntityType,
  localeName,
  placeErrors,
  progress,
  sameFields,
  type EntityType,
  type FieldGroup,
  type FieldRow,
} from "./translation-model";

type Item = GetV1AdminTranslationsEntityTypeEntityIdLocaleApiResponse;
type PlacedErrors = ReturnType<typeof placeErrors>;
const NO_ERRORS: PlacedErrors = { rows: {}, groups: {}, general: [] };

function BackLink({ type, locale }: { type?: EntityType; locale?: string }) {
  const search = new URLSearchParams({ ...(type ? { type } : {}), ...(locale ? { locale } : {}) }).toString();
  return (
    <Link
      href={`/admin/translations${search ? `?${search}` : ""}`}
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" aria-hidden /> Translations
    </Link>
  );
}

// One item's translation (spec §9.6): the English text of every translatable field next to an
// input for the translation. Blank inputs fall back to English on the storefront.
export function TranslationEditorScreen({ entityType, entityId }: { entityType: string; entityId: string }) {
  const locales = useGetV1AdminTranslationsLocalesQuery({});
  const requested = useSearchParams().get("locale");
  const languages = locales.data?.locales ?? [];
  const locale = requested && languages.includes(requested) ? requested : languages[0];
  const type = isEntityType(entityType) ? entityType : undefined;
  const item = useGetV1AdminTranslationsEntityTypeEntityIdLocaleQuery(
    { entityType: type ?? "PRODUCT", entityId, locale: locale ?? "" },
    { skip: !type || !locale },
  );

  const problem = !type
    ? "There's no such kind of content to translate."
    : locales.data && !locale
      ? "No market offers a language other than English, so there's nothing to translate into."
      : locales.error || item.error
        ? errorMessage(locales.error ?? item.error)
        : null;
  if (problem) {
    return (
      <>
        <BackLink type={type} />
        <Alert variant="destructive">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!type || !locale || !item.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  return (
    // a save (or a change to the English text) loads what the API stored into a fresh form
    <TranslationEditor
      key={`${item.data.entityId}:${locale}:${item.data.translationUpdatedAt}:${item.data.sourceUpdatedAt}`}
      type={type}
      locale={locale}
      locales={languages}
      item={item.data}
    />
  );
}

function TranslationEditor({
  type,
  locale,
  locales,
  item,
}: {
  type: EntityType;
  locale: string;
  locales: string[];
  item: Item;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const model = useMemo(() => editorModel(type, item.source, item.translation), [type, item.source, item.translation]);
  const [values, setValues] = useState<Record<string, string>>(model.initial);
  const [errors, setErrors] = useState<PlacedErrors>(NO_ERRORS);
  const [save, saving] = usePutV1AdminTranslationsEntityTypeEntityIdLocaleMutation();
  const [remove] = useDeleteV1AdminTranslationsEntityTypeEntityIdLocaleMutation();
  const [findMissing, finding] = adminApi.endpoints.getV1AdminTranslations.useLazyQuery();

  const fields = model.build(values);
  const savedFields = useMemo(() => model.build(model.initial), [model]);
  const dirty = !sameFields(fields, savedFields);
  const done = progress(model.groups, values);
  const language = localeName(locale).name;
  const busy = saving.isLoading || finding.isFetching;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setValue = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function goToNextMissing() {
    try {
      const list = await findMissing({ entityType: type, locale, status: "missing", limit: 5 }, false).unwrap();
      const next = list.items.find((i) => i.entityId !== item.entityId);
      if (next) router.push(editorHref(type, next.entityId, locale));
      else {
        toast.success(`Every ${ENTITY_LABELS[type].one.toLowerCase()} is translated into ${language}.`);
        router.push(`/admin/translations?type=${type}&locale=${encodeURIComponent(locale)}`);
      }
    } catch (error) {
      notifyError(error);
    }
  }

  async function submit(thenNext: boolean) {
    if (!dirty) {
      if (thenNext) await goToNextMissing();
      return;
    }
    setErrors(NO_ERRORS);
    const removing = Object.keys(fields).length === 0;
    try {
      await save({ entityType: type, entityId: item.entityId, locale, body: { fields } }).unwrap();
      notifySaved(removing ? "Translation removed: the English text shows again" : "Translation saved");
      if (thenNext) await goToNextMissing();
    } catch (error) {
      setErrors(placeErrors(model.groups, fieldErrors(error)));
      notifyError(error);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(false);
  };
  // Ctrl+S / Cmd+S saves from anywhere in the form
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!busy) void submit(false);
    }
  };

  const changeLocale = (next: string) => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    router.replace(`${pathname}?locale=${encodeURIComponent(next)}`);
  };

  return (
    <>
      <BackLink type={type} locale={locale} />
      <PageHeader
        title={item.label || item.handle}
        description={`${ENTITY_LABELS[type].one} · ${item.handle} · translating into ${localeText(locale)}`}
        actions={<LanguagePicker locales={locales} value={locale} onChange={changeLocale} />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge item={item} />
        <span className="text-muted-foreground">
          {done.done} of {done.total} texts translated
        </span>
        {item.translationUpdatedAt && (
          <span className="text-muted-foreground">Saved {formatDateTime(item.translationUpdatedAt)}</span>
        )}
      </div>

      {item.outdated && (
        <Alert className="mb-4">
          <AlertTitle>The English text changed</AlertTitle>
          <AlertDescription>
            It was updated {formatDateTime(item.sourceUpdatedAt)}, after this translation was saved. Compare the texts
            below and save again to mark the translation as up to date.
          </AlertDescription>
        </Alert>
      )}

      {errors.general.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>The translation wasn&apos;t saved</AlertTitle>
          <AlertDescription>
            {errors.general.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <form
        className="space-y-4 pb-24"
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        aria-label={`${language} translation`}
      >
        {model.groups.map((group) =>
          group.rows.length ? (
            <GroupSection
              key={group.id}
              group={group}
              language={language}
              locale={locale}
              values={values}
              error={errors.groups[group.id]}
              rowErrors={errors.rows}
              onChange={setValue}
            />
          ) : null,
        )}
        {model.groups.every((g) => !g.rows.length) && (
          <p className="text-sm text-muted-foreground">There&apos;s no text to translate here.</p>
        )}

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
          <span className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            {dirty ? (
              <Badge variant="secondary">Unsaved changes</Badge>
            ) : Object.keys(savedFields).length ? (
              "All changes saved"
            ) : (
              "Not translated yet"
            )}
          </span>
          {item.translation && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" disabled={busy}>
                  <Trash2Icon /> Remove translation
                </Button>
              }
              title="Remove this translation?"
              description={`The storefront shows the English text again for ${language} shoppers. This can't be undone.`}
              confirmLabel="Remove translation"
              destructive
              onConfirm={async () => {
                try {
                  await remove({ entityType: type, entityId: item.entityId, locale }).unwrap();
                  notifySaved("Translation removed");
                } catch (error) {
                  notifyError(error);
                }
              }}
            />
          )}
          <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(true)}>
            {dirty ? "Save & next missing" : "Next missing"} <ArrowRightIcon />
          </Button>
          <Button type="submit" disabled={busy || !dirty}>
            <SaveIcon /> {saving.isLoading ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </>
  );
}

function GroupSection({
  group,
  language,
  locale,
  values,
  error,
  rowErrors,
  onChange,
}: {
  group: FieldGroup;
  language: string;
  locale: string;
  values: Record<string, string>;
  error?: string;
  rowErrors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-lg border bg-card p-5">
      <header className="mb-2 space-y-1">
        <h2 id={headingId} className="font-medium">
          {group.title}
        </h2>
        {group.description && <p className="max-w-2xl text-sm text-muted-foreground">{group.description}</p>}
      </header>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="hidden grid-cols-2 gap-6 border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid">
        <span>English</span>
        <span>{language}</span>
      </div>
      <div className="divide-y">
        {group.rows.map((row) => (
          <TranslationRow
            key={row.key}
            row={row}
            language={language}
            locale={locale}
            value={values[row.key] ?? ""}
            error={rowErrors[row.key]}
            onChange={(v) => onChange(row.key, v)}
          />
        ))}
      </div>
    </section>
  );
}

function TranslationRow({
  row,
  language,
  locale,
  value,
  error,
  onChange,
}: {
  row: FieldRow;
  language: string;
  locale: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const sourceId = `${id}-source`;
  const countId = `${id}-count`;
  const long = row.kind !== "text";
  const describedBy = [sourceId, row.max ? countId : null].filter(Boolean).join(" ");
  const common = {
    id,
    lang: locale,
    value,
    maxLength: row.max,
    placeholder: "Not translated: shows in English",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  return (
    <div className="grid gap-3 py-4 md:grid-cols-2 md:gap-6">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium" aria-hidden>
          {row.label}
        </p>
        <div id={sourceId} lang="en" className="text-sm break-words whitespace-pre-line text-muted-foreground">
          <span className="sr-only">English: </span>
          {row.source || <em>No English text</em>}
        </div>
      </div>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>
          <span className="sr-only">{row.label}, </span>
          {language}
        </FieldLabel>
        {long ? (
          <Textarea {...common} rows={row.kind === "rich" ? 6 : 3} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input {...common} onChange={(e) => onChange(e.target.value)} />
        )}
        <div className="flex justify-between gap-2">
          {row.kind === "rich" ? (
            <FieldDescription>Plain text. Leave a blank line between paragraphs.</FieldDescription>
          ) : (
            <span />
          )}
          {row.max && (
            <span id={countId} className="text-xs text-muted-foreground tabular-nums">
              {value.length}/{row.max}
              <span className="sr-only"> characters</span>
            </span>
          )}
        </div>
        <FieldError>{error}</FieldError>
      </Field>
    </div>
  );
}
