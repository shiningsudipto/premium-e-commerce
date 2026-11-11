import type {
  GetV1AdminPromotionsIdApiResponse,
  PatchV1AdminPromotionsIdApiArg,
  PostV1AdminPromotionsApiArg,
  PostV1AdminPromotionsSimulateApiArg,
  PostV1AdminPromotionsSimulateApiResponse,
} from "../../store/api.generated";
import { inputToMinor, minorToInput } from "../../lib/money";
import { fromLocalInput, toLocalInput } from "../products/product-form";
import {
  readActions,
  readConditions,
  toActionsInput,
  toConditionsInput,
  validateActions,
  validateConditions,
  type Action,
  type GroupCondition,
} from "./promotion-rules";

export type Promotion = GetV1AdminPromotionsIdApiResponse;
export type PromotionType = Promotion["type"];
export type PromotionStatus = Promotion["status"];
export type EffectiveStatus = Promotion["effectiveStatus"];
export type CreateBody = PostV1AdminPromotionsApiArg["body"];
export type UpdateBody = PatchV1AdminPromotionsIdApiArg["body"];
export type Simulation = PostV1AdminPromotionsSimulateApiResponse;
export type SimulateBody = PostV1AdminPromotionsSimulateApiArg["body"];
export type RejectReason = Simulation["rejected"][number]["reason"];

// ── Status ───────────────────────────────────────────────────────────────────

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  SCHEDULED: "Scheduled",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
};

export const effectiveStatusVariant = (s: EffectiveStatus) =>
  s === "ACTIVE" ? "default" : s === "SCHEDULED" ? "secondary" : s === "EXPIRED" ? "destructive" : "outline";

export const TYPE_LABELS: Record<PromotionType, string> = { AUTOMATIC: "Automatic", CODE: "Code" };

// The status changes the API allows from here (archived is final; duplicate instead).
export function statusTransitions(status: PromotionStatus): PromotionStatus[] {
  if (status === "DRAFT") return ["ACTIVE", "ARCHIVED"];
  if (status === "ACTIVE") return ["DRAFT", "ARCHIVED"];
  return [];
}

export function transitionCopy(to: PromotionStatus, p: Pick<Promotion, "name" | "startsAt">, now = new Date()) {
  if (to === "ACTIVE") {
    const scheduled = p.startsAt && new Date(p.startsAt) > now;
    return {
      label: "Activate",
      title: `Activate ${p.name}?`,
      description: scheduled
        ? "It is scheduled and starts applying to carts when its start time comes."
        : "It starts applying to matching carts straight away.",
      confirm: "Activate",
      destructive: false,
    };
  }
  if (to === "DRAFT")
    return {
      label: "Return to draft",
      title: `Return ${p.name} to draft?`,
      description: "It stops applying to carts until it's activated again.",
      confirm: "Return to draft",
      destructive: false,
    };
  return {
    label: "Archive",
    title: `Archive ${p.name}?`,
    description: "It stops applying for good and can't be reactivated. Its codes stop working.",
    confirm: "Archive promotion",
    destructive: true,
  };
}

// ── Form ─────────────────────────────────────────────────────────────────────

// Text fields hold what staff typed; numbers are parsed on validation and submit.
export type PromotionForm = {
  name: string;
  description: string;
  type: PromotionType;
  priority: string;
  stopFurther: boolean;
  exclusivityGroup: string;
  combinesWithSalePrices: boolean;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  maxDiscount: string;
  conditions: GroupCondition;
  actions: Action[];
};

export function blankForm(type: PromotionType = "AUTOMATIC"): PromotionForm {
  return {
    name: "",
    description: "",
    type,
    priority: "0",
    stopFurther: false,
    exclusivityGroup: "",
    combinesWithSalePrices: true,
    startsAt: "",
    endsAt: "",
    usageLimit: "",
    perCustomerLimit: "",
    maxDiscount: "",
    conditions: { type: "all", conditions: [] },
    actions: [{ type: "percent_off", percent: 10, target: "order", filter: {} }],
  };
}

export function formFromPromotion(p: Promotion, currency: string): PromotionForm {
  return {
    name: p.name,
    description: p.description ?? "",
    type: p.type,
    priority: String(p.priority),
    stopFurther: p.stopFurther,
    exclusivityGroup: p.exclusivityGroup ?? "",
    combinesWithSalePrices: p.combinesWithSalePrices,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    usageLimit: p.usageLimit === null ? "" : String(p.usageLimit),
    perCustomerLimit: p.perCustomerLimit === null ? "" : String(p.perCustomerLimit),
    maxDiscount: minorToInput(p.maxDiscountMinor, currency),
    conditions: readConditions(p.conditions),
    actions: readActions(p.actions),
  };
}

// Empty → null; anything but digits (with an optional minus when allowed) → NaN.
export function parseInteger(text: string, { signed = false } = {}): number | null {
  const t = text.trim();
  if (!t) return null;
  return (signed ? /^-?\d+$/ : /^\d+$/).test(t) ? Number(t) : Number.NaN;
}

export type FormErrors = {
  fields: Record<string, string>;
  conditions: Record<string, string>;
  actions: Record<string, string>;
};

export const hasErrors = (e: FormErrors) =>
  Object.keys(e.fields).length + Object.keys(e.conditions).length + Object.keys(e.actions).length > 0;

export function validateForm(form: PromotionForm, currency: string): FormErrors {
  const fields: Record<string, string> = {};
  if (!form.name.trim()) fields.name = "Give the promotion a name";
  if (form.name.length > 200) fields.name = "At most 200 characters";
  if (form.description.length > 1000) fields.description = "At most 1000 characters";
  if (form.exclusivityGroup.trim().length > 50) fields.exclusivityGroup = "At most 50 characters";
  if (Number.isNaN(parseInteger(form.priority, { signed: true }))) fields.priority = "Use a whole number";
  for (const key of ["usageLimit", "perCustomerLimit"] as const) {
    const n = parseInteger(form[key]);
    if (n !== null && (Number.isNaN(n) || n < 1)) fields[key] = "Use a whole number of at least 1, or leave empty";
  }
  const max = inputToMinor(form.maxDiscount, currency);
  if (max !== null && (Number.isNaN(max) || max <= 0))
    fields.maxDiscount = "Enter an amount above zero, or leave empty";
  const starts = fromLocalInput(form.startsAt);
  const ends = fromLocalInput(form.endsAt);
  if (form.startsAt && !starts) fields.startsAt = "Enter a valid date and time";
  if (form.endsAt && !ends) fields.endsAt = "Enter a valid date and time";
  if (starts && ends && ends <= starts) fields.endsAt = "The end must be after the start";
  return { fields, conditions: validateConditions(form.conditions), actions: validateActions(form.actions) };
}

export function toCreateBody(form: PromotionForm, currency: string): CreateBody {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    type: form.type,
    priority: parseInteger(form.priority, { signed: true }) ?? 0,
    stopFurther: form.stopFurther,
    exclusivityGroup: form.exclusivityGroup.trim() || null,
    combinesWithSalePrices: form.combinesWithSalePrices,
    conditions: toConditionsInput(form.conditions),
    actions: toActionsInput(form.actions),
    startsAt: fromLocalInput(form.startsAt),
    endsAt: fromLocalInput(form.endsAt),
    usageLimit: parseInteger(form.usageLimit),
    perCustomerLimit: parseInteger(form.perCustomerLimit),
    maxDiscountMinor: inputToMinor(form.maxDiscount, currency),
  };
}

// A promotion's type can't change, so updates leave it out.
export function toUpdateBody(form: PromotionForm, currency: string, version: number): UpdateBody {
  const { type, ...rest } = toCreateBody(form, currency);
  void type;
  return { ...rest, version };
}

// ── Codes ────────────────────────────────────────────────────────────────────

// What the API accepts after upper-casing (spec §8.2).
export const CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;

// A pasted list (one per line, or separated by commas or spaces) as unique upper-case codes.
export function parseCodes(text: string): { codes: string[]; invalid: string[] } {
  const codes = [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  return { codes: codes.filter((c) => CODE_PATTERN.test(c)), invalid: codes.filter((c) => !CODE_PATTERN.test(c)) };
}

export type GenerateForm = { count: string; prefix: string; length: string; usageLimit: string };

export function validateGenerate(g: GenerateForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const count = parseInteger(g.count);
  if (count === null || Number.isNaN(count) || count < 1 || count > 10_000) errors.count = "From 1 to 10,000 codes";
  const length = parseInteger(g.length);
  if (length === null || Number.isNaN(length) || length < 6 || length > 16) errors.length = "From 6 to 16 characters";
  if (g.prefix && !/^[A-Za-z0-9_-]{0,20}$/.test(g.prefix)) errors.prefix = "Up to 20 letters, digits, - or _";
  const limit = parseInteger(g.usageLimit);
  if (limit !== null && (Number.isNaN(limit) || limit < 1))
    errors.usageLimit = "A whole number of at least 1, or empty";
  return errors;
}

// ── Simulator ────────────────────────────────────────────────────────────────

export type SimLine = {
  variantId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  compareAt: string;
};

export type SimForm = {
  lines: SimLine[];
  codes: string;
  customerId: string;
  country: string;
  shippingRateId: string;
  shipping: string;
};

export const blankSimForm = (): SimForm => ({
  lines: [],
  codes: "",
  customerId: "",
  country: "",
  shippingRateId: "",
  shipping: "",
});

export function validateSim(form: SimForm, currency: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.lines.length === 0) errors._form = "Add at least one product to the sample cart";
  form.lines.forEach((l, i) => {
    const qty = parseInteger(l.quantity);
    const price = inputToMinor(l.unitPrice, currency);
    const compare = inputToMinor(l.compareAt, currency);
    if (!l.variantId.trim()) errors[`${i}`] = "Choose a variant";
    else if (qty === null || Number.isNaN(qty) || qty < 1) errors[`${i}`] = "Quantity must be at least 1";
    else if (price === null || Number.isNaN(price)) errors[`${i}`] = "Enter a unit price";
    else if (compare !== null && Number.isNaN(compare))
      errors[`${i}`] = "Enter a valid compare-at price, or leave empty";
  });
  if (form.country && !/^[A-Za-z]{2}$/.test(form.country.trim())) errors.country = "A 2-letter country code";
  const shipping = inputToMinor(form.shipping, currency);
  if (shipping !== null && Number.isNaN(shipping)) errors.shipping = "Enter a valid amount";
  return errors;
}

export function toSimulateBody(form: SimForm, currency: string, promotionIds?: string[]): SimulateBody {
  return {
    currency,
    lines: form.lines.map((l) => ({
      variantId: l.variantId.trim(),
      quantity: parseInteger(l.quantity) ?? 1,
      unitPriceMinor: inputToMinor(l.unitPrice, currency) ?? 0,
      compareAtMinor: inputToMinor(l.compareAt, currency),
    })),
    codes: parseCodes(form.codes).codes,
    customerId: form.customerId.trim() || null,
    country: form.country.trim().toUpperCase() || null,
    shippingRateId: form.shippingRateId || null,
    shippingMinor: inputToMinor(form.shipping, currency) ?? 0,
    ...(promotionIds?.length ? { promotionIds } : {}),
  };
}

// The engine's reasons (promotions.engine.ts), for people.
export const REJECT_REASONS: Record<RejectReason | "NOT_FOUND", { label: string; help: string }> = {
  INACTIVE: { label: "Not active", help: "The promotion (or this code) is a draft, archived or disabled." },
  NOT_STARTED: { label: "Not started", help: "Its start time is still in the future." },
  EXPIRED: { label: "Expired", help: "Its end time has passed." },
  USAGE_LIMIT_REACHED: { label: "Usage limit reached", help: "It (or this code) has been used as often as allowed." },
  CUSTOMER_LIMIT_REACHED: {
    label: "Customer limit reached",
    help: "This customer has already used it as often as allowed.",
  },
  CONDITIONS_NOT_MET: { label: "Conditions not met", help: "The cart or customer doesn't satisfy its conditions." },
  NO_ELIGIBLE_ITEMS: {
    label: "Nothing to discount",
    help: "Conditions passed, but no item qualified (filters, sale prices excluded, or already fully discounted).",
  },
  EXCLUSIVE_GROUP: {
    label: "Exclusivity group taken",
    help: "Another promotion in the same exclusivity group already applied.",
  },
  STOPPED_BY_HIGHER_PRIORITY: {
    label: "Stopped by a higher priority",
    help: "An earlier promotion is set to stop further promotions.",
  },
  INVALID_RULES: { label: "Invalid rules", help: "Its stored conditions or actions don't parse. Edit and save it." },
  NOT_FOUND: { label: "Code not found", help: "No code promotion has this code." },
};

export const reasonInfo = (reason: string | undefined) =>
  REJECT_REASONS[(reason ?? "") as keyof typeof REJECT_REASONS] ?? {
    label: reason ?? "Rejected",
    help: "",
  };

// Per sample line: what it costs, what came off and which promotions took it off.
export function lineBreakdown(result: Simulation, lines: SimLine[], currency: string) {
  const names = new Map(result.applied.map((a) => [a.promotionId, a.name]));
  return lines.map((l, i) => {
    const r = result.lines.find((x) => x.key === `line-${i}`);
    const qty = parseInteger(l.quantity) ?? 1;
    const totalMinor = (inputToMinor(l.unitPrice, currency) ?? 0) * qty;
    const discountMinor = r?.discountMinor ?? 0;
    return {
      label: l.label || l.variantId,
      quantity: qty,
      totalMinor,
      discountMinor,
      afterMinor: totalMinor - discountMinor,
      allocations: (r?.allocations ?? []).map((a) => ({ ...a, name: names.get(a.promotionId) ?? a.promotionId })),
    };
  });
}
