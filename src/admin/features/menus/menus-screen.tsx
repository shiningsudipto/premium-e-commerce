"use client";

import { useState, type DragEvent } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CornerDownRightIcon,
  GripVerticalIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  PlusIcon,
  Trash2Icon,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminCategoriesQuery,
  useGetV1AdminCollectionsQuery,
  useGetV1AdminMenusQuery,
  usePutV1AdminMenusHandleMutation,
} from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import {
  MAX_LABEL,
  countItems,
  indent,
  insertAt,
  moveBy,
  moveTo,
  outdent,
  readItems,
  removeAt,
  toApiItems,
  updateAt,
  validateMenu,
  type MenuItem,
  type MenuItemType,
  type Path,
} from "./menu-tree";

type MenuDraft = { handle: string; name: string; items: MenuItem[]; version?: number; updatedAt?: string };
type Option = { value: string; label: string };

const TYPE_LABELS: Record<MenuItemType, string> = {
  category: "Category",
  collection: "Collection",
  page: "Page",
  product: "Product",
  url: "Link (URL)",
};

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Navigation menus (spec §9.3): the storefront reads a menu by handle (e.g. main, footer).
// Linked items store the category, collection, page or product *handle* in `ref`, as the seed
// data and storefront do; links store a `url`.
export function MenusScreen() {
  const menus = useGetV1AdminMenusQuery({});
  const [selected, setSelected] = useState<string | null>(null);
  // a new menu exists only here until its first save (PUT creates it)
  const [created, setCreated] = useState<MenuDraft | null>(null);

  const saved: MenuDraft[] = (menus.data ?? []).map((m) => ({ ...m, items: readItems(m.items) }));
  const all = created && !saved.some((m) => m.handle === created.handle) ? [...saved, created] : saved;
  const active = all.find((m) => m.handle === selected) ?? all[0] ?? null;

  return (
    <>
      <PageHeader
        title="Menus"
        description="Header, footer and mobile navigation. Drag items to reorder them, indent to nest. The storefront picks up a saved menu within seconds."
        actions={
          <NewMenuDialog
            existing={all.map((m) => m.handle)}
            onCreate={(draft) => {
              setCreated(draft);
              setSelected(draft.handle);
            }}
          />
        }
      />
      {menus.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(menus.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Menus" className="flex gap-1 overflow-x-auto lg:flex-col">
          {menus.isLoading
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)
            : all.map((m) => (
                <button
                  key={m.handle}
                  type="button"
                  aria-current={m.handle === active?.handle ? "true" : undefined}
                  onClick={() => setSelected(m.handle)}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
                >
                  <span className="block font-medium">{m.name}</span>
                  <span className="block font-mono text-[11px]">{m.handle}</span>
                </button>
              ))}
        </nav>
        {active ? (
          // remounting on a new version resets the draft to what was saved
          <MenuEditor
            key={`${active.handle}:${active.version ?? "new"}`}
            menu={active}
            onSaved={() => setCreated(null)}
          />
        ) : (
          !menus.isLoading && (
            <p className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
              No menus yet. Create one, e.g. with the handle <span className="font-mono">main</span>.
            </p>
          )
        )}
      </div>
    </>
  );
}

function MenuEditor({ menu, onSaved }: { menu: MenuDraft; onSaved: () => void }) {
  const categories = useGetV1AdminCategoriesQuery({});
  const collections = useGetV1AdminCollectionsQuery({});
  const [name, setName] = useState(menu.name);
  const [items, setItems] = useState<MenuItem[]>(menu.items);
  const [dragging, setDragging] = useState<Path | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saveMenu, save] = usePutV1AdminMenusHandleMutation();
  const errors = validateMenu(items);
  const dirty = name !== menu.name || JSON.stringify(items) !== JSON.stringify(menu.items) || !menu.version;

  const options: Partial<Record<MenuItemType, Option[]>> = {
    category: categories.data?.map((c) => ({ value: c.handle, label: c.name })),
    collection: collections.data?.map((c) => ({ value: c.handle, label: c.title })),
  };

  const drop = (parent: Path, index: number) => {
    if (dragging) setItems((t) => moveTo(t, dragging, parent, index));
    setDragging(null);
  };

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (Object.keys(errors).length || !name.trim()) {
          setShowErrors(true);
          return;
        }
        saveMenu({
          handle: menu.handle,
          body: {
            name: name.trim(),
            items: toApiItems(items),
            ...(menu.version !== undefined ? { version: menu.version } : {}),
          },
        })
          .unwrap()
          .then(() => {
            onSaved();
            notifySaved(`${name.trim()} saved. The storefront picks it up within seconds.`);
          }, notifyError);
      }}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <Field className="w-auto grow sm:max-w-sm" data-invalid={showErrors && !name.trim() ? true : undefined}>
          <FieldLabel htmlFor="menu-name">Name</FieldLabel>
          <Input id="menu-name" value={name} onChange={(e) => setName(e.target.value)} />
          <FieldError>{showErrors && !name.trim() ? "Required" : undefined}</FieldError>
        </Field>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{menu.handle}</span> · {countItems(items)} items
          {menu.updatedAt ? ` · updated ${formatDateTime(menu.updatedAt)}` : " · not saved yet"}
        </p>
      </header>

      {showErrors && errors[""] && (
        <Alert variant="destructive">
          <AlertDescription>{errors[""]}</AlertDescription>
        </Alert>
      )}

      <ItemList
        items={items}
        parent={[]}
        setItems={setItems}
        errors={showErrors ? errors : {}}
        options={options}
        dragging={dragging}
        setDragging={setDragging}
        drop={drop}
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setItems((t) => insertAt(t, [], t.length, { label: "", type: "url", url: "" }))}
        >
          <PlusIcon /> Add item
        </Button>
        <Button type="submit" size="sm" disabled={!dirty || save.isLoading}>
          {save.isLoading ? "Saving…" : "Save menu"}
        </Button>
      </footer>
    </form>
  );
}

type ListProps = {
  items: MenuItem[];
  parent: Path;
  setItems: (update: (items: MenuItem[]) => MenuItem[]) => void;
  errors: Record<string, string>;
  options: Partial<Record<MenuItemType, Option[]>>;
  dragging: Path | null;
  setDragging: (path: Path | null) => void;
  drop: (parent: Path, index: number) => void;
};

function ItemList(props: ListProps) {
  const { items, parent, dragging, drop } = props;
  if (items.length === 0 && parent.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">This menu has no items yet.</p>;
  }
  return (
    <ul className={cn("space-y-2", parent.length > 0 && "mt-2 border-l pl-4")}>
      {items.map((item, i) => (
        <ItemRow key={[...parent, i].join(".")} {...props} item={item} path={[...parent, i]} siblings={items.length} />
      ))}
      {dragging && (
        <li
          aria-hidden
          className="rounded-md border border-dashed py-1.5 text-center text-xs text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            drop(parent, items.length);
          }}
        >
          Drop here to place last{parent.length ? " in this group" : ""}
        </li>
      )}
    </ul>
  );
}

function ItemRow(props: ListProps & { item: MenuItem; path: Path; siblings: number }) {
  const { item, path, siblings, setItems, errors, options, setDragging, drop } = props;
  const [over, setOver] = useState(false);
  const key = path.join(".");
  const index = path[path.length - 1]!;
  const error = errors[key];
  const choices = options[item.type];
  const update = (patch: Partial<MenuItem>) => setItems((t) => updateAt(t, path, patch));

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    // dropping on an item places the dragged one before it
    drop(path.slice(0, -1), index);
  };

  return (
    <li>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-invalid={error ? true : undefined}
        className={cn(
          "flex flex-wrap items-start gap-2 rounded-md border bg-background p-2 data-[invalid=true]:border-destructive",
          over && "border-t-2 border-t-primary",
        )}
      >
        {/* only the handle drags, so text in the inputs stays selectable */}
        <span
          draggable
          title="Drag to move"
          className="mt-1.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", item.label);
            setDragging(path);
          }}
          onDragEnd={() => setDragging(null)}
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </span>
        <div className="grid min-w-0 grow gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)]">
          <Input
            aria-label="Label"
            placeholder="Label"
            value={item.label}
            maxLength={MAX_LABEL}
            className="h-8"
            onChange={(e) => update({ label: e.target.value })}
          />
          <Select value={item.type} onValueChange={(v) => v && update({ type: v as MenuItemType })}>
            <SelectTrigger aria-label="Link type" className="h-8 w-full" size="sm">
              <SelectValue>{TYPE_LABELS[item.type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.type === "url" ? (
            <Input
              aria-label="URL"
              placeholder="/pages/about or https://…"
              value={item.url ?? ""}
              className="h-8 font-mono text-xs"
              onChange={(e) => update({ url: e.target.value })}
            />
          ) : choices ? (
            <Select value={item.ref ?? ""} onValueChange={(v) => update({ ref: v ?? "" })}>
              <SelectTrigger aria-label={TYPE_LABELS[item.type]} className="h-8 w-full" size="sm">
                <SelectValue placeholder={`Choose a ${item.type}`}>
                  {choices.find((c) => c.value === item.ref)?.label ?? item.ref}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {choices.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              aria-label={`${TYPE_LABELS[item.type]} handle`}
              placeholder={`${item.type} handle`}
              value={item.ref ?? ""}
              className="h-8 font-mono text-xs"
              onChange={(e) => update({ ref: e.target.value })}
            />
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => setItems((t) => moveBy(t, path, -1))}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Move down"
            disabled={index === siblings - 1}
            onClick={() => setItems((t) => moveBy(t, path, 1))}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Indent (nest under the item above)"
            disabled={index === 0}
            onClick={() => setItems((t) => indent(t, path))}
          >
            <IndentIncreaseIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Outdent"
            disabled={path.length < 2}
            onClick={() => setItems((t) => outdent(t, path))}
          >
            <IndentDecreaseIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Add sub-item"
            onClick={() =>
              setItems((t) => insertAt(t, path, item.children?.length ?? 0, { label: "", type: "url", url: "" }))
            }
          >
            <CornerDownRightIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${item.label || "item"}${item.children?.length ? " and its sub-items" : ""}`}
            onClick={() => setItems((t) => removeAt(t, path))}
          >
            <Trash2Icon />
          </Button>
        </div>
        {error && <p className="w-full pl-6 text-xs text-destructive">{error}</p>}
      </div>
      {item.children && item.children.length > 0 && <ItemList {...props} items={item.children} parent={path} />}
    </li>
  );
}

function NewMenuDialog({ existing, onCreate }: { existing: string[]; onCreate: (draft: MenuDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> New menu
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const handle = String(form.get("handle")).trim();
            if (!HANDLE.test(handle)) return setError("Lowercase letters, numbers and dashes");
            if (existing.includes(handle)) return setError("A menu with this handle already exists");
            onCreate({ handle, name: String(form.get("name")).trim(), items: [] });
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>New menu</DialogTitle>
            <DialogDescription>Add items, then save. The storefront reads menus by handle.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="menu-new-name">Name</FieldLabel>
              <Input id="menu-new-name" name="name" required placeholder="e.g. Footer" />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="menu-new-handle">Handle</FieldLabel>
              <Input id="menu-new-handle" name="handle" required placeholder="e.g. footer" className="font-mono" />
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit">Create menu</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
