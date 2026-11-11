"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetV1AdminPagesQuery,
  usePostV1AdminPagesMutation,
  type GetV1AdminPagesApiArg,
  type GetV1AdminPagesApiResponse,
} from "../../store/api.generated";
import { errorCode } from "../../store/api-errors";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { PAGE_STATE_LABEL, pageState, type PageState } from "./block-tree";

type PageRow = GetV1AdminPagesApiResponse["items"][number];
type Kind = PageRow["kind"];

const PAGE_SIZE = 25;
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const STATE_BADGE: Record<PageState, "default" | "secondary" | "outline" | "destructive"> = {
  live: "default",
  scheduled: "secondary",
  draft: "outline",
  archived: "destructive",
};

export const KIND_LABEL: Record<Kind, string> = { PAGE: "Page", SECTION: "Global section" };

const filterDefs: FilterDef[] = [
  { key: "q", label: "Search", type: "text", placeholder: "Title or handle" },
  {
    key: "kind",
    label: "Kind",
    type: "select",
    options: [
      { value: "PAGE", label: "Pages" },
      { value: "SECTION", label: "Global sections" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Live" },
      { value: "DRAFT", label: "Draft" },
      { value: "ARCHIVED", label: "Archived" },
    ],
  },
];

const columns: ColumnDef<PageRow>[] = [
  {
    header: "Page",
    cell: ({ row: { original: p } }) => (
      <Link href={`/admin/pages/${p.id}`} className="block space-y-0.5 hover:underline">
        <span className="block font-medium">{p.title}</span>
        <span className="block font-mono text-[11px] text-muted-foreground">
          {p.kind === "PAGE" ? `/pages/${p.handle}` : p.handle}
        </span>
      </Link>
    ),
  },
  {
    header: "Kind",
    cell: ({ row: { original: p } }) => <span className="text-xs">{KIND_LABEL[p.kind]}</span>,
  },
  {
    header: "Status",
    cell: ({ row: { original: p } }) => {
      const state = pageState(p);
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={STATE_BADGE[state]}
            title={state === "scheduled" ? `Publishes ${formatDateTime(p.publishAt)}` : undefined}
          >
            {PAGE_STATE_LABEL[state]}
          </Badge>
          {p.publishedVersionNumber !== null && p.hasUnpublishedChanges && state !== "archived" && (
            <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">
              Unpublished changes
            </Badge>
          )}
        </span>
      );
    },
  },
  {
    header: "Published",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {p.publishedVersionNumber !== null
          ? `v${p.publishedVersionNumber} · ${formatDateTime(p.publishedAt)}`
          : "Never"}
      </span>
    ),
  },
  {
    header: "Updated",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(p.updatedAt)}</span>
    ),
  },
];

// Page builder list (spec §9.1): content pages and global sections (reusable blocks such as a
// header promo), with their publishing state.
export function PagesScreen() {
  const filters = useTableFilters(filterDefs);
  const pages = useCursorPages(filters.key);
  const list = useGetV1AdminPagesQuery({
    ...(filters.values as Partial<GetV1AdminPagesApiArg>),
    limit: PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Build pages from blocks, preview the draft, then publish or schedule it. Global sections are blocks you reuse on several pages."
        actions={<NewPageDialog />}
      />
      <DataTable
        tableKey="pages"
        columns={columns}
        data={list.data?.items}
        loading={list.isFetching}
        error={list.error}
        getRowId={(p) => p.id}
        filters={filterDefs}
        emptyMessage="No pages match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!list.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(list.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function NewPageDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [kind, setKind] = useState<Kind>("PAGE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createPage, create] = usePostV1AdminPagesMutation();
  const effectiveHandle = handleTouched ? handle : slugify(title);

  const reset = () => {
    setTitle("");
    setHandle("");
    setHandleTouched(false);
    setKind("PAGE");
    setErrors({});
  };

  function submit() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Enter a title";
    if (!HANDLE.test(effectiveHandle)) next.handle = "Lowercase letters, numbers and dashes";
    setErrors(next);
    if (Object.keys(next).length) return;
    createPage({ body: { title: title.trim(), handle: effectiveHandle, kind, blocks: [] } })
      .unwrap()
      .then(
        (page) => {
          notifySaved(`${page.title} created as a draft`);
          setOpen(false);
          reset();
          router.push(`/admin/pages/${page.id}`);
        },
        (error) => {
          if (errorCode(error) === "ALREADY_EXISTS") setErrors({ handle: "This handle is already used" });
          else notifyError(error);
        },
      );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> New page
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>New page</DialogTitle>
            <DialogDescription>It starts as an empty draft. Add blocks, preview it, then publish.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="page-new-kind">Kind</FieldLabel>
              <Select value={kind} onValueChange={(v) => setKind((v as Kind | null) ?? "PAGE")}>
                <SelectTrigger id="page-new-kind" className="w-full">
                  <SelectValue>{KIND_LABEL[kind]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAGE">{KIND_LABEL.PAGE}</SelectItem>
                  <SelectItem value="SECTION">{KIND_LABEL.SECTION}</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {kind === "PAGE"
                  ? "A page of its own on the storefront, at /pages/<handle>."
                  : "Blocks reused on other pages through the Global section block."}
              </FieldDescription>
            </Field>
            <Field data-invalid={errors.title ? true : undefined}>
              <FieldLabel htmlFor="page-new-title">Title</FieldLabel>
              <Input
                id="page-new-title"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "PAGE" ? "e.g. About us" : "e.g. Free shipping banner"}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>
            <Field data-invalid={errors.handle ? true : undefined}>
              <FieldLabel htmlFor="page-new-handle">Handle</FieldLabel>
              <Input
                id="page-new-handle"
                value={effectiveHandle}
                maxLength={120}
                className="font-mono"
                onChange={(e) => {
                  setHandleTouched(true);
                  setHandle(e.target.value.trim());
                }}
              />
              <FieldDescription>Made from the title until you change it.</FieldDescription>
              <FieldError>{errors.handle}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading}>
              {create.isLoading ? "Creating…" : kind === "PAGE" ? "Create page" : "Create section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
