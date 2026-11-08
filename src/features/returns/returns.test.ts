import { describe, expect, it } from "vitest";
import { canHaveReturns, isOpenReturn, readReturnForm, returnableQuantities, returnTone, toReturns } from "./returns";

const apiReturn = {
  id: "ret1",
  number: 12,
  orderId: "ord1",
  customerId: "cus1",
  status: "REQUESTED",
  resolution: "REFUND",
  customerNote: "Too small",
  photoUrls: [],
  staffNote: null,
  carrier: null,
  trackingNumber: null,
  labelUrl: null,
  refundId: null,
  creditMinor: null,
  exchangeOrderId: null,
  version: 0,
  createdAt: "2026-11-01T09:00:00.000Z",
  updatedAt: "2026-11-01T09:00:00.000Z",
  lines: [
    {
      id: "rl1",
      returnId: "ret1",
      orderLineId: "ol1",
      quantity: 1,
      reason: "doesnt_fit",
      exchangeVariantId: null,
      inspection: null,
      acceptedQuantity: null,
    },
  ],
};

describe("toReturns", () => {
  it("reads the API's returns", () => {
    expect(toReturns([apiReturn])).toEqual([
      {
        id: "ret1",
        number: 12,
        orderId: "ord1",
        status: "REQUESTED",
        resolution: "REFUND",
        customerNote: "Too small",
        carrier: null,
        trackingNumber: null,
        labelUrl: null,
        creditMinor: null,
        createdAt: "2026-11-01T09:00:00.000Z",
        lines: [{ id: "rl1", orderLineId: "ol1", quantity: 1, reason: "doesnt_fit", acceptedQuantity: null }],
      },
    ]);
  });

  it("drops anything malformed", () => {
    expect(toReturns([{ ...apiReturn, status: "LOST" }, { ...apiReturn, id: 3 }, null])).toEqual([]);
    expect(toReturns({ items: [] })).toEqual([]);
    expect(toReturns([{ ...apiReturn, lines: [{ id: "x", orderLineId: "ol1", quantity: 0 }] }])[0]?.lines).toEqual([]);
  });
});

describe("status helpers", () => {
  it("tones and open state", () => {
    expect(returnTone("COMPLETED")).toBe("done");
    expect(returnTone("REQUESTED")).toBe("warn");
    expect(returnTone("REJECTED")).toBe("stop");
    expect(returnTone("IN_TRANSIT")).toBeUndefined();
    expect(isOpenReturn({ status: "APPROVED" })).toBe(true);
    expect(isOpenReturn({ status: "COMPLETED" })).toBe(false);
  });

  it("only shipped orders can have returns", () => {
    expect(canHaveReturns("DELIVERED")).toBe(true);
    expect(canHaveReturns("PAID")).toBe(false);
    expect(canHaveReturns("CANCELLED")).toBe(false);
  });
});

describe("returnableQuantities", () => {
  const lines = [
    { id: "a", quantity: 3, fulfilledQuantity: 3, refundedQuantity: 0 },
    { id: "b", quantity: 2, fulfilledQuantity: 1, refundedQuantity: 1 }, // the unshipped unit was refunded
    { id: "c", quantity: 2, fulfilledQuantity: 2, refundedQuantity: 1 }, // a shipped unit was refunded
    { id: "d", quantity: 1, fulfilledQuantity: 0, refundedQuantity: 0 }, // not shipped yet
  ];

  it("counts shipped units less refunds of shipped units", () => {
    expect(returnableQuantities(lines, [])).toEqual({ a: 3, b: 1, c: 1, d: 0 });
  });

  it("subtracts units already in returns, except rejected ones, using accepted quantities once known", () => {
    const returns = [
      {
        status: "REQUESTED" as const,
        lines: [{ id: "1", orderLineId: "a", quantity: 1, reason: "x", acceptedQuantity: null }],
      },
      {
        status: "REJECTED" as const,
        lines: [{ id: "2", orderLineId: "a", quantity: 2, reason: "x", acceptedQuantity: null }],
      },
      {
        status: "PARTIALLY_ACCEPTED" as const,
        lines: [{ id: "3", orderLineId: "c", quantity: 1, reason: "x", acceptedQuantity: 0 }],
      },
      {
        status: "APPROVED" as const,
        lines: [{ id: "4", orderLineId: "b", quantity: 5, reason: "x", acceptedQuantity: null }],
      },
    ];
    expect(returnableQuantities(lines, returns)).toEqual({ a: 2, b: 0, c: 1, d: 0 });
  });
});

describe("readReturnForm", () => {
  const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";
  const returnable = { a: 2, b: 1, c: 0 };

  it("builds the request from the chosen lines", () => {
    expect(
      readReturnForm(
        form({
          "qty:a": "2",
          "reason:a": "damaged",
          "qty:b": "0",
          resolution: "STORE_CREDIT",
          note: "  Box was crushed ",
        }),
        returnable,
      ),
    ).toEqual({
      input: {
        resolution: "STORE_CREDIT",
        lines: [{ orderLineId: "a", quantity: 2, reason: "damaged" }],
        note: "Box was crushed",
      },
      errors: {},
    });
  });

  it("asks for at least one item and a resolution", () => {
    expect(readReturnForm(form({}), returnable)).toEqual({
      input: null,
      errors: { resolution: "resolutionRequired", lines: "chooseItems" },
    });
  });

  it("checks quantities and reasons per line", () => {
    expect(
      readReturnForm(
        form({
          "qty:a": "3",
          "qty:b": "1",
          "reason:b": "made_up",
          "qty:c": "1",
          "reason:c": "damaged",
          resolution: "REFUND",
        }),
        returnable,
      ).errors,
    ).toEqual({ "qty:a": "tooMany", "reason:b": "reasonRequired", "qty:c": "notReturnable" });
    expect(readReturnForm(form({ "qty:a": "1.5", resolution: "REFUND" }), returnable).errors).toEqual({
      "qty:a": "invalidQuantity",
    });
  });

  it("ignores lines that aren't on the order and limits the note", () => {
    const result = readReturnForm(
      form({
        "qty:zzz": "1",
        "reason:zzz": "damaged",
        "qty:a": "1",
        "reason:a": "other",
        resolution: "REFUND",
        note: "x".repeat(2001),
      }),
      returnable,
    );
    expect(result).toEqual({ input: null, errors: { note: "noteTooLong" } });
  });
});
