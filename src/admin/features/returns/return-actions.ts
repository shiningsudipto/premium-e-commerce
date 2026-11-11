import type { GetV1AdminReturnsIdApiResponse } from "../../store/api.generated";

// Pure helpers for the return screens. They mirror the API's rules (returns.states.ts and
// returns.service.ts) so the UI only offers what the API will accept; the API still decides.

export type ReturnDetail = GetV1AdminReturnsIdApiResponse;
export type ReturnStatus = ReturnDetail["status"];
export type ReturnResolution = ReturnDetail["resolution"];
export type ReturnLine = ReturnDetail["lines"][number];
export type ReturnOrderLine = ReturnDetail["order"]["lines"][number];
export type InspectionResult = NonNullable<ReturnLine["inspection"]>;
export type ShippingStep = "LABEL_ISSUED" | "IN_TRANSIT" | "RECEIVED";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  LABEL_ISSUED: "Label issued",
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  INSPECTED: "Inspected",
  COMPLETED: "Completed",
  PARTIALLY_ACCEPTED: "Partially accepted",
};

export const RESOLUTION_LABELS: Record<ReturnResolution, string> = {
  REFUND: "Refund",
  STORE_CREDIT: "Store credit",
  EXCHANGE: "Exchange",
};

export const INSPECTION_LABELS: Record<InspectionResult, string> = {
  RESTOCK: "Restock",
  WRITE_OFF: "Write off",
  REJECT: "Reject",
};

export const SHIPPING_STEP_LABELS: Record<ShippingStep, string> = {
  LABEL_ISSUED: "Issue label",
  IN_TRANSIT: "Mark in transit",
  RECEIVED: "Mark received",
};

export function returnStatusVariant(status: ReturnStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "REJECTED") return "destructive";
  if (status === "REQUESTED") return "outline";
  if (status === "COMPLETED" || status === "PARTIALLY_ACCEPTED") return "default";
  return "secondary";
}

// Spec §14.4, same table as the API. Steps may be skipped forward (a drop-off return needs no
// label or transit).
const RETURN_NEXT: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["LABEL_ISSUED", "IN_TRANSIT", "RECEIVED"],
  LABEL_ISSUED: ["IN_TRANSIT", "RECEIVED"],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["INSPECTED"],
  INSPECTED: ["COMPLETED", "PARTIALLY_ACCEPTED"],
  REJECTED: [],
  COMPLETED: [],
  PARTIALLY_ACCEPTED: [],
};

export const nextReturnStatuses = (status: ReturnStatus) => RETURN_NEXT[status];

const SHIPPING_STEPS: ShippingStep[] = ["LABEL_ISSUED", "IN_TRANSIT", "RECEIVED"];

export type ReturnActions = {
  decide: boolean;
  shipping: ShippingStep[];
  inspect: boolean;
  complete: boolean;
};

// What staff can do next for a return in this status.
export function returnActions(status: ReturnStatus): ReturnActions {
  const next = RETURN_NEXT[status];
  return {
    decide: next.includes("APPROVED") && next.includes("REJECTED"),
    shipping: SHIPPING_STEPS.filter((s) => next.includes(s)),
    inspect: next.includes("INSPECTED"),
    complete: next.includes("COMPLETED"),
  };
}

export const isClosed = (status: ReturnStatus) => RETURN_NEXT[status].length === 0;

// ── Inspection ───────────────────────────────────────────────────────────────

export type InspectionDraft = Record<string, { result: InspectionResult; acceptedQuantity: string }>;

// Starts every line as fully accepted and restocked (the common case); staff change the rest.
export function defaultInspection(lines: ReturnLine[]): InspectionDraft {
  return Object.fromEntries(
    lines.map((l) => [
      l.id,
      { result: l.inspection ?? "RESTOCK", acceptedQuantity: String(l.acceptedQuantity ?? l.quantity) },
    ]),
  );
}

// Per-line problems with the draft, keyed by return line id (empty when it's ready to send).
export function inspectionErrors(lines: ReturnLine[], draft: InspectionDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const line of lines) {
    const entry = draft[line.id];
    if (!entry) {
      errors[line.id] = "Choose a result for this line";
      continue;
    }
    if (entry.result === "REJECT") continue;
    const text = entry.acceptedQuantity.trim();
    if (!/^\d+$/.test(text)) {
      errors[line.id] = "Enter a whole number";
      continue;
    }
    const qty = Number(text);
    if (qty > line.quantity) errors[line.id] = `At most ${line.quantity} can be accepted`;
  }
  return errors;
}

// The inspection request body: every line of the return (the API requires all of them), with
// rejected lines accepting nothing.
export function inspectionPayload(lines: ReturnLine[], draft: InspectionDraft) {
  return {
    lines: lines.map((l) => {
      const entry = draft[l.id]!;
      return {
        lineId: l.id,
        result: entry.result,
        acceptedQuantity: entry.result === "REJECT" ? 0 : Number(entry.acceptedQuantity.trim()),
      };
    }),
  };
}

// ── Settlement ───────────────────────────────────────────────────────────────

// A line's value pro rata by quantity, rounded per line, exactly like the API's refund and
// store-credit maths: its total, plus tax when prices exclude it.
export function lineValueMinor(taxInclusive: boolean, orderLine: ReturnOrderLine, quantity: number): number {
  if (quantity <= 0 || orderLine.quantity <= 0) return 0;
  const gross = orderLine.totalMinor + (taxInclusive ? 0 : orderLine.taxMinor);
  return Math.round((gross * quantity) / orderLine.quantity);
}

export type Settlement = {
  // COMPLETED when every unit was accepted, PARTIALLY_ACCEPTED otherwise
  outcome: Extract<ReturnStatus, "COMPLETED" | "PARTIALLY_ACCEPTED">;
  acceptedUnits: number;
  requestedUnits: number;
  // value of the accepted units, before any store-credit bonus
  valueMinor: number;
  // exchange: the replacements that will be sent
  exchanges: { variantId: string; quantity: number }[];
};

// What completing an inspected return will do, from the recorded inspection.
export function settlementPreview(r: Pick<ReturnDetail, "lines" | "order">): Settlement {
  let acceptedUnits = 0;
  let requestedUnits = 0;
  let valueMinor = 0;
  const exchanges: Settlement["exchanges"] = [];
  for (const l of r.lines) {
    const accepted = l.acceptedQuantity ?? 0;
    requestedUnits += l.quantity;
    acceptedUnits += accepted;
    const orderLine = r.order.lines.find((o) => o.id === l.orderLineId);
    if (orderLine) valueMinor += lineValueMinor(r.order.taxInclusive, orderLine, accepted);
    if (accepted > 0 && l.exchangeVariantId) exchanges.push({ variantId: l.exchangeVariantId, quantity: accepted });
  }
  const fully = r.lines.every((l) => l.acceptedQuantity === l.quantity);
  return { outcome: fully ? "COMPLETED" : "PARTIALLY_ACCEPTED", acceptedUnits, requestedUnits, valueMinor, exchanges };
}

// The confirmation wording for completing a return: says plainly what money or goods move.
export function settlementSummary(
  resolution: ReturnResolution,
  s: Settlement,
  formatMoney: (minor: number) => string,
): string {
  if (s.acceptedUnits === 0) return "No units were accepted, so nothing is refunded, credited or sent.";
  const units = `${s.acceptedUnits} of ${s.requestedUnits} unit${s.requestedUnits === 1 ? "" : "s"}`;
  if (resolution === "REFUND")
    return `Refunds ${formatMoney(s.valueMinor)} for ${units} to the original payment method. This can't be undone.`;
  if (resolution === "STORE_CREDIT")
    return `Credits about ${formatMoney(s.valueMinor)} for ${units} to the customer's store credit, plus any return bonus set in Settings.`;
  const replacements = s.exchanges.reduce((n, e) => n + e.quantity, 0);
  return `Creates a free exchange order for ${replacements} replacement unit${replacements === 1 ? "" : "s"} (${units} accepted), reserving stock for it.`;
}
