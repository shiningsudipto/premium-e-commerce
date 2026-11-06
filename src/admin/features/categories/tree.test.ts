import { describe, expect, it } from "vitest";
import { applyPlacements, buildTree, flatten, isWithin, keyboardMove, moveNode, type FlatCategory } from "./tree";

// men (0) ─ shirts (0), trousers (1)
// women (1) ─ dresses (0)
// sale (2)
const rows: FlatCategory[] = [
  { id: "women", parentId: null, position: 1, name: "Women" },
  { id: "men", parentId: null, position: 0, name: "Men" },
  { id: "sale", parentId: null, position: 2, name: "Sale" },
  { id: "trousers", parentId: "men", position: 1, name: "Trousers" },
  { id: "shirts", parentId: "men", position: 0, name: "Shirts" },
  { id: "dresses", parentId: "women", position: 0, name: "Dresses" },
];

const order = (list: FlatCategory[]) => flatten(buildTree(list)).map((n) => `${"-".repeat(n.depth)}${n.id}`);

describe("category tree", () => {
  it("builds the tree in sibling order and keeps orphans at the root", () => {
    expect(order(rows)).toEqual(["men", "-shirts", "-trousers", "women", "-dresses", "sale"]);
    expect(order([...rows, { id: "lost", parentId: "archived", position: 9, name: "Lost" }]).at(-1)).toBe("lost");
  });

  it("knows descendants", () => {
    expect(isWithin(rows, "shirts", "men")).toBe(true);
    expect(isWithin(rows, "men", "men")).toBe(true);
    expect(isWithin(rows, "dresses", "men")).toBe(false);
  });

  it("reorders among siblings and returns only changed rows", () => {
    expect(moveNode(rows, "trousers", "shirts", "before")).toEqual([
      { id: "trousers", parentId: "men", position: 0 },
      { id: "shirts", parentId: "men", position: 1 },
    ]);
    expect(moveNode(rows, "sale", "men", "after")).toEqual([
      { id: "sale", parentId: null, position: 1 },
      { id: "women", parentId: null, position: 2 },
    ]);
    // dropping where it already is changes nothing
    expect(moveNode(rows, "trousers", "shirts", "after")).toEqual([]);
  });

  it("re-parents and closes the gap it leaves", () => {
    const moved = moveNode(rows, "shirts", "women", "inside")!;
    expect(moved).toEqual([
      { id: "shirts", parentId: "women", position: 1 },
      { id: "trousers", parentId: "men", position: 0 },
    ]);
    expect(order(applyPlacements(rows, moved))).toEqual(["men", "-trousers", "women", "-dresses", "-shirts", "sale"]);
    expect(moveNode(rows, "dresses", null, "inside")).toEqual([{ id: "dresses", parentId: null, position: 3 }]);
  });

  it("refuses moves under itself", () => {
    expect(moveNode(rows, "men", "shirts", "inside")).toBeNull();
    expect(moveNode(rows, "men", "men", "before")).toBeNull();
    expect(moveNode(rows, "men", null, "before")).toBeNull();
  });

  it("moves with the keyboard", () => {
    expect(keyboardMove(rows, "men", "up")).toBeNull();
    expect(keyboardMove(rows, "men", "down")).toEqual([
      { id: "women", parentId: null, position: 0 },
      { id: "men", parentId: null, position: 1 },
    ]);
    expect(keyboardMove(rows, "women", "indent")).toEqual([
      { id: "women", parentId: "men", position: 2 },
      { id: "sale", parentId: null, position: 1 },
    ]);
    expect(keyboardMove(rows, "dresses", "outdent")).toEqual([
      { id: "dresses", parentId: null, position: 2 },
      { id: "sale", parentId: null, position: 3 },
    ]);
    expect(keyboardMove(rows, "men", "outdent")).toBeNull();
  });
});
