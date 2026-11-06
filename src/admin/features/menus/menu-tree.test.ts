import { describe, expect, it } from "vitest";
import {
  countItems,
  getAt,
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
} from "./menu-tree";

const item = (label: string, children?: MenuItem[]): MenuItem => ({
  label,
  type: "category",
  ref: label.toLowerCase(),
  ...(children ? { children } : {}),
});

// A ─ A1, A2
// B
// C
const tree = (): MenuItem[] => [item("A", [item("A1"), item("A2")]), item("B"), item("C")];
const labels = (items: MenuItem[]): unknown =>
  items.map((i) => (i.children?.length ? [i.label, labels(i.children)] : i.label));

describe("menu tree", () => {
  it("reads, updates, inserts and removes at a path without mutating", () => {
    const t = tree();
    expect(getAt(t, [0, 1])?.label).toBe("A2");
    expect(labels(updateAt(t, [0, 0], { label: "X" }))).toEqual([["A", ["X", "A2"]], "B", "C"]);
    expect(labels(insertAt(t, [1], 0, item("B1")))).toEqual([["A", ["A1", "A2"]], ["B", ["B1"]], "C"]);
    expect(labels(removeAt(t, [0, 0]))).toEqual([["A", ["A2"]], "B", "C"]);
    expect(labels(t)).toEqual([["A", ["A1", "A2"]], "B", "C"]);
    expect(countItems(t)).toBe(5);
  });

  it("moves up and down among siblings", () => {
    expect(labels(moveBy(tree(), [1], -1))).toEqual(["B", ["A", ["A1", "A2"]], "C"]);
    expect(labels(moveBy(tree(), [0, 0], 1))).toEqual([["A", ["A2", "A1"]], "B", "C"]);
    expect(labels(moveBy(tree(), [2], 1))).toEqual(labels(tree()));
  });

  it("indents under the item above and outdents after the parent", () => {
    expect(labels(indent(tree(), [1]))).toEqual([["A", ["A1", "A2", "B"]], "C"]);
    expect(labels(indent(tree(), [0]))).toEqual(labels(tree()));
    expect(labels(outdent(tree(), [0, 0]))).toEqual([["A", ["A2"]], "A1", "B", "C"]);
    expect(labels(outdent(tree(), [1]))).toEqual(labels(tree()));
  });

  it("drags to any list, adjusting for the removed item", () => {
    // C before A
    expect(labels(moveTo(tree(), [2], [], 0))).toEqual(["C", ["A", ["A1", "A2"]], "B"]);
    // A to the end of the top level (index 3 = after C, before the move)
    expect(labels(moveTo(tree(), [0], [], 3))).toEqual(["B", "C", ["A", ["A1", "A2"]]]);
    // A2 into B, after A has been shortened
    expect(labels(moveTo(tree(), [0, 1], [1], 0))).toEqual([["A", ["A1"]], ["B", ["A2"]], "C"]);
    // A into C: C's path shifts from [2] to [1] once A is removed
    expect(labels(moveTo(tree(), [0], [2], 0))).toEqual(["B", ["C", [["A", ["A1", "A2"]]]]]);
    // an item can't go inside itself
    expect(labels(moveTo(tree(), [0], [0, 1], 0))).toEqual(labels(tree()));
  });

  it("validates like the API", () => {
    const bad: MenuItem[] = [
      { label: "", type: "url", url: "/x" },
      { label: "Home", type: "url" },
      { label: "Bags", type: "category", children: [{ label: "Sale", type: "collection", ref: " " }] },
    ];
    expect(validateMenu(bad)).toEqual({
      "0": "Label is required",
      "1": "Enter a URL",
      "2": "Choose a category",
      "2.0": "Choose a collection",
    });
    expect(validateMenu(tree())).toEqual({});
    const wide = item(
      "Wide",
      Array.from({ length: 51 }, (_, i) => item(`C${i}`)),
    );
    expect(validateMenu([wide])).toEqual({ "0": "At most 50 sub-items" });
    expect(validateMenu(Array.from({ length: 201 }, (_, i) => item(`I${i}`)))[""]).toBe("At most 200 top-level items");
  });

  it("saves only the fields each type uses and reads stored JSON defensively", () => {
    expect(
      toApiItems([
        { label: " Shop ", type: "url", url: "/shop", ref: "stale", children: [] },
        { label: "Bags", type: "category", ref: "bags", url: "stale" },
      ]),
    ).toEqual([
      { label: "Shop", type: "url", url: "/shop" },
      { label: "Bags", type: "category", ref: "bags" },
    ]);
    expect(
      readItems([{ label: "A", type: "page", ref: "about" }, { label: 1 }, null, { label: "B", type: "nope" }]),
    ).toEqual([{ label: "A", type: "page", ref: "about" }]);
    expect(readItems("nope")).toEqual([]);
  });
});
