import type { PutV1AdminMenusHandleApiArg } from "../../store/api.generated";

// Pure operations on a menu tree. A path is the list of indexes from the root, so [1, 0] is
// the first child of the second top-level item. Every operation returns a new tree.

export type MenuItem = PutV1AdminMenusHandleApiArg["body"]["items"][number];
export type MenuItemType = MenuItem["type"];
export type Path = number[];

// API limits (content.menuItem): 200 top-level items, 50 children per item, labels up to 100.
export const MAX_ITEMS = 200;
export const MAX_CHILDREN = 50;
export const MAX_LABEL = 100;

const childrenOf = (items: MenuItem[], parent: Path): MenuItem[] | undefined => {
  let list: MenuItem[] | undefined = items;
  for (const i of parent) list = list?.[i]?.children;
  return parent.length === 0 ? items : list;
};

export function getAt(items: MenuItem[], path: Path): MenuItem | undefined {
  return childrenOf(items, path.slice(0, -1))?.[path[path.length - 1]!];
}

// Replaces the list at `parent` with what `edit` returns, copying only the branch on the way.
function editList(items: MenuItem[], parent: Path, edit: (list: MenuItem[]) => MenuItem[]): MenuItem[] {
  if (parent.length === 0) return edit(items);
  const [head, ...rest] = parent;
  return items.map((item, i) => (i === head ? { ...item, children: editList(item.children ?? [], rest, edit) } : item));
}

export function updateAt(items: MenuItem[], path: Path, patch: Partial<MenuItem>): MenuItem[] {
  const index = path[path.length - 1]!;
  return editList(items, path.slice(0, -1), (list) =>
    list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
  );
}

export function removeAt(items: MenuItem[], path: Path): MenuItem[] {
  const index = path[path.length - 1]!;
  return editList(items, path.slice(0, -1), (list) => list.filter((_, i) => i !== index));
}

export function insertAt(items: MenuItem[], parent: Path, index: number, item: MenuItem): MenuItem[] {
  return editList(items, parent, (list) => [...list.slice(0, index), item, ...list.slice(index)]);
}

// Up (-1) or down (+1) among its siblings; out of range is a no-op.
export function moveBy(items: MenuItem[], path: Path, delta: -1 | 1): MenuItem[] {
  const parent = path.slice(0, -1);
  const index = path[path.length - 1]!;
  const list = childrenOf(items, parent) ?? [];
  const target = index + delta;
  if (target < 0 || target >= list.length) return items;
  return editList(items, parent, (l) => {
    const next = [...l];
    [next[index], next[target]] = [next[target]!, next[index]!];
    return next;
  });
}

// Becomes the last child of the sibling above it.
export function indent(items: MenuItem[], path: Path): MenuItem[] {
  const index = path[path.length - 1]!;
  if (index === 0) return items;
  const item = getAt(items, path)!;
  const removed = removeAt(items, path);
  const newParent = [...path.slice(0, -1), index - 1];
  const siblings = getAt(removed, newParent)?.children ?? [];
  return insertAt(removed, newParent, siblings.length, item);
}

// Moves out of its parent, right after it.
export function outdent(items: MenuItem[], path: Path): MenuItem[] {
  if (path.length < 2) return items;
  const item = getAt(items, path)!;
  const parentPath = path.slice(0, -1);
  const removed = removeAt(items, path);
  return insertAt(removed, parentPath.slice(0, -1), parentPath[parentPath.length - 1]! + 1, item);
}

const isPrefix = (prefix: Path, path: Path) => prefix.length <= path.length && prefix.every((v, i) => v === path[i]);

// Drag and drop: moves the item at `from` to position `index` of the list at `toParent`
// (indexes as they are before the move). Dropping an item into itself is a no-op.
export function moveTo(items: MenuItem[], from: Path, toParent: Path, index: number): MenuItem[] {
  if (isPrefix(from, toParent)) return items;
  const item = getAt(items, from);
  if (!item) return items;
  const removed = removeAt(items, from);
  // removing `from` shifts later siblings (and their subtrees) up by one
  const depth = from.length - 1;
  const fromIndex = from[depth]!;
  const shift = (p: Path) =>
    p.length > depth && isPrefix(from.slice(0, -1), p) && p[depth]! > fromIndex
      ? [...p.slice(0, depth), p[depth]! - 1, ...p.slice(depth + 1)]
      : p;
  const parent = shift(toParent);
  const sameList = toParent.length === depth && isPrefix(from.slice(0, -1), toParent);
  const at = sameList && index > fromIndex ? index - 1 : index;
  return insertAt(removed, parent, at, item);
}

export function countItems(items: MenuItem[]): number {
  return items.reduce((n, item) => n + 1 + countItems(item.children ?? []), 0);
}

// Field-level problems keyed by path ("0.2"); "" holds tree-wide ones.
export function validateMenu(items: MenuItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (items.length > MAX_ITEMS) errors[""] = `At most ${MAX_ITEMS} top-level items`;
  const walk = (list: MenuItem[], parent: Path) =>
    list.forEach((item, i) => {
      const path = [...parent, i];
      const key = path.join(".");
      if (!item.label.trim()) errors[key] = "Label is required";
      else if (item.label.length > MAX_LABEL) errors[key] = `Label is at most ${MAX_LABEL} characters`;
      else if (item.type === "url" && !item.url?.trim()) errors[key] = "Enter a URL";
      else if (item.type !== "url" && !item.ref?.trim()) errors[key] = `Choose a ${item.type}`;
      else if ((item.children?.length ?? 0) > MAX_CHILDREN) errors[key] = `At most ${MAX_CHILDREN} sub-items`;
      walk(item.children ?? [], path);
    });
  walk(items, []);
  return errors;
}

// What is saved: url items keep only `url`, linked items only `ref`, and empty child lists go.
export function toApiItems(items: MenuItem[]): MenuItem[] {
  return items.map(({ label, type, ref, url, children }) => ({
    label: label.trim(),
    type,
    ...(type === "url" ? { url: url?.trim() } : { ref: ref?.trim() }),
    ...(children?.length ? { children: toApiItems(children) } : {}),
  }));
}

// Menus are stored as JSON the API validated on save; anything else is dropped rather than crashing the editor.
export function readItems(value: unknown): MenuItem[] {
  if (!Array.isArray(value)) return [];
  const types: MenuItemType[] = ["category", "collection", "page", "product", "url"];
  return value.flatMap((v): MenuItem[] => {
    if (!v || typeof v !== "object") return [];
    const o = v as Record<string, unknown>;
    if (typeof o.label !== "string" || !types.includes(o.type as MenuItemType)) return [];
    return [
      {
        label: o.label,
        type: o.type as MenuItemType,
        ...(typeof o.ref === "string" ? { ref: o.ref } : {}),
        ...(typeof o.url === "string" ? { url: o.url } : {}),
        ...(Array.isArray(o.children) && o.children.length ? { children: readItems(o.children) } : {}),
      },
    ];
  });
}
