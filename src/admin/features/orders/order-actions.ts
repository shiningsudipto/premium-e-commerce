import type { GetV1AdminOrdersIdApiResponse } from "../../store/api.generated";
import { formatMoney } from "../../lib/money";

// Pure helpers for the order screens. They mirror the API's rules (orders.service.ts and
// order.states.ts) so the UI only offers what the API will accept; the API still decides.

export type Order = GetV1AdminOrdersIdApiResponse;
export type OrderStatus = Order["status"];
export type OrderLine = Order["lines"][number];
export type Payment = Order["payments"][number];
export type FulfillmentStatus = Order["fulfillments"][number]["status"];

// Staff-facing names. The API's names are technical: FULFILLED means every item is in a
// shipment ("Packed"), and COMPLETED means received and paid, which is what staff call "Fulfilled".
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  ON_HOLD: "On hold",
  PARTIALLY_FULFILLED: "Partly shipped",
  FULFILLED: "Packed",
  SHIPPING: "Shipping",
  DELIVERED: "Delivered",
  COMPLETED: "Fulfilled",
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

// Paid in full: nothing still waiting for its money and something captured (as the API checks
// before an order counts as fulfilled).
export const isSettled = (order: Pick<Order, "payments">) =>
  !order.payments.some((p) => p.status === "PENDING" || p.status === "AUTHORIZED") &&
  order.payments.some((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED");

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
export function orderActions(
  order: Pick<Order, "status" | "payments" | "lines" | "holdPreviousStatus" | "fulfillments">,
): OrderActions {
  const { status } = order;
  const payLater = order.payments.some((p) => isOpen(p) && PAY_LATER_PROVIDERS.has(p.provider));
  const anythingToShip = order.lines.some((l) => remainingToFulfill(l) > 0);
  const capturedLeft = refundableMinor(order) > 0;
  return {
    markPaid: status !== "CANCELLED" && paymentAwaitingCapture(order) !== null,
    fulfill:
      anythingToShip &&
      (status === "PAID" ||
        status === "PROCESSING" ||
        status === "PARTIALLY_FULFILLED" ||
        (status === "PENDING_PAYMENT" && payLater)),
    refund: capturedLeft,
    // the API asks for captured money to be refunded first; the dialog offers to do both
    cancel: status === "DRAFT" || status === "PENDING_PAYMENT" || status === "PAID" || status === "PROCESSING",
    hold: status === "PAID" || status === "PROCESSING" || status === "PARTIALLY_FULFILLED",
    release: status === "ON_HOLD" && order.holdPreviousStatus !== null,
    // "Fulfilled": received and paid (the API also does this by itself)
    complete: status === "DELIVERED" && isSettled(order),
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

// ── Setting a status by hand ──
// Staff can set any status from the order page (POST /orders/:id/status). Going forward, the API
// also records what the status implies; these helpers describe that before staff confirm, using
// the same rules as orders.setStatus.

export const SETTABLE_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "ON_HOLD",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];
export type SettableStatus = (typeof SETTABLE_STATUSES)[number];

export const STATUS_MEANING: Record<SettableStatus, string> = {
  PENDING_PAYMENT: "Waiting for the payment",
  PAID: "Payment received",
  PROCESSING: "Confirmed, being prepared",
  ON_HOLD: "Paused, with a reason",
  PARTIALLY_FULFILLED: "Some items sent",
  FULFILLED: "Everything packed, not sent yet",
  SHIPPING: "On the way to the customer",
  DELIVERED: "The customer has it",
  COMPLETED: "Received and paid: done",
  CANCELLED: "Called off; stock released",
};

const STAGE: Partial<Record<OrderStatus, number>> = {
  PENDING_PAYMENT: 0,
  PAID: 1,
  PROCESSING: 2,
  PARTIALLY_FULFILLED: 3,
  FULFILLED: 4,
  SHIPPING: 5,
  DELIVERED: 6,
  COMPLETED: 7,
};
const SHIPMENT_FOR: Partial<Record<OrderStatus, "PENDING" | "SHIPPED" | "DELIVERED">> = {
  FULFILLED: "PENDING",
  SHIPPING: "SHIPPED",
  DELIVERED: "DELIVERED",
  COMPLETED: "DELIVERED",
};
const NOT_SENT: FulfillmentStatus[] = ["PENDING", "PICKING", "PACKED"];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// What else happens when staff set `to`, in plain words (empty: only the status changes).
export function statusEffects(
  order: Pick<Order, "status" | "payments" | "lines" | "fulfillments" | "currency">,
  to: SettableStatus,
): string[] {
  const effects: string[] = [];
  if (to === "CANCELLED") {
    effects.push("Stock still reserved for it goes back on sale, and payments not yet received are voided.");
    return effects;
  }
  if (to === "ON_HOLD") {
    effects.push(`It goes back to ${ORDER_STATUS_LABELS[order.status].toLowerCase()} when you release the hold.`);
    return effects;
  }
  if (to === "PAID" || to === "COMPLETED") {
    const waiting = order.payments.filter((p) => p.status === "PENDING" || p.status === "AUTHORIZED");
    const amount = waiting.reduce((sum, p) => sum + p.amountMinor, 0);
    if (waiting.length) effects.push(`The ${formatMoney(amount, order.currency)} payment is recorded as received.`);
  }
  const shipment = SHIPMENT_FOR[to];
  if (shipment && (STAGE[to] ?? -1) > (STAGE[order.status] ?? -1)) {
    const left = order.lines.reduce((sum, l) => sum + Math.max(0, remainingToFulfill(l)), 0);
    const state = shipment === "PENDING" ? "packed, not sent yet" : shipment === "SHIPPED" ? "shipped" : "delivered";
    if (left > 0) effects.push(`The ${plural(left, "item")} not shipped yet go into a new shipment, marked ${state}.`);
    if (shipment !== "PENDING") {
      const behind = order.fulfillments.filter((f) =>
        shipment === "SHIPPED" ? NOT_SENT.includes(f.status) : f.status !== "DELIVERED" && f.status !== "RETURNED_TO_SENDER",
      ).length;
      if (behind) effects.push(`${plural(behind, "existing shipment")} ${behind === 1 ? "is" : "are"} marked ${state}.`);
    }
  }
  return effects;
}
