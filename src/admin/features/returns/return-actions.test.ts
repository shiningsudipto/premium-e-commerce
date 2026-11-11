import { describe, expect, it } from "vitest";
import {
  defaultInspection,
  inspectionErrors,
  inspectionPayload,
  isClosed,
  lineValueMinor,
  returnActions,
  settlementPreview,
  settlementSummary,
  type ReturnDetail,
  type ReturnLine,
  type ReturnOrderLine,
} from "./return-actions";

const orderLine = (over: Partial<ReturnOrderLine> = {}): ReturnOrderLine => ({
  id: "ol1",
  productId: "p1",
  variantId: "v1",
  titleSnapshot: "Bag",
  variantTitle: "Black",
  skuSnapshot: "BAG-B",
  unitPriceMinor: 100_00,
  quantity: 3,
  discountMinor: 0,
  taxMinor: 45_00,
  totalMinor: 300_00,
  fulfilledQuantity: 3,
  refundedQuantity: 0,
  ...over,
});

const line = (over: Partial<ReturnLine> = {}): ReturnLine => ({
  id: "rl1",
  orderLineId: "ol1",
  quantity: 2,
  reason: "Wrong size",
  exchangeVariantId: null,
  inspection: null,
  acceptedQuantity: null,
  ...over,
});

const detail = (lines: ReturnLine[], taxInclusive = false): Pick<ReturnDetail, "lines" | "order"> => ({
  lines,
  order: {
    id: "o1",
    number: 1001,
    email: "a@x.test",
    currency: "BDT",
    taxInclusive,
    customerId: "c1",
    lines: [orderLine(), orderLine({ id: "ol2", totalMinor: 50_00, taxMinor: 0, quantity: 1 })],
  },
});

const money = (minor: number) => `৳${(minor / 100).toFixed(2)}`;

describe("returnActions", () => {
  it("follows the state machine, including skipping shipping steps", () => {
    expect(returnActions("REQUESTED")).toEqual({ decide: true, shipping: [], inspect: false, complete: false });
    expect(returnActions("APPROVED").shipping).toEqual(["LABEL_ISSUED", "IN_TRANSIT", "RECEIVED"]);
    expect(returnActions("LABEL_ISSUED").shipping).toEqual(["IN_TRANSIT", "RECEIVED"]);
    expect(returnActions("IN_TRANSIT").shipping).toEqual(["RECEIVED"]);
    expect(returnActions("RECEIVED")).toEqual({ decide: false, shipping: [], inspect: true, complete: false });
    expect(returnActions("INSPECTED")).toEqual({ decide: false, shipping: [], inspect: false, complete: true });
    for (const s of ["REJECTED", "COMPLETED", "PARTIALLY_ACCEPTED"] as const) {
      expect(returnActions(s)).toEqual({ decide: false, shipping: [], inspect: false, complete: false });
      expect(isClosed(s)).toBe(true);
    }
    expect(isClosed("RECEIVED")).toBe(false);
  });
});

describe("inspection", () => {
  it("starts fully accepted and restocked", () => {
    expect(defaultInspection([line()])).toEqual({ rl1: { result: "RESTOCK", acceptedQuantity: "2" } });
  });

  it("checks accepted quantities against what was returned", () => {
    const lines = [line(), line({ id: "rl2", orderLineId: "ol2", quantity: 1 })];
    expect(
      inspectionErrors(lines, {
        rl1: { result: "RESTOCK", acceptedQuantity: "3" },
        rl2: { result: "WRITE_OFF", acceptedQuantity: "1.5" },
      }),
    ).toEqual({ rl1: "At most 2 can be accepted", rl2: "Enter a whole number" });
    expect(inspectionErrors(lines, { rl1: { result: "REJECT", acceptedQuantity: "" } })).toEqual({
      rl2: "Choose a result for this line",
    });
    expect(inspectionErrors([line()], { rl1: { result: "WRITE_OFF", acceptedQuantity: " 0 " } })).toEqual({});
  });

  it("sends every line; rejected lines accept nothing", () => {
    const lines = [line(), line({ id: "rl2", orderLineId: "ol2", quantity: 1 })];
    expect(
      inspectionPayload(lines, {
        rl1: { result: "WRITE_OFF", acceptedQuantity: "1" },
        rl2: { result: "REJECT", acceptedQuantity: "1" },
      }),
    ).toEqual({
      lines: [
        { lineId: "rl1", result: "WRITE_OFF", acceptedQuantity: 1 },
        { lineId: "rl2", result: "REJECT", acceptedQuantity: 0 },
      ],
    });
  });
});

describe("settlement", () => {
  it("values lines pro rata like the API (tax added when prices exclude it)", () => {
    expect(lineValueMinor(false, orderLine(), 1)).toBe(115_00);
    expect(lineValueMinor(true, orderLine(), 1)).toBe(100_00);
    expect(lineValueMinor(false, orderLine(), 0)).toBe(0);
  });

  it("previews a full and a partial acceptance", () => {
    const full = settlementPreview(detail([line({ acceptedQuantity: 2, inspection: "RESTOCK" })]));
    expect(full).toMatchObject({ outcome: "COMPLETED", acceptedUnits: 2, requestedUnits: 2, valueMinor: 230_00 });
    const partial = settlementPreview(
      detail([
        line({ acceptedQuantity: 1, inspection: "WRITE_OFF" }),
        line({ id: "rl2", orderLineId: "ol2", quantity: 1, acceptedQuantity: 0, inspection: "REJECT" }),
      ]),
    );
    expect(partial).toMatchObject({ outcome: "PARTIALLY_ACCEPTED", acceptedUnits: 1, requestedUnits: 3 });
    expect(partial.valueMinor).toBe(115_00);
  });

  it("lists exchange replacements for accepted units only", () => {
    const s = settlementPreview(
      detail([
        line({ acceptedQuantity: 2, exchangeVariantId: "v9" }),
        line({ id: "rl2", orderLineId: "ol2", quantity: 1, acceptedQuantity: 0, exchangeVariantId: "v8" }),
      ]),
    );
    expect(s.exchanges).toEqual([{ variantId: "v9", quantity: 2 }]);
    expect(settlementSummary("EXCHANGE", s, money)).toMatch(/2 replacement units/);
  });

  it("words the confirmation by resolution", () => {
    const s = settlementPreview(detail([line({ acceptedQuantity: 2 })]));
    expect(settlementSummary("REFUND", s, money)).toBe(
      "Refunds ৳230.00 for 2 of 2 units to the original payment method. This can't be undone.",
    );
    expect(settlementSummary("STORE_CREDIT", s, money)).toMatch(/^Credits about ৳230\.00/);
    const none = settlementPreview(detail([line({ acceptedQuantity: 0, inspection: "REJECT" })]));
    expect(settlementSummary("REFUND", none, money)).toMatch(/nothing is refunded/);
  });
});
