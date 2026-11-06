"use client";

import { useState, type DragEvent } from "react";
import {
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  IndentIcon,
  OutdentIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminCategoriesIdMutation,
  useGetV1AdminCategoriesQuery,
  usePostV1AdminCategoriesMutation,
  usePutV1AdminCategoriesIdMutation,
  type GetV1AdminCategoriesApiResponse,
  type PutV1AdminCategoriesIdApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { notifyError, notifySaved } from "../../lib/notify";
import { cleanSeo, readSeo, slug, type Seo } from "../products/product-form";
import {
  applyPlacements,
  buildTree,
  flatten,
  isWithin,
  keyboardMove,
  moveNode,
  type DropPosition,
  type KeyboardMove,
  type Placement,
} from "./tree";

type Category = GetV1AdminCategoriesApiResponse[number];
type CategoryBody = PutV1AdminCategoriesIdApiArg["body"];

const ROOT = "__root";

// What a PUT needs to keep a category as it is apart from the changed fields. Description and
// custom fields are left out so the API keeps the stored ones.
function bodyFor(c: Category, change: Partial<CategoryBody> = {}): CategoryBody {
  return {
    handle: c.handle,
    name: c.name,
    parentId: c.parentId,
    position: c.position,
    seo: cleanSeo(readSeo(c.seo)),
    version: c.version,
    ...change,
  };
}

// Category tree (spec §6.2): drag a category before, after or into another one; the arrow
// buttons do the same from the keyboard. Only the categories whose place changed are saved.
export function CategoriesScreen() {
  const categories = useGetV1AdminCategoriesQuery({});
  const canWrite = useCan("categories.write");
  const [updateCategory] = usePutV1AdminCategoriesIdMutation();
  // placements being saved, drawn straight away
  const [pending, setPending] = useState<Placement[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; where: DropPosition } | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const rows = categories.data ?? [];
  const shown = pending ? applyPlacements(rows, pending) : rows;
  const nodes = flatten(buildTree(shown));

  async function persist(placements: Placement[] | null, label: string) {
    if (!placements || placements.length === 0 || pending) return;
    setPending(placements);
    try {
      // one at a time, each with the version it was read at
      for (const p of placements) {
        const current = rows.find((r) => r.id === p.id)!;
        await updateCategory({
          id: p.id,
          body: bodyFor(current, { parentId: p.parentId, position: p.position }),
        }).unwrap();
      }
      notifySaved(`${label} moved`);
    } catch (error) {
      notifyError(error);
    } finally {
      // the list refetches after every PUT (Catalog tag), so the saved order is what remains
      setPending(null);
    }
  }

  function dropZone(e: DragEvent<HTMLElement>): DropPosition {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    return y < 0.25 ? "before" : y > 0.75 ? "after" : "inside";
  }

  const nameOf = (id: string) => rows.find((r) => r.id === id)?.name ?? "Category";

  return (
    <>
      <PageHeader
        title="Categories"
        description="The storefront's category tree. Drag a category onto another to nest it, or above or below to reorder."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <PlusIcon /> New category
            </Button>
          )
        }
      />
      {categories.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(categories.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="rounded-lg border bg-card p-2">
        {categories.isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
        {!categories.isLoading && nodes.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No categories yet.</p>
        )}
        <ul role="tree" aria-label="Categories" aria-busy={!!pending} className="space-y-0.5">
          {nodes.map((node) => {
            const target = drop?.id === node.id ? drop.where : null;
            const move = (m: KeyboardMove) => persist(keyboardMove(shown, node.id, m), node.name);
            return (
              <li
                key={node.id}
                role="treeitem"
                aria-level={node.depth + 1}
                aria-selected={false}
                draggable={canWrite && !pending}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", node.id);
                  setDragging(node.id);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDrop(null);
                }}
                onDragOver={(e) => {
                  if (!dragging || isWithin(shown, node.id, dragging)) return;
                  e.preventDefault();
                  const where = dropZone(e);
                  if (drop?.id !== node.id || drop.where !== where) setDrop({ id: node.id, where });
                }}
                onDragLeave={() => setDrop((d) => (d?.id === node.id ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = dragging;
                  setDragging(null);
                  setDrop(null);
                  if (id) void persist(moveNode(shown, id, node.id, dropZone(e)), nameOf(id));
                }}
                style={{ paddingLeft: `${node.depth * 1.5 + 0.25}rem` }}
                className={cn(
                  "group flex items-center gap-2 rounded-md border border-transparent py-1 pr-1 text-sm",
                  dragging === node.id && "opacity-40",
                  target === "inside" && "border-primary bg-accent",
                  target === "before" && "border-t-primary",
                  target === "after" && "border-b-primary",
                )}
              >
                {canWrite && (
                  <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{node.name}</span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{node.handle}</span>
                </span>
                {canWrite && (
                  <span className="flex shrink-0 gap-0.5 opacity-60 group-focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Move ${node.name} up`}
                      disabled={!!pending}
                      onClick={() => move("up")}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Move ${node.name} down`}
                      disabled={!!pending}
                      onClick={() => move("down")}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Nest ${node.name} under the category above`}
                      disabled={!!pending}
                      onClick={() => move("indent")}
                    >
                      <IndentIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Move ${node.name} out one level`}
                      disabled={!!pending || !node.parentId}
                      onClick={() => move("outdent")}
                    >
                      <OutdentIcon />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Edit ${node.name}`}
                      onClick={() => setEditing(node)}
                    >
                      <PencilIcon />
                    </Button>
                    <ArchiveButton category={node} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {canWrite && dragging && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragging;
              setDragging(null);
              setDrop(null);
              void persist(moveNode(shown, id, null, "inside"), nameOf(id));
            }}
            className="mt-1 rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground"
          >
            Drop here to move to the top level
          </div>
        )}
      </div>
      {editing && (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          categories={rows}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ArchiveButton({ category }: { category: Category }) {
  const [archive] = useDeleteV1AdminCategoriesIdMutation();
  return (
    <ConfirmDialog
      trigger={
        <Button size="icon-xs" variant="ghost" aria-label={`Archive ${category.name}`}>
          <ArchiveIcon />
        </Button>
      }
      title={`Archive ${category.name}?`}
      description="It leaves the storefront and its products are unlinked from it. Categories with subcategories can't be archived: move or archive those first."
      confirmLabel="Archive category"
      destructive
      onConfirm={() =>
        archive({ id: category.id })
          .unwrap()
          .then(() => notifySaved(`${category.name} archived`), notifyError)
      }
    />
  );
}

function CategoryDialog({
  category,
  categories,
  onClose,
}: {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [handle, setHandle] = useState(category?.handle ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? ROOT);
  const [seo, setSeo] = useState<Seo>(readSeo(category?.seo));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createCategory, create] = usePostV1AdminCategoriesMutation();
  const [updateCategory, update] = usePutV1AdminCategoriesIdMutation();
  const handleValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle);
  // a category can't move under itself or its own subcategories
  const parents = categories.filter((c) => !category || !isWithin(categories, c.id, category.id));
  const siblingsAt = (parent: string | null) =>
    categories.filter((c) => c.parentId === parent && c.id !== category?.id);

  function submit() {
    const parent = parentId === ROOT ? null : parentId;
    const onError = (error: unknown) => {
      setErrors(fieldErrors(error));
      notifyError(error);
    };
    if (category) {
      const moved = parent !== category.parentId;
      updateCategory({
        id: category.id,
        body: bodyFor(category, {
          name: name.trim(),
          handle,
          parentId: parent,
          // a new parent puts it last among its new siblings
          position: moved ? siblingsAt(parent).length : category.position,
          seo: cleanSeo(seo),
        }),
      })
        .unwrap()
        .then(() => {
          notifySaved(`${name.trim()} saved`);
          onClose();
        }, onError);
    } else {
      createCategory({
        body: { name: name.trim(), handle, parentId: parent, position: siblingsAt(parent).length, seo: cleanSeo(seo) },
      })
        .unwrap()
        .then(() => {
          notifySaved(`${name.trim()} created`);
          onClose();
        }, onError);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && handleValid) submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
            <DialogDescription>
              {category
                ? "Changing the handle redirects the old URL to the new one."
                : "It's added at the end of its level."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                required
                maxLength={200}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!category && (!handle || handle === slug(name))) setHandle(slug(e.target.value));
                }}
              />
              <FieldError>{errors.name?.[0]}</FieldError>
            </Field>
            <Field data-invalid={(handle && !handleValid) || errors.handle ? true : undefined}>
              <FieldLabel htmlFor="category-handle">Handle</FieldLabel>
              <Input
                id="category-handle"
                required
                className="font-mono"
                value={handle}
                onChange={(e) => setHandle(e.target.value.trim())}
              />
              <FieldError>
                {handle && !handleValid ? "Lowercase letters, numbers and dashes" : errors.handle?.[0]}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="category-parent">Parent</FieldLabel>
              <Select value={parentId} onValueChange={(v) => setParentId(String(v ?? ROOT))}>
                <SelectTrigger id="category-parent" className="w-full">
                  <SelectValue>{categories.find((c) => c.id === parentId)?.name ?? "None (top level)"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>None (top level)</SelectItem>
                  {parents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="category-seo-title">SEO title</FieldLabel>
              <Input
                id="category-seo-title"
                maxLength={200}
                value={seo.title ?? ""}
                onChange={(e) => setSeo({ ...seo, title: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="category-seo-description">Meta description</FieldLabel>
              <Textarea
                id="category-seo-description"
                rows={2}
                maxLength={500}
                value={seo.description ?? ""}
                onChange={(e) => setSeo({ ...seo, description: e.target.value })}
              />
            </Field>
            <Field orientation="horizontal">
              <Switch
                id="category-noindex"
                checked={!!seo.noindex}
                onCheckedChange={(on) => setSeo({ ...seo, noindex: on })}
              />
              <div>
                <FieldLabel htmlFor="category-noindex">Hide from search engines</FieldLabel>
                <FieldDescription>Keeps the category page out of search results.</FieldDescription>
              </div>
            </Field>
            {errors._form && <FieldError>{errors._form[0]}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading || update.isLoading || !name.trim() || !handleValid}>
              {category ? "Save category" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
