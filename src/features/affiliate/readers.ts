// /v1/affiliate/stats, /balance, /earnings and /payouts are declared without a response schema
// in the API (affiliates.routes.ts has no `response:` for them), so the generated client types
// their bodies as nothing. These readers take the JSON as unknown and keep only the fields the
// dashboard shows, with safe defaults, until the API publishes the schemas (then they can go).

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const list = (v: unknown) => (Array.isArray(v) ? v : []);

export function readStats(raw: unknown) {
  const s = obj(raw);
  const earnings = obj(s.earnings);
  return {
    clicks: num(s.clicks),
    conversions: num(s.conversions),
    conversionRate: num(s.conversionRate),
    salesMinor: num(s.salesMinor),
    earnings: Object.fromEntries(Object.entries(earnings).map(([k, v]) => [k, num(v)])) as Record<string, number>,
    subIds: list(s.subIds).map((row) => {
      const r = obj(row);
      return { subId: str(r.subId), clicks: num(r.clicks), conversions: num(r.conversions) };
    }),
  };
}

export function readBalance(raw: unknown) {
  const b = obj(raw);
  return {
    currency: str(b.currency),
    pendingMinor: num(b.pendingMinor),
    payableMinor: num(b.payableMinor),
    inPayoutMinor: num(b.inPayoutMinor),
    paidMinor: num(b.paidMinor),
    reversedMinor: num(b.reversedMinor),
  };
}

function readPage<T>(raw: unknown, item: (row: Obj) => T | null) {
  const p = obj(raw);
  return {
    items: list(p.items)
      .map((row) => item(obj(row)))
      .filter((row): row is T => row !== null),
    nextCursor: str(p.nextCursor),
  };
}

export function readEarnings(raw: unknown) {
  return readPage(raw, (r) => {
    const id = str(r.id);
    if (!id) return null;
    return {
      id,
      kind: str(r.kind) ?? "",
      status: str(r.status) ?? "",
      rewardType: str(r.rewardType) ?? "",
      amountMinor: num(r.amountMinor),
      currency: str(r.currency),
      reason: str(r.reason),
      approvableAt: str(r.approvableAt),
      createdAt: str(r.createdAt),
    };
  });
}

export function readPayouts(raw: unknown) {
  return readPage(raw, (r) => {
    const id = str(r.id);
    if (!id) return null;
    return {
      id,
      status: str(r.status) ?? "",
      amountMinor: num(r.amountMinor),
      currency: str(r.currency),
      method: str(r.method),
      providerRef: str(r.providerRef),
      paidAt: str(r.paidAt),
      createdAt: str(r.createdAt),
    };
  });
}

// Shared tone for statuses across the dashboard (classes .status--done / --warn / --stop).
export function statusTone(status: string | null | undefined): "done" | "warn" | "stop" | null {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
    case "PAID":
    case "DELIVERED":
    case "COMPLETED":
      return "done";
    case "PENDING":
    case "DRAFT":
    case "PROCESSING":
      return "warn";
    case "REVERSED":
    case "CANCELLED":
    case "FAILED":
    case "REJECTED":
    case "SUSPENDED":
    case "CLOSED":
    case "REFUNDED":
      return "stop";
    default:
      return null;
  }
}
