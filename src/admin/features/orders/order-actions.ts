import type { GetV1AdminOrdersIdApiResponse } from "../../store/api.generated";

// Pure helpers for the order screens. They mirror the API's rules (orders.service.ts and
// order.states.ts) so the UI only offers what the API will accept; the API still decides.

export type Order = GetV1AdminOrdersIdApiResponse;
export type OrderStatus = Order["status"];
export type OrderLine = Order["lines"][number];
export type Payment = Order["payments"][number];
export type FulfillmentStatus = Order["fulfillments"][number]["status"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  ON_HOLD: "On hold",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  FULFILLED: "Fulfilled",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  PENDING: "Pending",
  AUTHORIZED: "Authorized",
  CAPTURED: "Captured",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  VOIDED: "Voided",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  PENDING: "Pending",
  PICKING: "Picking",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FAILED_DELIVERY: "Failed delivery",
  RETURNED_TO_SENDER: "Returned to sender",
};

export function orderStatusVariant(status: OrderStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CANCELLED") return "destructive";
  if (status === "ON_HOLD" || status === "PENDING_PAYMENT") return "outline";
  if (status === "COMPLETED" || status === "DELIVERED") return "default";
  return "secondary";
}

// Fulfillment steps may be skipped forward (spec §14.3), same table as the API.
const FULFILLMENT_NEXT: Record<FulfillmentStatus, Exclude<FulfillmentStatus, "PENDING">[]> = {
  PENDING: ["PICKING", "PACKED", "SHIPPED"],
  PICKING: ["PACKED", "SHIPPED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["IN_TRANSIT", "DELIVERED", "FAILED_DELIVERY"],
  IN_TRANSIT: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: ["RETURNED_TO_SENDER", "SHIPPED"],
  DELIVERED: [],
  RETURNED_TO_SENDER: [],
};

export const nextFulfillmentStatuses = (status: FulfillmentStatus) => FULFILLMENT_NEXT[status];

// Payment providers that let an order ship before it's paid (cash on delivery, bank transfer).
// Only the manual provider exists today; the API checks the provider's own payLater flag.
const PAY_LATER_PROVIDERS = new Set(["manual"]);

const isOpen = (p: Payment) => p.status !== "FAILED" && p.status !== "VOIDED";
const isRefundable = (p: Payment) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED";

export const remainingToFulfill = (l: OrderLine) => l.quantity - l.fulfilledQuantity - l.refundedQuantity;
export const refundableQuantity = (l: OrderLine) => l.quantity - l.refundedQuantity;

// The payment staff confirm with "Mark paid": the first one still waiting for its money.
export const paymentAwaitingCapture = (order: Pick<Order, "payments">) =>
  order.payments.find((p) => p.status === "PENDING" || p.status === "AUTHORIZED") ?? null;

// The API refunds from the first captured payment, so that's what can still go back.
export function refundableMinor(order: Pick<Order, "payments">): number {
  const payment = order.payments.find(isRefundable);
  return payment ? Math.max(0, payment.capturedMinor - payment.refundedMinor) : 0;
}

// A line's share of a refund: its total (plus tax when prices exclude it), pro rata by
// quantity and rounded per line, exactly like the API's refundAmountFor.
export function lineRefundMinor(order: Pick<Order, "taxInclusive">, line: OrderLine, quantity: number): number {
  if (quantity <= 0 || line.quantity <= 0) return 0;
  const gross = line.totalMinor + (order.taxInclusive ? 0 : line.taxMinor);
  return Math.round((gross * quantity) / line.quantity);
}

export function refundTotalMinor(
  order: Pick<Order, "taxInclusive" | "lines">,
  selection: { orderLineId: string; quantity: number }[],
): number {
  return selection.reduce((sum, s) => {
    const line = order.lines.find((l) => l.id === s.orderLineId);
    return line ? sum + lineRefundMinor(order, line, Math.min(s.quantity, refundableQuantity(line))) : sum;
  }, 0);
}

export type OrderActions = {
  markPaid: boolean;
  fulfill: boolean;
  refund: boolean;
  cancel: boolean;
  hold: boolean;
  release: boolean;
  complete: boolean;
};

// Which actions the order's state allows (permissions are checked separately).
export function orderActions(order: Pick<Order, "status" | "payments" | "lines" | "holdPreviousStatus">): OrderActions {
  const { status } = order;
  const payLater = order.payments.some((p) => isOpen(p) && PAY_LATER_PROVIDERS.has(p.provider));
  const anythingToShip = order.lines.some((l) => remainingToFulfill(l) > 0);
  const capturedLeft = refundableMinor(order) > 0;
  return {
    markPaid: status !== "CANCELLED" && paymentAwaitingCapture(order) !== null,
    fulfill:
      anythingToShip &&
      (status === "PAID" || status === "PARTIALLY_FULFILLED" || (status === "PENDING_PAYMENT" && payLater)),
    refund: capturedLeft,
    // the API asks for captured money to be refunded first; the dialog offers to do both
    cancel: status === "DRAFT" || status === "PENDING_PAYMENT" || status === "PAID",
    hold: status === "PAID" || status === "PARTIALLY_FULFILLED",
    release: status === "ON_HOLD" && order.holdPreviousStatus !== null,
    complete: status === "DELIVERED",
  };
}

// Date filters arrive as typed text ("2026-03-01"). Only real dates are sent; a "to" date
// covers that whole day.
export function dateFilter(value: string | undefined, endOfDay = false): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const date = new Date(day ? `${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}` : text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
