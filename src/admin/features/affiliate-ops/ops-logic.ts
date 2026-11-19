// Affiliate operations (plan B-Phase 3): fraud review, payout batches and marketing assets.
// Pure wording and rules, unit-tested in ops-logic.test.ts.

import { can } from "../../lib/permissions";

// ── Fraud review ─────────────────────────────────────────────────────────────

export type FraudKind = "SELF_REFERRAL" | "HIGH_REFUND_RATE" | "CLICK_SPIKE" | "MARGIN_CAP" | "COUPON_LEAK" | "OTHER";
export type FraudStatus = "OPEN" | "DISMISSED" | "CONFIRMED";

export const FRAUD_KIND_LABELS: Record<FraudKind, string> = {
  SELF_REFERRAL: "Self-referral",
  HIGH_REFUND_RATE: "High refund rate",
  CLICK_SPIKE: "Click spike without sales",
  MARGIN_CAP: "Commission over margin cap",
  COUPON_LEAK: "Coupon code leaked",
  OTHER: "Other",
};

export const FRAUD_STATUS_LABELS: Record<FraudStatus, string> = {
  OPEN: "Open",
  DISMISSED: "Dismissed",
  CONFIRMED: "Confirmed",
};

export const fraudStatusVariant = (s: FraudStatus) =>
  s === "OPEN" ? "destructive" : s === "CONFIRMED" ? "default" : "secondary";

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

// The evidence a flag carries, as label/value pairs. Each kind records different numbers.
export function fraudEvidence(kind: FraudKind, details: Record<string, unknown>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value) out.push({ label, value });
  };
  switch (kind) {
    case "HIGH_REFUND_RATE": {
      const orders = num(details.orders);
      const refunded = num(details.refunded);
      const rate = num(details.rate);
      push("Orders (30 days)", orders != null ? String(orders) : null);
      push("Refunded", refunded != null ? String(refunded) : null);
      push("Refund rate", rate != null ? `${Math.round(rate * 100)}%` : null);
      break;
    }
    case "CLICK_SPIKE": {
      const clicks = num(details.clicks);
      push("Clicks", clicks != null ? clicks.toLocaleString("en-GB") : null);
      const since = str(details.since);
      push("Since", since ? new Date(since).toLocaleDateString("en-GB", { dateStyle: "medium" }) : null);
      push("Orders", "0");
      break;
    }
    case "SELF_REFERRAL":
      push("Code", str(details.code));
      push("Source", str(details.source));
      break;
    case "MARGIN_CAP":
      push("Capped lines", Array.isArray(details.lines) ? String(details.lines.length) : null);
      break;
    default:
      push("Reported by", str(details.reportedBy) ? "Staff" : null);
  }
  return out;
}

export type ResolveForm = { outcome: "DISMISSED" | "CONFIRMED" | "SUSPEND"; note: string };

export const RESOLVE_OUTCOMES: { value: ResolveForm["outcome"]; label: string; help: string }[] = [
  {
    value: "DISMISSED",
    label: "Dismiss",
    help: "Not fraud. The flag is closed and nothing changes for the affiliate.",
  },
  { value: "CONFIRMED", label: "Confirm", help: "Fraud confirmed and recorded. The affiliate stays active." },
  {
    value: "SUSPEND",
    label: "Confirm and suspend",
    help: "Fraud confirmed; the affiliate is suspended, so their links stop earning commission.",
  },
];

export function buildResolve(
  form: ResolveForm,
):
  | { ok: true; body: { status: "DISMISSED" | "CONFIRMED"; note?: string; suspend: boolean } }
  | { ok: false; errors: Record<string, string> } {
  const note = form.note.trim();
  if (note.length > 1000) return { ok: false, errors: { note: "Keep the note under 1000 characters." } };
  if (form.outcome !== "DISMISSED" && note.length < 3)
    return { ok: false, errors: { note: "Say why you're confirming this flag." } };
  return {
    ok: true,
    body: {
      status: form.outcome === "DISMISSED" ? "DISMISSED" : "CONFIRMED",
      ...(note ? { note } : {}),
      suspend: form.outcome === "SUSPEND",
    },
  };
}

// ── Payout batches ───────────────────────────────────────────────────────────

export type PayoutStatus = "DRAFT" | "APPROVED" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

export const BATCH_STATUS_LABELS: Record<PayoutStatus, string> = {
  DRAFT: "Waiting for approval",
  APPROVED: "Approved",
  PROCESSING: "Partly paid",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const payoutStatusVariant = (s: PayoutStatus): "default" | "secondary" | "destructive" | "outline" =>
  s === "FAILED" ? "destructive" : s === "PAID" ? "secondary" : s === "CANCELLED" ? "outline" : "default";

export const PERMS = {
  read: "affiliates.read",
  prepare: "affiliates.payouts.prepare",
  approve: "affiliates.payouts.approve",
} as const;

type Gate = { allowed: boolean; reason: string | null };
const gate = (show: boolean, permitted: boolean, reasonIfNot: string): Gate | null =>
  !show ? null : permitted ? { allowed: true, reason: null } : { allowed: false, reason: reasonIfNot };

// Which batch actions apply in a status (the API's payout state machine) and whether this staff
// member may take them. A null action doesn't apply; a disallowed one says why.
export function batchActions(status: PayoutStatus, permissions: readonly string[] | undefined) {
  const approver = can(permissions, PERMS.approve);
  const preparer = can(permissions, PERMS.prepare);
  return {
    approve: gate(status === "DRAFT", approver, "Only the Owner (payout approval permission) can approve a batch."),
    markPaid: gate(status === "APPROVED" || status === "PROCESSING", approver, "Only the Owner can record payments."),
    cancel: gate(
      status === "DRAFT" || status === "APPROVED",
      preparer,
      "You need the payout preparation permission to cancel.",
    ),
    export: gate(true, preparer, "You need the payout preparation permission to export."),
  };
}

// Payouts in a batch that can still be marked paid.
export const payableStatuses: readonly PayoutStatus[] = ["APPROVED", "PROCESSING"];

// References typed per payout → the API's { payoutId: reference } (empty ones are skipped, so a
// batch can be paid in parts).
export function buildReferences(
  refs: Record<string, string>,
  payoutIds: string[],
): { ok: true; references: Record<string, string> } | { ok: false; error: string } {
  const references: Record<string, string> = {};
  for (const id of payoutIds) {
    const ref = (refs[id] ?? "").trim();
    if (!ref) continue;
    if (ref.length > 200) return { ok: false, error: "References must be under 200 characters." };
    references[id] = ref;
  }
  if (!Object.keys(references).length)
    return { ok: false, error: "Enter the transfer reference for at least one payout." };
  return { ok: true, references };
}

const METHOD_TYPE_LABELS: Record<string, string> = {
  bank: "Bank transfer",
  mobile_wallet: "Mobile wallet",
  manual: "Manual",
};

// "bKash •••• 5678" — the provider name and masked number the API returns; never full details.
export function payoutMethodText(p: {
  method: string;
  payoutMethod: { type: string; label: string; masked: string } | null;
}): string {
  if (p.payoutMethod) return `${p.payoutMethod.label} ${p.payoutMethod.masked}`;
  return p.method === "manual" ? "No payout method on file" : (METHOD_TYPE_LABELS[p.method] ?? p.method);
}

export const methodTypeLabel = (type: string) => METHOD_TYPE_LABELS[type] ?? type;

// "You" for the signed-in staff member, otherwise a short staff ID.
export function staffLabel(id: string | null, meId: string | undefined): string {
  if (!id) return "—";
  if (id === meId) return "You";
  return id.length > 10 ? `Staff …${id.slice(-6)}` : `Staff ${id}`;
}

// ── Marketing assets ─────────────────────────────────────────────────────────

export type AssetKind = "banner" | "image" | "copy";

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  banner: "Banner",
  image: "Product image",
  copy: "Text copy",
};

export type AssetForm = {
  title: string;
  kind: AssetKind;
  mediaId: string;
  body: string;
  productId: string;
  isActive: boolean;
};

export function buildAsset(form: AssetForm):
  | {
      ok: true;
      body: {
        title: string;
        kind: AssetKind;
        mediaId: string | null;
        body: string | null;
        productId: string | null;
        isActive: boolean;
      };
    }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const title = form.title.trim();
  const body = form.body.trim();
  const mediaId = form.mediaId.trim();
  if (!title) errors.title = "Give the asset a title.";
  else if (title.length > 200) errors.title = "Keep the title under 200 characters.";
  if (form.kind !== "copy" && !mediaId) errors.mediaId = "Banners and images need a file from the media library.";
  if (form.kind === "copy" && !body) errors.body = "Write the copy affiliates will use.";
  if (body.length > 5000) errors.body = "Keep the copy under 5000 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    body: {
      title,
      kind: form.kind,
      mediaId: form.kind === "copy" ? mediaId || null : mediaId,
      body: body || null,
      productId: form.productId.trim() || null,
      isActive: form.isActive,
    },
  };
}

export const percent = (rate: number) => `${(rate * 100).toFixed(rate > 0 && rate < 0.1 ? 1 : 0)}%`;
