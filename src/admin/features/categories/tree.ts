// Category tree helpers (pure). The API stores categories flat (parentId + position among
// siblings); the screen works on a tree and sends back only the rows a move changed.

export type FlatCategory = { id: string; parentId: string | null; position: number; name: string };
export type TreeNode<T extends FlatCategory> = T & { depth: number; children: TreeNode<T>[] };
export type DropPosition = "before" | "after" | "inside";
export type Placement = { id: string; parentId: string | null; position: number };

const bySiblingOrder = (a: FlatCategory, b: FlatCategory) => a.position - b.position || a.name.localeCompare(b.name);

// Rows whose parent is missing (archived, or not loaded) are shown at the root rather than lost.
export function buildTree<T extends FlatCategory>(rows: readonly T[]): TreeNode<T>[] {
  const ids = new Set(rows.map((r) => r.id));
  const childrenOf = new Map<string | null, T[]>();
  for (const row of rows) {
    const parent = row.parentId && ids.has(row.parentId) ? row.parentId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), row]);
  }
  const build = (parent: string | null, depth: number, seen: Set<string>): TreeNode<T>[] =>
    [...(childrenOf.get(parent) ?? [])]
      .sort(bySiblingOrder)
      .filter((row) => !seen.has(row.id))
      .map((row) => ({ ...row, depth, children: build(row.id, depth + 1, new Set([...seen, row.id])) }));
  return build(null, 0, new Set());
}

// Depth-first order, as the tree is drawn.
export function flatten<T extends FlatCategory>(nodes: TreeNode<T>[]): TreeNode<T>[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

// True when `id` is `ancestorId` or sits anywhere below it.
export function isWithin(rows: readonly FlatCategory[], id: string, ancestorId: string): boolean {
  const parentOf = new Map(rows.map((r) => [r.id, r.parentId]));
  let current: string | null | undefined = id;
  for (let guard = 0; current && guard <= rows.length; guard++) {
    if (current === ancestorId) return true;
    current = parentOf.get(current);
  }
  return false;
}

function siblings(rows: readonly FlatCategory[], parentId: string | null) {
  return rows.filter((r) => r.parentId === parentId).sort(bySiblingOrder);
}

// Moves `id` before/after/inside `targetId` (null target with "inside" = to the end of the root).
// Siblings at the old and new place are renumbered 0..n-1; only rows that actually changed are
// returned, in an order that is safe to save one by one. Null when the move is impossible
// (onto itself or under its own descendant).
export function moveNode(
  rows: readonly FlatCategory[],
  id: string,
  targetId: string | null,
  where: DropPosition,
): Placement[] | null {
  const node = rows.find((r) => r.id === id);
  if (!node) return null;
  if (targetId !== null) {
    if (!rows.some((r) => r.id === targetId)) return null;
    if (isWithin(rows, targetId, id)) return null;
  } else if (where !== "inside") return null;

  const target = targetId === null ? null : rows.find((r) => r.id === targetId)!;
  const newParent = where === "inside" ? targetId : (target?.parentId ?? null);
  const list = siblings(rows, newParent).filter((r) => r.id !== id);
  const index =
    where === "inside" ? list.length : list.findIndex((r) => r.id === targetId) + (where === "after" ? 1 : 0);
  list.splice(index, 0, node);

  const next = new Map<string, Placement>();
  list.forEach((r, position) => next.set(r.id, { id: r.id, parentId: newParent, position }));
  if (node.parentId !== newParent) {
    siblings(rows, node.parentId)
      .filter((r) => r.id !== id)
      .forEach((r, position) => next.set(r.id, { id: r.id, parentId: node.parentId, position }));
  }
  return [...next.values()].filter((p) => {
    const before = rows.find((r) => r.id === p.id)!;
    return before.parentId !== p.parentId || before.position !== p.position;
  });
}

export type KeyboardMove = "up" | "down" | "indent" | "outdent";

// The keyboard alternative to dragging, expressed as a drop on a neighbour.
export function keyboardMove(rows: readonly FlatCategory[], id: string, move: KeyboardMove): Placement[] | null {
  const node = rows.find((r) => r.id === id);
  if (!node) return null;
  const list = siblings(rows, node.parentId);
  const i = list.findIndex((r) => r.id === id);
  switch (move) {
    case "up":
      return i > 0 ? moveNode(rows, id, list[i - 1]!.id, "before") : null;
    case "down":
      return i < list.length - 1 ? moveNode(rows, id, list[i + 1]!.id, "after") : null;
    case "indent":
      return i > 0 ? moveNode(rows, id, list[i - 1]!.id, "inside") : null;
    case "outdent":
      return node.parentId ? moveNode(rows, id, node.parentId, "after") : null;
  }
}

// Applies placements to the flat list, for an optimistic redraw while the saves run.
export function applyPlacements<T extends FlatCategory>(rows: readonly T[], placements: Placement[]): T[] {
  const byId = new Map(placements.map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.id);
    return p ? { ...r, parentId: p.parentId, position: p.position } : r;
  });
}
