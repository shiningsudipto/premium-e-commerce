"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArchiveIcon, ArrowLeftIcon, EyeOffIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCan, useMe } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { can } from "../../lib/permissions";
import { errorCode, errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminBlocksQuery,
  useGetV1AdminPagesIdQuery,
  usePostV1AdminPagesIdPublishMutation,
  usePostV1AdminPagesIdUnpublishMutation,
  usePutV1AdminPagesIdMutation,
} from "../../store/api.generated";
import { cleanSeo, readSeo, type Seo } from "../products/product-form";
import { Section } from "../products/section";
import { BlockInspector } from "./block-inspector";
import { BlockLibraryDialog } from "./block-library";
import { BlockOutline, type OutlineActions } from "./block-outline";
import {
  defaultProps,
  duplicateBlock,
  findBlock,
  hasRoom,
  insertBlock,
  moveBlock,
  moveBy,
  newBlockId,
  PAGE_STATE_LABEL,
  pageErrors,
  pageState,
  readBlocks,
  removeBlock,
  toApiBlocks,
  updateBlock,
  validateTree,
  type Block,
  type BlockDef,
  type PageErrors,
} from "./block-tree";
import { PreviewDialog, PublishDialog, ScheduleDialog, VersionsCard, type AdminPage } from "./page-publishing";
import { KIND_LABEL, STATE_BADGE } from "./pages-screen";

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NO_ERRORS: PageErrors = { fields: {}, blocks: {}, general: [] };

function BackLink() {
  return (
    <Link
      href="/admin/pages"
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" aria-hidden /> Pages
    </Link>
  );
}

// Page builder editor (spec §9.1): the block tree, a form per block generated from its schema,
// page details and SEO; draft → preview → publish or schedule, versions and rollback.
export function PageEditorScreen({ id }: { id: string }) {
  const page = useGetV1AdminPagesIdQuery({ id });
  const catalog = useGetV1AdminBlocksQuery({});
  // kept here so the selection survives the editor reloading after a save
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const error = page.error ?? catalog.error;
  if (error) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!page.data || !catalog.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  return (
    // a new version (after any save, publish or rollback) resets the editor to what the API stored
    <PageEditor
      key={`${page.data.id}:${page.data.version}`}
      page={page.data}
      defs={catalog.data}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      reload={() => void page.refetch()}
    />
  );
}

function PageEditor({
  page,
  defs,
  selectedId,
  setSelectedId,
  reload,
}: {
  page: AdminPage;
  defs: BlockDef[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  reload: () => void;
}) {
  const me = useMe();
  const canWrite = useCan("content.pages.write");
  const permissions = me.data?.permissions;
  const defsByType = useMemo(() => new Map(defs.map((d) => [d.type, d])), [defs]);
  const allowedDefs = useMemo(
    () => defs.filter((d) => !d.permission || can(permissions, d.permission)),
    [defs, permissions],
  );

  const [initialBlocks] = useState(() => readBlocks(page.blocks));
  const [title, setTitle] = useState(page.title);
  const [handle, setHandle] = useState(page.handle);
  const [seo, setSeo] = useState<Seo>(() => readSeo(page.seo));
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [apiErrors, setApiErrors] = useState<PageErrors>(NO_ERRORS);
  const [showErrors, setShowErrors] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [library, setLibrary] = useState<{ parentId: string | null } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const [savePage, save] = usePutV1AdminPagesIdMutation();
  const [publishPage, publishing] = usePostV1AdminPagesIdPublishMutation();
  const [unpublishPage, unpublishing] = usePostV1AdminPagesIdUnpublishMutation();
  const busy = save.isLoading || publishing.isLoading || unpublishing.isLoading;

  // a page with blocks the staff member may not edit (custom HTML) can't be saved by them at all
  const lockedTypes = [...new Set(collectTypes(blocks))].filter((t) => {
    const p = defsByType.get(t)?.permission;
    return p && !can(permissions, p);
  });
  const readOnly = !canWrite || lockedTypes.length > 0 || conflict;

  const snapshot = (t: string, h: string, s: Seo, b: Block[]) =>
    JSON.stringify({ t: t.trim(), h, s: cleanSeo(s), b: toApiBlocks(b, defs) });
  const [initial] = useState(() => snapshot(page.title, page.handle, readSeo(page.seo), initialBlocks));
  const dirty = snapshot(title, handle, seo, blocks) !== initial;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const clientErrors = validateTree(blocks, defs);
  const localFields: Record<string, string> = {
    ...(title.trim() ? {} : { title: "Enter a title" }),
    ...(HANDLE.test(handle) ? {} : { handle: "Lowercase letters, numbers and dashes" }),
  };
  const invalid = Object.keys(clientErrors).length > 0 || Object.keys(localFields).length > 0;
  const blockErrors = (id: string): Record<string, string> => ({
    ...(apiErrors.blocks[id] ?? {}),
    ...(showErrors ? (clientErrors[id] ?? {}) : {}),
  });
  const errorIds = new Set([...Object.keys(apiErrors.blocks), ...(showErrors ? Object.keys(clientErrors) : [])]);
  const fieldError = (key: string) => (showErrors ? localFields[key] : undefined) ?? apiErrors.fields[key];

  async function saveDraft(extra: { publishAt?: string | null } = {}, quiet = false): Promise<boolean> {
    setShowErrors(true);
    if (invalid) {
      toast.error("Fix the highlighted fields first.");
      return false;
    }
    const sent = blocks;
    try {
      await savePage({
        id: page.id,
        body: {
          handle,
          title: title.trim(),
          kind: page.kind,
          blocks: toApiBlocks(sent, defs),
          seo: cleanSeo(seo),
          version: page.version,
          ...extra,
        },
      }).unwrap();
      setApiErrors(NO_ERRORS);
      if (!quiet) notifySaved("Draft saved. The live page doesn't change until you publish.");
      return true;
    } catch (error) {
      if (errorCode(error) === "VERSION_CONFLICT") {
        setConflict(true);
        toast.error("Someone else changed this page. Reload to get their version.");
        return false;
      }
      if (errorCode(error) === "ALREADY_EXISTS")
        setApiErrors({ ...NO_ERRORS, fields: { handle: "This handle is already used" } });
      else setApiErrors(pageErrors(error, sent));
      notifyError(error);
      return false;
    }
  }

  async function publish(note: string | undefined): Promise<boolean> {
    if (dirty && !(await saveDraft({}, true))) return false;
    try {
      await publishPage({ id: page.id, body: note ? { note } : {} }).unwrap();
      notifySaved(page.kind === "PAGE" ? `${title.trim()} is live` : `${title.trim()} published`);
      return true;
    } catch (error) {
      notifyError(error);
      return false;
    }
  }

  async function schedule(publishAt: string | null): Promise<boolean> {
    const ok = await saveDraft({ publishAt }, true);
    if (ok)
      notifySaved(
        publishAt ? `Scheduled to publish ${formatDateTime(publishAt)}` : "Schedule cancelled. The draft is saved.",
      );
    return ok;
  }

  const unpublish = (status: "DRAFT" | "ARCHIVED", message: string) =>
    unpublishPage({ id: page.id, body: { status } })
      .unwrap()
      .then(() => notifySaved(message), notifyError);

  const labelOf = (b: Block | undefined) => (b ? (defsByType.get(b.type)?.label ?? b.type) : "Block");
  const clearBlockErrors = (id: string) =>
    setApiErrors((e) => {
      if (!e.blocks[id]) return e;
      const rest = { ...e.blocks };
      delete rest[id];
      return { ...e, blocks: rest };
    });

  const actions: OutlineActions = {
    select: setSelectedId,
    moveBy: (id, delta) => {
      const next = moveBy(blocks, id, delta);
      setBlocks(next);
      const loc = findBlock(next, id);
      if (loc) setAnnouncement(`${labelOf(loc.block)} moved to position ${loc.index + 1} of ${loc.siblings}`);
    },
    moveTo: (id, parentId, index) => {
      const moving = findBlock(blocks, id);
      if (!moving) return;
      if (parentId !== null && defsByType.get(moving.block.type)?.container) {
        toast.error("Containers can't be placed inside other containers.");
        return;
      }
      if (parentId !== moving.parentId && !hasRoom(blocks, parentId)) {
        toast.error(parentId ? "That container is full." : "The page has the maximum number of blocks.");
        return;
      }
      const next = moveBlock(blocks, id, parentId, index);
      setBlocks(next);
      const loc = findBlock(next, id);
      if (loc && next !== blocks)
        setAnnouncement(
          `${labelOf(loc.block)} moved to position ${loc.index + 1} of ${loc.siblings}${
            loc.parentId ? ` in ${labelOf(findBlock(next, loc.parentId)?.block)}` : ""
          }`,
        );
    },
    duplicate: (id) => {
      const { tree, id: copy } = duplicateBlock(blocks, id);
      setBlocks(tree);
      if (copy) setSelectedId(copy);
    },
    remove: (id) => {
      const before = blocks;
      const label = labelOf(findBlock(blocks, id)?.block);
      setBlocks(removeBlock(blocks, id));
      if (selectedId && (selectedId === id || !findBlock(removeBlock(blocks, id), selectedId))) setSelectedId(null);
      clearBlockErrors(id);
      toast(`${label} removed`, { action: { label: "Undo", onClick: () => setBlocks(before) } });
    },
    add: (parentId) => setLibrary({ parentId }),
  };

  function addBlock(def: BlockDef) {
    const parentId = library?.parentId ?? null;
    const block: Block = { id: newBlockId(), type: def.type, props: defaultProps(def) };
    if (def.container) block.children = [];
    const list = parentId ? (findBlock(blocks, parentId)?.block.children ?? []) : blocks;
    setBlocks(insertBlock(blocks, parentId, list.length, block));
    setSelectedId(block.id!);
    setLibrary(null);
    setAnnouncement(`${def.label} added`);
  }

  const selected = selectedId ? findBlock(blocks, selectedId) : null;
  const state = pageState(page);

  return (
    <>
      <BackLink />
      <PageHeader
        title={page.title}
        description={`${KIND_LABEL[page.kind]} · ${page.kind === "PAGE" ? `/pages/${page.handle}` : page.handle} · updated ${formatDateTime(page.updatedAt)}`}
        actions={
          canWrite && (
            <div className="flex flex-wrap gap-2">
              {page.kind === "PAGE" && (
                <PreviewDialog
                  page={page}
                  dirty={dirty}
                  disabled={readOnly || busy}
                  onSave={() => saveDraft({}, true)}
                />
              )}
              <ScheduleDialog page={page} disabled={readOnly || busy} onSchedule={schedule} />
              <PublishDialog page={page} dirty={dirty} disabled={readOnly || busy} onPublish={publish} />
              <StatusActions page={page} disabled={readOnly || busy} onStatus={unpublish} />
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Status">
        <Badge variant={STATE_BADGE[state]}>{PAGE_STATE_LABEL[state]}</Badge>
        {page.published && page.hasUnpublishedChanges && state !== "archived" && (
          <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">
            Saved draft differs from version {page.published.number}
          </Badge>
        )}
        {dirty && <Badge variant="secondary">Unsaved changes</Badge>}
        {page.publishAt && <span className="text-muted-foreground">Publishes {formatDateTime(page.publishAt)}</span>}
        {page.status === "ACTIVE" && page.publishedAt && (
          <span className="text-muted-foreground">
            Live since {formatDateTime(page.publishedAt)}
            {page.published ? ` (version ${page.published.number})` : ""}
          </span>
        )}
      </div>

      <div className="mb-4 space-y-3">
        {conflict && (
          <Alert variant="destructive">
            <AlertTitle>Someone else changed this page</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Your changes can&apos;t be saved over theirs. Reload to get the latest version; unsaved edits here are
                lost.
              </p>
              <Button size="sm" variant="outline" onClick={reload}>
                <RotateCcwIcon /> Reload latest version
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {lockedTypes.length > 0 && (
          <Alert>
            <AlertTitle>Read only</AlertTitle>
            <AlertDescription>
              This page contains {lockedTypes.map((t) => defsByType.get(t)?.label ?? t).join(", ")} blocks, which need a
              permission you don&apos;t have. Ask someone who can edit custom HTML to make changes.
            </AlertDescription>
          </Alert>
        )}
        {apiErrors.general.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4">
                {apiErrors.general.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void saveDraft();
        }}
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <Section
            title="Blocks"
            description="Select a block to edit it. Drag the handle or use the arrows to reorder."
            actions={
              !readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!hasRoom(blocks, null)}
                  onClick={() => setLibrary({ parentId: null })}
                >
                  <PlusIcon /> Add block
                </Button>
              )
            }
          >
            <BlockOutline
              tree={blocks}
              defs={defsByType}
              selectedId={selectedId}
              errorIds={errorIds}
              readOnly={readOnly}
              actions={actions}
            />
            {showErrors && errorIds.size > 0 && (
              <p className="mt-3 text-sm text-destructive">
                {errorIds.size === 1 ? "A block needs" : `${errorIds.size} blocks need`} attention.
              </p>
            )}
          </Section>

          <section className="rounded-lg border bg-card p-5" aria-label="Selected block">
            {selected ? (
              <BlockInspector
                key={selected.block.id}
                block={selected.block}
                def={defsByType.get(selected.block.type)}
                errors={blockErrors(selected.block.id!)}
                readOnly={readOnly}
                onChange={(next) => {
                  setBlocks((tree) => updateBlock(tree, next.id!, () => next));
                  clearBlockErrors(next.id!);
                }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a block in the outline to edit its content and visibility.
              </p>
            )}
          </section>
        </div>

        <Section title="Page details" description="The title, address and how the page shows up in search results.">
          <div className="grid gap-6 lg:grid-cols-2">
            <FieldGroup>
              <Field data-invalid={fieldError("title") ? true : undefined}>
                <FieldLabel htmlFor="page-title">Title</FieldLabel>
                <Input
                  id="page-title"
                  value={title}
                  maxLength={200}
                  disabled={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <FieldError>{fieldError("title")}</FieldError>
              </Field>
              <Field data-invalid={fieldError("handle") ? true : undefined}>
                <FieldLabel htmlFor="page-handle">Handle</FieldLabel>
                <Input
                  id="page-handle"
                  value={handle}
                  maxLength={120}
                  className="font-mono"
                  disabled={readOnly}
                  onChange={(e) => setHandle(e.target.value.trim())}
                />
                <FieldDescription>
                  {page.kind === "PAGE"
                    ? "Part of the page URL. Changing it redirects the old URL to the new one."
                    : "Pages use this handle in their Global section blocks; changing it breaks those references."}
                </FieldDescription>
                <FieldError>{fieldError("handle")}</FieldError>
              </Field>
            </FieldGroup>
            {page.kind === "PAGE" && (
              <FieldGroup>
                <Field data-invalid={fieldError("seo") ? true : undefined}>
                  <FieldLabel htmlFor="seo-title">Search title</FieldLabel>
                  <Input
                    id="seo-title"
                    value={seo.title ?? ""}
                    maxLength={200}
                    placeholder={title}
                    disabled={readOnly}
                    onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  />
                  <FieldError>{fieldError("seo")}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="seo-description">Meta description</FieldLabel>
                  <Textarea
                    id="seo-description"
                    rows={2}
                    maxLength={500}
                    value={seo.description ?? ""}
                    disabled={readOnly}
                    onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="seo-canonical">Canonical URL</FieldLabel>
                    <Input
                      id="seo-canonical"
                      value={seo.canonical ?? ""}
                      disabled={readOnly}
                      onChange={(e) => setSeo({ ...seo, canonical: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="seo-og">Share image URL</FieldLabel>
                    <Input
                      id="seo-og"
                      value={seo.ogImage ?? ""}
                      disabled={readOnly}
                      onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
                    />
                  </Field>
                </div>
                <Field orientation="horizontal">
                  <Switch
                    id="seo-noindex"
                    checked={!!seo.noindex}
                    disabled={readOnly}
                    onCheckedChange={(on) => setSeo({ ...seo, noindex: on })}
                  />
                  <FieldLabel htmlFor="seo-noindex">Hide from search engines</FieldLabel>
                </Field>
              </FieldGroup>
            )}
          </div>
        </Section>

        {!readOnly && (
          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
            {showErrors && invalid && <p className="text-sm text-destructive">Fix the highlighted fields.</p>}
            {dirty && !(showErrors && invalid) && <p className="text-sm text-muted-foreground">Unsaved changes</p>}
            <Button type="submit" disabled={busy || !dirty}>
              {save.isLoading ? "Saving…" : "Save draft"}
            </Button>
          </div>
        )}
      </form>

      <div className="mt-6" role="region" aria-label="Versions">
        <VersionsCard page={page} canWrite={canWrite && lockedTypes.length === 0} dirty={dirty} />
      </div>

      <BlockLibraryDialog
        open={library !== null}
        onOpenChange={(open) => !open && setLibrary(null)}
        defs={allowedDefs}
        intoContainer={!!library?.parentId}
        onPick={addBlock}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

function collectTypes(tree: Block[]): string[] {
  return tree.flatMap((b) => [b.type, ...collectTypes(b.children ?? [])]);
}

// Take the page offline (back to draft), archive it, or restore an archived page as a draft.
function StatusActions({
  page,
  disabled,
  onStatus,
}: {
  page: AdminPage;
  disabled: boolean;
  onStatus: (status: "DRAFT" | "ARCHIVED", message: string) => Promise<unknown>;
}) {
  return (
    <>
      {page.status === "ACTIVE" && (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" disabled={disabled}>
              <EyeOffIcon /> Unpublish
            </Button>
          }
          title={`Unpublish ${page.title}?`}
          description={
            page.kind === "PAGE"
              ? "The page disappears from the storefront. The draft and its versions are kept, so you can publish it again."
              : "The section stops showing on pages that use it. You can publish it again later."
          }
          confirmLabel="Unpublish"
          onConfirm={() => onStatus("DRAFT", `${page.title} is offline`)}
        />
      )}
      {page.status === "ARCHIVED" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => void onStatus("DRAFT", `${page.title} restored as a draft`)}
        >
          Restore as draft
        </Button>
      ) : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" disabled={disabled}>
              <ArchiveIcon /> Archive
            </Button>
          }
          title={`Archive ${page.title}?`}
          description="It goes offline and any scheduled publish is cancelled. Versions are kept and you can restore it as a draft later."
          confirmLabel="Archive"
          destructive
          onConfirm={() => onStatus("ARCHIVED", `${page.title} archived`)}
        />
      )}
    </>
  );
}
