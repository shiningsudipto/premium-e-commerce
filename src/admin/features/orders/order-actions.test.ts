import { describe, expect, it } from "vitest";
import {
  dateFilter,
  lineRefundMinor,
  nextFulfillmentStatuses,
  orderActions,
  paymentAwaitingCapture,
  refundTotalMinor,
  refundableMinor,
  remainingToFulfill,
  type Order,
  type OrderLine,
  type Payment,
} from "./order-actions";

const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  id: "l1",
  productId: "p1",
  variantId: "v1",
  titleSnapshot: "Shirt",
  variantTitle: "Red / M",
  skuSnapshot: "SH-R-M",
  unitPriceMinor: 100_00,
  compareAtMinor: null,
  quantity: 3,
  discountMinor: 0,
  taxMinor: 45_00,
  totalMinor: 300_00,
  costMinor: null,
  marginMinor: null,
  customizations: {},
  fulfilledQuantity: 0,
  refundedQuantity: 0,
  ...over,
});

const payment = (over: Partial<Payment> = {}): Payment => ({
  id: "pay1",
  provider: "manual",
  status: "PENDING",
  amountMinor: 300_00,
  currency: "BDT",
  capturedMinor: 0,
  refundedMinor: 0,
  providerRef: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  transactions: [],
  ...over,
});

const order = (over: Partial<Order> = {}) =>
  ({
    status: "PAID",
    holdPreviousStatus: null,
    taxInclusive: true,
    payments: [payment({ status: "CAPTURED", capturedMinor: 300_00 })],
    lines: [line()],
    ...over,
  }) as Order;

describe("refund math", () => {
  it("splits a line pro rata, adding tax only when prices exclude it", () => {
    expect(lineRefundMinor({ taxInclusive: true }, line(), 1)).toBe(100_00);
    expect(lineRefundMinor({ taxInclusive: false }, line(), 1)).toBe(115_00);
    // rounded per line like the API
    expect(lineRefundMinor({ taxInclusive: true }, line({ totalMinor: 100, quantity: 3 }), 1)).toBe(33);
    expect(lineRefundMinor({ taxInclusive: true }, line(), 0)).toBe(0);
  });

  it("sums selected lines and caps them at what's left to refund", () => {
    const o = order({ lines: [line(), line({ id: "l2", totalMinor: 50_00, quantity: 1, refundedQuantity: 0 })] });
    expect(
      refundTotalMinor(o, [
        { orderLineId: "l1", quantity: 2 },
        { orderLineId: "l2", quantity: 1 },
      ]),
    ).toBe(250_00);
    const partlyRefunded = order({ lines: [line({ refundedQuantity: 2 })] });
    expect(refundTotalMinor(partlyRefunded, [{ orderLineId: "l1", quantity: 3 }])).toBe(100_00);
    expect(refundTotalMinor(o, [{ orderLineId: "unknown", quantity: 1 }])).toBe(0);
  });

  it("refunds from the first captured payment only", () => {
    expect(
      refundableMinor(
        order({ payments: [payment({ status: "PARTIALLY_REFUNDED", capturedMinor: 300_00, refundedMinor: 120_00 })] }),
      ),
    ).toBe(180_00);
    expect(refundableMinor(order({ payments: [payment()] }))).toBe(0);
  });

  it("counts what's left to ship after fulfilments and refunds", () => {
    expect(remainingToFulfill(line({ fulfilledQuantity: 1, refundedQuantity: 1 }))).toBe(1);
  });
});

describe("order actions", () => {
  it("offers mark paid while a payment waits for its money", () => {
    const pending = order({ status: "PENDING_PAYMENT", payments: [payment()] });
    expect(paymentAwaitingCapture(pending)?.id).toBe("pay1");
    expect(orderActions(pending)).toMatchObject({ markPaid: true, refund: false, cancel: true, hold: false });
    expect(orderActions(order({ status: "CANCELLED", payments: [payment()] })).markPaid).toBe(false);
  });

  it("lets pay-later orders ship before payment, others only once paid", () => {
    expect(orderActions(order({ status: "PENDING_PAYMENT", payments: [payment()] })).fulfill).toBe(true);
    expect(orderActions(order({ status: "PENDING_PAYMENT", payments: [payment({ provider: "card" })] })).fulfill).toBe(
      false,
    );
    expect(orderActions(order({ status: "PAID" })).fulfill).toBe(true);
    expect(orderActions(order({ status: "PAID", lines: [line({ fulfilledQuantity: 3 })] })).fulfill).toBe(false);
  });

  it("follows the order state machine for hold, release, cancel and complete", () => {
    expect(orderActions(order({ status: "PARTIALLY_FULFILLED" }))).toMatchObject({ hold: true, cancel: false });
    expect(orderActions(order({ status: "ON_HOLD", holdPreviousStatus: "PAID" }))).toMatchObject({
      release: true,
      hold: false,
      fulfill: false,
    });
    expect(orderActions(order({ status: "DELIVERED" }))).toMatchObject({ complete: true, cancel: false, refund: true });
    expect(orderActions(order({ status: "COMPLETED" })).complete).toBe(false);
  });

  it("advances fulfilments forward only", () => {
    expect(nextFulfillmentStatuses("PENDING")).toEqual(["PICKING", "PACKED", "SHIPPED"]);
    expect(nextFulfillmentStatuses("FAILED_DELIVERY")).toEqual(["RETURNED_TO_SENDER", "SHIPPED"]);
    expect(nextFulfillmentStatuses("DELIVERED")).toEqual([]);
  });
});

describe("order list date filters", () => {
  it("sends only real dates, a 'to' day up to its end", () => {
    expect(dateFilter(undefined)).toBeUndefined();
    expect(dateFilter("not a date")).toBeUndefined();
    expect(dateFilter("2026-03-01")).toBe(new Date("2026-03-01T00:00:00.000").toISOString());
    expect(dateFilter("2026-03-01", true)).toBe(new Date("2026-03-01T23:59:59.999").toISOString());
  });
});
