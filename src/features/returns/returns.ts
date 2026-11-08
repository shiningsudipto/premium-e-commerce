// Returns as the account shows them, and the rules the request form checks before asking the
// API (which stays the authority: return window, final sale and its own quantity check).
//
// The generated client has no response schema for GET/POST /v1/store/orders/{id}/returns (the
// route in premium-ec-backend declares none), so the body arrives untyped and is narrowed here
// field by field. Replace ReturnView with a type from `paths` once the API documents it.

export const RETURN_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "LABEL_ISSUED",
  "IN_TRANSIT",
  "RECEIVED",
  "INSPECTED",
  "COMPLETED",
  "PARTIALLY_ACCEPTED",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

// The resolutions the request body accepts (from the generated request type).
export const RESOLUTIONS = ["REFUND", "STORE_CREDIT", "EXCHANGE"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

// The API takes a free-text reason; the shop has no configured list, so the form offers these
// stable codes (labels under `returns.reasons`) and sends the code.
export const RETURN_REASONS = [
  "doesnt_fit",
  "not_as_described",
  "damaged",
  "wrong_item",
  "quality",
  "changed_mind",
  "other",
] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const NOTE_MAX = 2000;

export type ReturnLineView = {
  id: string;
  orderLineId: string;
  quantity: number;
  reason: string;
  acceptedQuantity: number | null;
};

export type ReturnView = {
  id: string;
  number: number | null;
  orderId: string;
  status: ReturnStatus;
  resolution: Resolution;
  customerNote: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  creditMinor: number | null;
  createdAt: string;
  lines: ReturnLineView[];
};

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);

function toLine(raw: unknown): ReturnLineView | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const orderLineId = str(raw.orderLineId);
  const quantity = int(raw.quantity);
  if (!id || !orderLineId || quantity === null || quantity < 1) return null;
  return { id, orderLineId, quantity, reason: str(raw.reason) ?? "", acceptedQuantity: int(raw.acceptedQuantity) };
}

export function toReturn(raw: unknown): ReturnView | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  const orderId = str(raw.orderId);
  const createdAt = str(raw.createdAt);
  const status = RETURN_STATUSES.find((s) => s === raw.status);
  const resolution = RESOLUTIONS.find((r) => r === raw.resolution);
  if (!id || !orderId || !createdAt || Number.isNaN(Date.parse(createdAt)) || !status || !resolution) return null;
  return {
    id,
    number: int(raw.number),
    orderId,
    status,
    resolution,
    customerNote: str(raw.customerNote),
    carrier: str(raw.carrier),
    trackingNumber: str(raw.trackingNumber),
    labelUrl: str(raw.labelUrl),
    creditMinor: int(raw.creditMinor),
    createdAt,
    lines: Array.isArray(raw.lines) ? raw.lines.map(toLine).filter((l): l is ReturnLineView => !!l) : [],
  };
}

export const toReturns = (raw: unknown): ReturnView[] =>
  Array.isArray(raw) ? raw.map(toReturn).filter((r): r is ReturnView => !!r) : [];

// How a return's status looks (.status--done / --warn / --stop).
export function returnTone(status: ReturnStatus): "done" | "warn" | "stop" | undefined {
  if (status === "COMPLETED") return "done";
  if (status === "REQUESTED" || status === "PARTIALLY_ACCEPTED") return "warn";
  if (status === "REJECTED") return "stop";
  return undefined;
}

export const isOpenReturn = (r: Pick<ReturnView, "status">) =>
  !["REJECTED", "COMPLETED", "PARTIALLY_ACCEPTED"].includes(r.status);

// Orders that have shipped can have returns (the API's RETURNABLE statuses).
export const RETURNABLE_ORDER_STATUSES = ["PARTIALLY_FULFILLED", "FULFILLED", "DELIVERED", "COMPLETED"];
export const canHaveReturns = (orderStatus: string) => RETURNABLE_ORDER_STATUSES.includes(orderStatus);

export type OrderLineLike = {
  id: string;
  quantity: number;
  fulfilledQuantity: number;
  refundedQuantity: number;
};

// Units of each order line that can still be returned, the way the API counts them: shipped
// units, less refunds beyond the unshipped ones, less units in returns that weren't rejected
// (counting what inspection accepted once it's known).
export function returnableQuantities(
  lines: OrderLineLike[],
  returns: Pick<ReturnView, "status" | "lines">[],
): Record<string, number> {
  const inReturns = new Map<string, number>();
  for (const r of returns) {
    if (r.status === "REJECTED") continue;
    for (const l of r.lines)
      inReturns.set(l.orderLineId, (inReturns.get(l.orderLineId) ?? 0) + (l.acceptedQuantity ?? l.quantity));
  }
  const out: Record<string, number> = {};
  for (const line of lines) {
    const refundedShipped = Math.max(0, line.refundedQuantity - (line.quantity - line.fulfilledQuantity));
    out[line.id] = Math.max(0, line.fulfilledQuantity - refundedShipped - (inReturns.get(line.id) ?? 0));
  }
  return out;
}

export type ReturnRequestInput = {
  resolution: Resolution;
  lines: { orderLineId: string; quantity: number; reason: string }[];
  note?: string;
};

export type ReturnFieldErrors = Record<string, string>;

// Reads the request form: `qty:<lineId>` and `reason:<lineId>` per order line, `resolution`
// and `note`. `returnable` is what each line allows; lines left at 0 are skipped. Error keys
// match the form's field names; their values are keys under `returns.errors`.
export function readReturnForm(
  get: (name: string) => string,
  returnable: Record<string, number>,
): { input: ReturnRequestInput | null; errors: ReturnFieldErrors } {
  const errors: ReturnFieldErrors = {};
  const lines: ReturnRequestInput["lines"] = [];
  for (const [lineId, max] of Object.entries(returnable)) {
    const raw = get(`qty:${lineId}`).trim();
    if (!raw) continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) {
      errors[`qty:${lineId}`] = "invalidQuantity";
      continue;
    }
    if (quantity === 0) continue;
    if (quantity > max) {
      errors[`qty:${lineId}`] = max ? "tooMany" : "notReturnable";
      continue;
    }
    const reason = get(`reason:${lineId}`).trim();
    if (!RETURN_REASONS.includes(reason as ReturnReason)) {
      errors[`reason:${lineId}`] = "reasonRequired";
      continue;
    }
    lines.push({ orderLineId: lineId, quantity, reason });
  }
  const resolution = RESOLUTIONS.find((r) => r === get("resolution"));
  if (!resolution) errors.resolution = "resolutionRequired";
  const note = get("note").trim();
  if (note.length > NOTE_MAX) errors.note = "noteTooLong";
  if (!lines.length && !Object.keys(errors).some((k) => k.startsWith("qty:") || k.startsWith("reason:")))
    errors.lines = "chooseItems";
  if (Object.keys(errors).length || !resolution) return { input: null, errors };
  return { input: { resolution, lines, ...(note ? { note } : {}) }, errors };
}
