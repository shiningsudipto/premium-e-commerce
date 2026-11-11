import type {
  GetV1AdminAffiliatesConfigRulesApiResponse,
  GetV1AdminAffiliatesConfigTiersApiResponse,
  GetV1AdminAffiliatesIdApiResponse,
  GetV1AdminAffiliatesIdEarningsApiResponse,
  GetV1AdminAffiliatesIdPayoutsApiResponse,
  PostV1AdminAffiliatesConfigRulesApiArg,
  PostV1AdminAffiliatesConfigTiersApiArg,
} from "../../store/api.generated";
import { formatMoney, inputToMinor } from "../../lib/money";

// Pure helpers for the affiliate screens. They mirror the API's rules (affiliates.states.ts,
// affiliates.service.ts, affiliates.engine.ts) so the UI only offers what the API will accept;
// the API still decides.

export type Affiliate = GetV1AdminAffiliatesIdApiResponse;
export type AffiliateStatus = Affiliate["status"];
export type AffiliateLink = Affiliate["links"][number];
export type Earning = GetV1AdminAffiliatesIdEarningsApiResponse["items"][number];
export type Payout = GetV1AdminAffiliatesIdPayoutsApiResponse["items"][number];
export type PayoutStatus = Payout["status"];
export type Tier = GetV1AdminAffiliatesConfigTiersApiResponse[number];
export type CommissionRule = GetV1AdminAffiliatesConfigRulesApiResponse[number];
export type RuleScope = CommissionRule["scope"];
export type RuleType = CommissionRule["rule"]["type"];
export type RuleAppliesTo = NonNullable<CommissionRule["rule"]["appliesTo"]>;
export type RuleBody = PostV1AdminAffiliatesConfigRulesApiArg["body"];
export type TierBody = PostV1AdminAffiliatesConfigTiersApiArg["body"];

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export const customerLabel = (c: { email: string | null; firstName: string | null; lastName: string | null }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Unnamed customer";

// ── Affiliate status ─────────────────────────────────────────────────────────

export const AFFILIATE_STATUS_LABELS: Record<AffiliateStatus, string> = {
  PENDING: "Pending review",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

export function affiliateStatusVariant(status: AffiliateStatus): BadgeVariant {
  if (status === "ACTIVE") return "default";
  if (status === "PENDING") return "secondary";
  if (status === "SUSPENDED") return "destructive";
  return "outline";
}

export type StatusAction = {
  key: "approve" | "reject" | "suspend" | "reactivate" | "close";
  to: AffiliateStatus;
  label: string;
  title: string;
  description: string;
  reasonRequired: boolean;
  destructive: boolean;
};

const STATUS_ACTIONS: Record<StatusAction["key"], StatusAction> = {
  approve: {
    key: "approve",
    to: "ACTIVE",
    label: "Approve",
    title: "Approve this application?",
    description: "They become an active affiliate, get a default referral code and can start earning commission.",
    reasonRequired: false,
    destructive: false,
  },
  reject: {
    key: "reject",
    to: "REJECTED",
    label: "Reject",
    title: "Reject this application?",
    description: "The applicant is told their application was not accepted. This can't be undone.",
    reasonRequired: true,
    destructive: true,
  },
  suspend: {
    key: "suspend",
    to: "SUSPENDED",
    label: "Suspend",
    title: "Suspend this affiliate?",
    description:
      "Their links stop earning commission until they are reactivated. They see a notice in their dashboard.",
    reasonRequired: true,
    destructive: true,
  },
  reactivate: {
    key: "reactivate",
    to: "ACTIVE",
    label: "Reactivate",
    title: "Reactivate this affiliate?",
    description: "Their links earn commission again.",
    reasonRequired: false,
    destructive: false,
  },
  close: {
    key: "close",
    to: "CLOSED",
    label: "Close account",
    title: "Close this affiliate account?",
    description: "They lose access to the affiliate dashboard and stop earning. This can't be undone.",
    reasonRequired: true,
    destructive: true,
  },
};

// Same transitions as the API's affiliate state machine (spec §14.5).
const NEXT_ACTIONS: Record<AffiliateStatus, StatusAction["key"][]> = {
  PENDING: ["approve", "reject"],
  ACTIVE: ["suspend", "close"],
  SUSPENDED: ["reactivate"],
  REJECTED: [],
  CLOSED: [],
};

export const statusActions = (status: AffiliateStatus): StatusAction[] =>
  NEXT_ACTIONS[status].map((k) => STATUS_ACTIONS[k]);

export const statusAction = (key: StatusAction["key"]) => STATUS_ACTIONS[key];

// Reasons are optional for the API; staff must give one where the affiliate loses something.
export function validateReason(action: StatusAction, reason: string): string | null {
  const text = reason.trim();
  if (action.reasonRequired && text.length < 3) return "Give a reason (at least 3 characters).";
  if (text.length > 500) return "Keep the reason under 500 characters.";
  return null;
}

// ── Referral codes ───────────────────────────────────────────────────────────

export const LINK_STATUS_LABELS: Record<AffiliateLink["status"], string> = {
  ACTIVE: "Active",
  PENDING_APPROVAL: "Awaiting approval",
  DISABLED: "Disabled",
};

export function linkActions(status: AffiliateLink["status"]): ("ACTIVE" | "DISABLED")[] {
  if (status === "PENDING_APPROVAL") return ["ACTIVE", "DISABLED"];
  if (status === "ACTIVE") return ["DISABLED"];
  return ["ACTIVE"];
}

// ── Earnings ─────────────────────────────────────────────────────────────────

export const EARNING_KIND_LABELS: Record<Earning["kind"], string> = {
  COMMISSION: "Commission",
  ADJUSTMENT: "Adjustment",
  REVERSAL: "Reversal",
};

export const EARNING_STATUS_LABELS: Record<Earning["status"], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REVERSED: "Reversed",
};

export const REWARD_TYPE_LABELS: Record<Earning["rewardType"], string> = {
  CASH: "Cash",
  STORE_CREDIT: "Store credit",
  LOYALTY_POINTS: "Loyalty points",
};

export type AdjustmentKind = "bonus" | "correction" | "penalty";

export const ADJUSTMENT_KIND_LABELS: Record<AdjustmentKind, string> = {
  bonus: "Bonus",
  correction: "Correction",
  penalty: "Penalty",
};

export type AdjustmentInput = {
  kind: AdjustmentKind;
  // corrections may go either way; bonuses add and penalties deduct
  direction: "add" | "deduct";
  amount: string;
  reason: string;
  currency: string;
};

export type AdjustmentResult =
  | { ok: true; body: { amountMinor: number; currency: string; reason: string } }
  | { ok: false; errors: Partial<Record<"amount" | "reason", string>> };

// Builds the adjustment the API takes: a signed amount and a reason that says what kind it was.
export function buildAdjustment(input: AdjustmentInput): AdjustmentResult {
  const errors: Partial<Record<"amount" | "reason", string>> = {};
  const minor = inputToMinor(input.amount, input.currency);
  if (minor === null || Number.isNaN(minor) || minor <= 0) errors.amount = "Enter an amount greater than zero.";
  const reason = input.reason.trim();
  if (reason.length < 3) errors.reason = "Give a reason (at least 3 characters).";
  const label = ADJUSTMENT_KIND_LABELS[input.kind];
  const full = `${label}: ${reason}`;
  if (full.length > 500) errors.reason = "Keep the reason shorter.";
  if (errors.amount || errors.reason) return { ok: false, errors };
  const negative = input.kind === "penalty" || (input.kind === "correction" && input.direction === "deduct");
  return { ok: true, body: { amountMinor: negative ? -minor! : minor!, currency: input.currency, reason: full } };
}

// ── Payouts (manual, spec §7.6) ──────────────────────────────────────────────

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  DRAFT: "Prepared",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export function payoutStatusVariant(status: PayoutStatus): BadgeVariant {
  if (status === "PAID") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "CANCELLED") return "outline";
  return "secondary";
}

export type PayoutAction = "approve" | "markPaid" | "cancel";

// Manual payouts go DRAFT → APPROVED → PAID; a payout can be cancelled until it is paid
// (PROCESSING belongs to payout providers, so staff don't move it by hand).
const PAYOUT_ACTIONS: Record<PayoutStatus, PayoutAction[]> = {
  DRAFT: ["approve", "cancel"],
  APPROVED: ["markPaid", "cancel"],
  PROCESSING: [],
  FAILED: ["cancel"],
  PAID: [],
  CANCELLED: [],
};

export const PAYOUT_ACTION_PERMISSIONS: Record<PayoutAction, string> = {
  approve: "affiliates.payouts.approve",
  markPaid: "affiliates.payouts.approve",
  cancel: "affiliates.payouts.prepare",
};

export function payoutActions(status: PayoutStatus, can: (permission: string) => boolean = () => true): PayoutAction[] {
  return PAYOUT_ACTIONS[status].filter((a) => can(PAYOUT_ACTION_PERMISSIONS[a]));
}

export const PAYOUT_METHODS = [
  { value: "default", label: "Affiliate's default method" },
  { value: "bank", label: "Bank transfer" },
  { value: "mobile_wallet", label: "Mobile wallet" },
  { value: "manual", label: "Other (manual)" },
] as const;

export const payoutMethodLabel = (method: string) =>
  PAYOUT_METHODS.find((m) => m.value === method)?.label ?? method.replace(/_/g, " ");

export function validateReference(reference: string): string | null {
  const text = reference.trim();
  if (!text) return "Enter the payment reference (transaction or receipt ID).";
  if (text.length > 200) return "Keep the reference under 200 characters.";
  return null;
}

// ── Commission rules (spec §7.4) ─────────────────────────────────────────────

// Most specific first, the order the engine resolves them in.
export const RULE_SCOPES: RuleScope[] = ["affiliate_product", "product", "category", "affiliate", "tier", "program"];

export const RULE_SCOPE_LABELS: Record<RuleScope, string> = {
  program: "Program default",
  tier: "Tier",
  category: "Category",
  product: "Product",
  affiliate: "Affiliate",
  affiliate_product: "Affiliate + product",
};

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  percent: "Percent of sale",
  fixed_per_item: "Fixed amount per item",
  fixed_per_order: "Fixed amount per order",
  tiered: "Tiered by sales",
};

export const APPLIES_TO_LABELS: Record<RuleAppliesTo, string> = {
  all: "All orders",
  first_order: "First orders only",
  returning: "Returning customers only",
};

export type ScopeParts = { targetId: string; affiliateId: string; productId: string };

// scopeId as the API stores it: "" for program, "<affiliateId>:<productId>" for affiliate+product.
export function composeScopeId(scope: RuleScope, parts: ScopeParts): string {
  if (scope === "program") return "";
  if (scope === "affiliate_product") return `${parts.affiliateId.trim()}:${parts.productId.trim()}`;
  return parts.targetId.trim();
}

export function splitScopeId(scope: RuleScope, scopeId: string): ScopeParts {
  if (scope === "affiliate_product") {
    const [affiliateId = "", productId = ""] = scopeId.split(":");
    return { targetId: "", affiliateId, productId };
  }
  return { targetId: scope === "program" ? "" : scopeId, affiliateId: "", productId: "" };
}

// Parses a percent typed by staff: 0–100 with up to two decimals; anything else is NaN.
export function parsePercent(value: string): number {
  const text = value.trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return Number.NaN;
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : Number.NaN;
}

export type RuleForm = {
  scope: RuleScope;
  parts: ScopeParts;
  type: RuleType;
  percent: string;
  amount: string;
  tiers: { minSales: string; percent: string }[];
  appliesTo: RuleAppliesTo;
  priority: string;
  isActive: boolean;
  activeFrom: string;
  activeTo: string;
  currency: string;
};

export type RuleFormResult = { ok: true; body: RuleBody } | { ok: false; errors: Record<string, string> };

// Date inputs give "2026-03-01"; the API takes ISO timestamps (start of that day, local time).
function dateValue(value: string): string | null | undefined {
  const text = value.trim();
  if (!text) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildRule(form: RuleForm): RuleFormResult {
  const errors: Record<string, string> = {};
  if (form.scope === "affiliate_product") {
    if (!form.parts.affiliateId.trim()) errors.affiliateId = "Choose the affiliate.";
    if (!form.parts.productId.trim()) errors.productId = "Enter the product ID.";
    if (/:/.test(form.parts.affiliateId + form.parts.productId)) errors.productId = "IDs can't contain a colon.";
  } else if (form.scope !== "program" && !form.parts.targetId.trim()) {
    errors.targetId = `Choose the ${RULE_SCOPE_LABELS[form.scope].toLowerCase()} this rule is for.`;
  }

  const rule: RuleBody["rule"] = { type: form.type, appliesTo: form.appliesTo };
  if (form.type === "percent") {
    const percent = parsePercent(form.percent);
    if (Number.isNaN(percent)) errors.percent = "Enter a percent between 0 and 100.";
    else rule.percent = percent;
  } else if (form.type === "tiered") {
    if (!form.tiers.length) errors.tiers = "Add at least one tier.";
    const tiers = form.tiers.map((t) => ({
      minSalesMinor: inputToMinor(t.minSales, form.currency) ?? 0,
      percent: parsePercent(t.percent),
    }));
    if (tiers.some((t) => Number.isNaN(t.minSalesMinor) || Number.isNaN(t.percent)))
      errors.tiers = "Each tier needs a sales threshold and a percent between 0 and 100.";
    else rule.tiers = tiers;
  } else {
    const amount = inputToMinor(form.amount, form.currency);
    if (amount === null || Number.isNaN(amount)) errors.amount = "Enter an amount.";
    else rule.amountMinor = amount;
  }

  const priority = form.priority.trim() === "" ? 0 : Number(form.priority);
  if (!Number.isInteger(priority)) errors.priority = "Priority is a whole number.";
  const activeFrom = dateValue(form.activeFrom);
  const activeTo = dateValue(form.activeTo);
  if (activeFrom === undefined) errors.activeFrom = "Enter a valid date.";
  if (activeTo === undefined) errors.activeTo = "Enter a valid date.";
  if (activeFrom && activeTo && activeTo <= activeFrom) errors.activeTo = "The end must be after the start.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    body: {
      scope: form.scope,
      scopeId: composeScopeId(form.scope, form.parts),
      rule,
      priority,
      isActive: form.isActive,
      activeFrom: activeFrom ?? null,
      activeTo: activeTo ?? null,
    },
  };
}

// "10% of the sale", "৳50.00 per item", "5% up to ৳10,000.00, then 8%"; plus who it applies to.
export function describeRule(rule: CommissionRule["rule"], currency: string): string {
  let what: string;
  if (rule.type === "percent") what = `${rule.percent ?? 0}% of the sale`;
  else if (rule.type === "fixed_per_item") what = `${formatMoney(rule.amountMinor ?? 0, currency)} per item`;
  else if (rule.type === "fixed_per_order") what = `${formatMoney(rule.amountMinor ?? 0, currency)} per order`;
  else
    what = [...(rule.tiers ?? [])]
      .sort((a, b) => a.minSalesMinor - b.minSalesMinor)
      .map((t) => `${t.percent}% from ${formatMoney(t.minSalesMinor, currency)}`)
      .join(", ");
  const appliesTo = rule.appliesTo ?? "all";
  return appliesTo === "all" ? what : `${what} (${APPLIES_TO_LABELS[appliesTo].toLowerCase()})`;
}

// ── Tiers ────────────────────────────────────────────────────────────────────

export type TierForm = {
  handle: string;
  name: string;
  rewardType: TierBody["rewardType"];
  autoApprove: boolean;
  isDefault: boolean;
  position: string;
  minSales: string;
  currency: string;
};

export type TierFormResult = { ok: true; body: TierBody } | { ok: false; errors: Record<string, string> };

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function buildTier(form: TierForm): TierFormResult {
  const errors: Record<string, string> = {};
  const handle = form.handle.trim();
  if (!/^[a-z0-9-]+$/.test(handle)) errors.handle = "Use lowercase letters, digits and dashes.";
  const name = form.name.trim();
  if (!name) errors.name = "Enter a name.";
  const position = form.position.trim() === "" ? 0 : Number(form.position);
  if (!Number.isInteger(position)) errors.position = "Position is a whole number.";
  const minSales = inputToMinor(form.minSales, form.currency);
  if (minSales !== null && Number.isNaN(minSales)) errors.minSales = "Enter an amount, or leave empty.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    body: {
      handle,
      name,
      rewardType: form.rewardType,
      autoApprove: form.autoApprove,
      isDefault: form.isDefault,
      position,
      minSalesMinor: minSales,
    },
  };
}

// ── Application answers ──────────────────────────────────────────────────────

// Custom field keys ("audience_size") as labels ("Audience size").
export function fieldLabel(key: string): string {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? words[0]!.toUpperCase() + words.slice(1) : key;
}

export function fieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(fieldValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
