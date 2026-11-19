"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminTranslationsLocalesQuery,
  useGetV1AdminTranslationsQuery,
  type GetV1AdminTranslationsApiResponse,
} from "../../store/api.generated";
import { LanguagePicker, StatusBadge, editorHref } from "./translation-parts";
import { ENTITY_LABELS, isEntityType, type EntityType } from "./translation-model";

type Row = GetV1AdminTranslationsApiResponse["items"][number];

const FILTERS: FilterDef[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Name or handle" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "missing", label: "Missing" },
      { value: "translated", label: "Translated" },
    ],
  },
];

function columns(type: EntityType, locale: string): ColumnDef<Row>[] {
  return [
    {
      header: ENTITY_LABELS[type].one,
      cell: ({ row: { original: r } }) => (
        <div className="min-w-0">
          <Link
            href={editorHref(type, r.entityId, locale)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {r.label || r.handle}
          </Link>
          <div className="font-mono text-xs text-muted-foreground">{r.handle}</div>
        </div>
      ),
    },
    { header: "Status", cell: ({ row: { original: r } }) => <StatusBadge item={r} /> },
    {
      header: "Translation saved",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatDateTime(r.translationUpdatedAt)}
        </span>
      ),
    },
    {
      header: "English updated",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(r.sourceUpdatedAt)}</span>
      ),
    },
  ];
}

// Content translations (plan B-Phase 3, spec §9.6): products, categories, collections, pages and
// menus with their translation into each market language. English is the source; anything left
// untranslated shows in English on the storefront.
export function TranslationsScreen() {
  const locales = useGetV1AdminTranslationsLocalesQuery({});
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const allowed = locales.data?.entityTypes ?? [];
  const requestedType = params.get("type");
  const type: EntityType | undefined =
    isEntityType(requestedType) && allowed.includes(requestedType) ? requestedType : allowed[0];
  const languages = locales.data?.locales ?? [];
  const requestedLocale = params.get("locale");
  const locale = requestedLocale && languages.includes(requestedLocale) ? requestedLocale : languages[0];

  // the kind and language live in the URL next to the filters; switching kind starts at page 1
  const setParam = (key: string, value: string) => {
    const search = new URLSearchParams(params);
    search.set(key, value);
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  };

  const header = (
    <PageHeader
      title="Translations"
      description="Translate store content from English. Anything left blank shows in English on the storefront."
      actions={
        locale && languages.length > 0 ? (
          <LanguagePicker locales={languages} value={locale} onChange={(l) => setParam("locale", l)} />
        ) : undefined
      }
    />
  );

  if (locales.error) {
    return (
      <>
        {header}
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(locales.error)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!locales.data) {
    return (
      <>
        {header}
        <Skeleton className="h-96 w-full" />
      </>
    );
  }
  if (!type || !locale) {
    return (
      <>
        {header}
        <Alert>
          <AlertDescription>
            {!locale
              ? "No market offers a language other than English, so there's nothing to translate into."
              : "You don't have permission to edit any content that can be translated."}
          </AlertDescription>
        </Alert>
      </>
    );
  }

  return (
    <>
      {header}
      <Tabs value={type} onValueChange={(v) => isEntityType(v) && setParam("type", v)}>
        <TabsList aria-label="Content to translate">
          {allowed.map((t) => (
            <TabsTrigger key={t} value={t}>
              {ENTITY_LABELS[t].many}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={type} className="pt-2">
          <TranslationList type={type} locale={locale} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function TranslationList({ type, locale }: { type: EntityType; locale: string }) {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(`${type}:${locale}:${filters.key}`);
  const status =
    filters.values.status === "missing" || filters.values.status === "translated" ? filters.values.status : "all";
  const list = useGetV1AdminTranslationsQuery({
    entityType: type,
    locale,
    status,
    limit: 25,
    ...(filters.values.q ? { q: filters.values.q } : {}),
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  const cols = useMemo(() => columns(type, locale), [type, locale]);

  return (
    <DataTable
      tableKey={`translations-${type}`}
      columns={cols}
      data={list.data?.items}
      loading={list.isFetching}
      error={list.error}
      getRowId={(r) => r.entityId}
      filters={FILTERS}
      emptyMessage={
        status === "missing"
          ? `Every ${ENTITY_LABELS[type].one.toLowerCase()} here is translated.`
          : `No ${ENTITY_LABELS[type].many.toLowerCase()} match these filters.`
      }
      pagination={{
        page: pages.page,
        hasNext: !!list.data?.nextCursor,
        hasPrevious: pages.hasPrevious,
        onNext: () => pages.next(list.data?.nextCursor),
        onPrevious: pages.previous,
      }}
    />
  );
}
