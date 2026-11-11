import { describe, expect, it } from "vitest";
import {
  addChild,
  blankAction,
  blankCondition,
  emptyGroup,
  moveNode,
  nodeAt,
  readActions,
  readConditions,
  removeNode,
  summarizeAction,
  summarizeConditions,
  toActionsInput,
  toConditionsInput,
  updateNode,
  validateActions,
  validateConditions,
  wrapInGroup,
  type GroupCondition,
} from "./promotion-rules";

const tree: GroupCondition = {
  type: "all",
  conditions: [
    { type: "subtotal", min: 100000 },
    {
      type: "any",
      conditions: [
        { type: "country", in: ["BD"] },
        { type: "customer", firstOrder: true },
      ],
    },
  ],
};

describe("reading stored conditions", () => {
  it("treats {} and junk as no conditions", () => {
    expect(readConditions({})).toEqual(emptyGroup());
    expect(readConditions(null)).toEqual(emptyGroup());
    expect(readConditions({ type: "mystery" })).toEqual(emptyGroup());
  });

  it("wraps a single leaf in an all group and keeps groups as they are", () => {
    expect(readConditions({ type: "subtotal", min: 5 })).toEqual({
      type: "all",
      conditions: [{ type: "subtotal", min: 5 }],
    });
    expect(readConditions(tree)).toEqual(tree);
  });

  it("drops unknown children and bad fields", () => {
    expect(
      readConditions({
        type: "any",
        conditions: [
          { type: "nope" },
          { type: "contains", filter: { tags: ["sale", 3], vendors: [] }, minQuantity: "2" },
        ],
      }),
    ).toEqual({ type: "any", conditions: [{ type: "contains", filter: { tags: ["sale"] } }] });
  });
});

describe("tree editing", () => {
  it("finds, updates, adds, removes and moves nodes by path", () => {
    expect(nodeAt(tree, [1, 0])).toEqual({ type: "country", in: ["BD"] });
    const updated = updateNode(tree, [1, 0], () => ({ type: "country", in: ["US"] }));
    expect(nodeAt(updated, [1, 0])).toEqual({ type: "country", in: ["US"] });
    expect(nodeAt(tree, [1, 0])).toEqual({ type: "country", in: ["BD"] });

    const added = addChild(tree, [1], blankCondition("currency"));
    expect((nodeAt(added, [1]) as GroupCondition).conditions).toHaveLength(3);

    const removed = removeNode(tree, [1, 1]);
    expect((nodeAt(removed, [1]) as GroupCondition).conditions).toEqual([{ type: "country", in: ["BD"] }]);

    const moved = moveNode(tree, [1], -1);
    expect(moved.conditions[0]!.type).toBe("any");
    expect(moveNode(tree, [0], -1)).toEqual(tree);
  });

  it("switches a group between all and any, and wraps a leaf in a group", () => {
    const flipped = updateNode(tree, [], (g) => ({ ...(g as GroupCondition), type: "any" }));
    expect(flipped.type).toBe("any");
    const wrapped = wrapInGroup(tree, [0], "any");
    expect(nodeAt(wrapped, [0])).toEqual({ type: "any", conditions: [{ type: "subtotal", min: 100000 }] });
  });

  it("never turns the root into a leaf", () => {
    expect(updateNode(tree, [], () => ({ type: "subtotal", min: 1 }))).toBe(tree);
    expect(removeNode(tree, [])).toEqual(emptyGroup("all"));
  });
});

describe("validating conditions", () => {
  it("passes a valid tree", () => {
    expect(validateConditions(tree)).toEqual({});
  });

  it("reports problems by path", () => {
    const errors = validateConditions({
      type: "all",
      conditions: [
        { type: "subtotal" },
        { type: "weight", min: 10, max: 5 },
        { type: "item_count", min: Number.NaN },
        {
          type: "any",
          conditions: [
            { type: "country", in: ["Bangladesh"] },
            { type: "currency", in: [] },
          ],
        },
        { type: "customer" },
        { type: "customer", loggedIn: false, groupIds: ["g1"] },
        { type: "contains", filter: {}, minQuantity: 0 },
        { type: "shipping_method", rateIds: [] },
        { type: "affiliate", attributed: false, tierIds: ["t"] },
      ],
    });
    expect(Object.keys(errors).sort()).toEqual(["0", "1", "2", "3.0", "3.1", "4", "5", "6", "7", "8"]);
    expect(errors["1"]).toMatch(/minimum can't be above/);
  });
});

describe("condition payloads", () => {
  it("sends {} when there are no conditions, and leaves out empty groups and empty lists", () => {
    expect(toConditionsInput(emptyGroup())).toEqual({});
    expect(
      toConditionsInput({
        type: "all",
        conditions: [
          { type: "any", conditions: [] },
          { type: "contains", filter: { tags: [], productIds: ["p1"] }, minQuantity: 2 },
          { type: "customer", loggedIn: true, groupIds: [] },
        ],
      }),
    ).toEqual({
      type: "all",
      conditions: [
        { type: "contains", filter: { productIds: ["p1"] }, minQuantity: 2 },
        { type: "customer", loggedIn: true },
      ],
    });
  });

  it("summarizes in plain English", () => {
    expect(summarizeConditions(emptyGroup(), "BDT")).toBe("Every cart qualifies");
    expect(summarizeConditions(tree, "BDT")).toMatch(
      /^subtotal at least .*1,000\.00 and \(ships to BD or customer is on their first order\)$/,
    );
  });
});

describe("actions", () => {
  it("reads stored actions, skipping unknown types", () => {
    expect(
      readActions([
        { type: "percent_off", percent: 15, target: "items", filter: { tags: ["sale"] } },
        { type: "teleport" },
        { type: "free_shipping" },
      ]),
    ).toEqual([
      { type: "percent_off", percent: 15, target: "items", filter: { tags: ["sale"] } },
      { type: "free_shipping" },
    ]);
    expect(readActions("nope")).toEqual([]);
  });

  it("validates each action type", () => {
    const errors = validateActions([
      { type: "percent_off", percent: 120, target: "order", filter: {} },
      blankAction("fixed_off"),
      { type: "bogo", buy: { quantity: 0, filter: {} }, get: { quantity: 1, filter: {}, percent: 100 } },
      {
        type: "tiered",
        basis: "subtotal",
        filter: {},
        tiers: [
          { threshold: 100, percent: 5 },
          { threshold: 100, percent: 10 },
          { threshold: 300 },
          { threshold: 400, percent: 5, amountMinor: 5 },
        ],
      },
      { type: "free_shipping", maxShippingMinor: 0 },
    ]);
    expect(Object.keys(errors).sort()).toEqual(["0", "1", "2", "3.tiers.1", "3.tiers.2", "3.tiers.3", "4"]);
    expect(validateActions([])._form).toBe("Add at least one action");
    expect(validateActions([blankAction("percent_off"), blankAction("free_shipping")])).toEqual({});
  });

  it("builds clean payloads: no empty filters, perItem only for items, tiers sorted with one amount", () => {
    expect(
      toActionsInput([
        { type: "fixed_off", amountMinor: 500, target: "order", filter: { tags: [] }, perItem: true },
        {
          type: "tiered",
          basis: "quantity",
          filter: {},
          tiers: [
            { threshold: 5, amountMinor: 1000 },
            { threshold: 2, percent: 5 },
          ],
        },
        { type: "free_shipping", rateIds: [] },
      ]),
    ).toEqual([
      { type: "fixed_off", amountMinor: 500, target: "order", filter: {}, perItem: false },
      {
        type: "tiered",
        basis: "quantity",
        filter: {},
        tiers: [
          { threshold: 2, percent: 5 },
          { threshold: 5, amountMinor: 1000 },
        ],
      },
      { type: "free_shipping" },
    ]);
  });

  it("summarizes actions", () => {
    expect(summarizeAction({ type: "percent_off", percent: 10, target: "order", filter: {} }, "BDT")).toBe(
      "10% off the order",
    );
    expect(
      summarizeAction(
        {
          type: "bogo",
          buy: { quantity: 2, filter: { tags: ["tee"] } },
          get: { quantity: 1, filter: {}, percent: 100 },
        },
        "BDT",
      ),
    ).toBe("Buy 2 of tags: tee, get 1 of any product free");
    expect(summarizeAction({ type: "free_shipping", rateIds: ["r1"] }, "BDT", { r1: "Express" })).toBe(
      "Free shipping on Express",
    );
  });
});
