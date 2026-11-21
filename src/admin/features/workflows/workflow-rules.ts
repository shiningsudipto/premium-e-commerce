import type {
  GetV1AdminWorkflowsApiResponse,
  GetV1AdminWorkflowsIdRunsApiResponse,
  PostV1AdminWorkflowsApiArg,
  PostV1AdminWorkflowsApiResponse,
} from "../../store/api.generated";

// Workflow rules (spec §10.4) as the API's engine runs them: one trigger event, an optional flat
// list of conditions joined by "all" or "any", and 1–10 actions. The engine has no nested
// condition groups, so neither does the editor.

export type Rule = PostV1AdminWorkflowsApiResponse;
// a listed rule also says when it last ran
export type RuleRow = GetV1AdminWorkflowsApiResponse[number];
export type RuleAction = Rule["actions"][number];
export type ActionType = RuleAction["type"];
type ConditionList = Extract<Rule["conditions"], { match: unknown }>;
export type RuleCondition = ConditionList["conditions"][number];
export type Op = RuleCondition["op"];
export type Match = ConditionList["match"];
export type Run = GetV1AdminWorkflowsIdRunsApiResponse["items"][number];
export type RuleBody = PostV1AdminWorkflowsApiArg["body"];

// Limits the API enforces (workflows.engine.ts).
export const MAX_CONDITIONS = 20;
export const MAX_ACTIONS = 10;
export const FIELD_PATTERN = /^[a-zA-Z]+(\.[a-zA-Z]+)*$/;

// ── Facts a condition can read ──────────────────────────────────────────────

export type ValueKind = "string" | "number" | "boolean" | "list";
export type Fact = { path: string; label: string; kind: ValueKind; hint?: string; options?: readonly string[] };

const ORDER_STATUSES = [
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
] as const;
const AFFILIATE_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "CLOSED"] as const;

// What the engine loads for an event (factsFor in workflows.service.ts): the event's own data under
// "event", plus the order, customer and affiliate it points at.
export const FACTS: readonly Fact[] = [
  { path: "order.totalMinor", label: "Order total", kind: "number", hint: "In minor units: 150000 is 1,500.00" },
  { path: "order.discountMinor", label: "Order discount", kind: "number", hint: "In minor units" },
  { path: "order.itemCount", label: "Order item count", kind: "number" },
  { path: "order.number", label: "Order number", kind: "number" },
  { path: "order.status", label: "Order status", kind: "string", options: ORDER_STATUSES },
  { path: "order.currency", label: "Order currency", kind: "string", hint: "ISO code, e.g. BDT" },
  { path: "order.shippingCountry", label: "Shipping country", kind: "string", hint: "Two-letter code, e.g. BD" },
  { path: "order.paymentProvider", label: "Payment provider", kind: "string" },
  { path: "order.email", label: "Order email", kind: "string" },
  { path: "order.tags", label: "Order tags", kind: "list" },
  { path: "order.affiliateId", label: "Order affiliate", kind: "string" },
  { path: "customer.orderCount", label: "Customer order count", kind: "number" },
  { path: "customer.email", label: "Customer email", kind: "string" },
  { path: "customer.tags", label: "Customer tags", kind: "list" },
  { path: "customer.groupId", label: "Customer group", kind: "string" },
  { path: "customer.acceptsMarketing", label: "Customer accepts marketing", kind: "boolean" },
  { path: "affiliate.status", label: "Affiliate status", kind: "string", options: AFFILIATE_STATUSES },
  { path: "affiliate.tierId", label: "Affiliate tier", kind: "string" },
  { path: "event.type", label: "Event type", kind: "string" },
];

export const factFor = (path: string) => FACTS.find((f) => f.path === path);

export const OP_LABELS: Record<Op, string> = {
  eq: "is",
  neq: "is not",
  gt: "is more than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  in: "is one of",
  not_in: "is none of",
  contains: "contains",
  exists: "is set",
};

const OPS_BY_KIND: Record<ValueKind, readonly Op[]> = {
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "exists"],
  string: ["eq", "neq", "in", "not_in", "contains", "exists"],
  boolean: ["eq", "neq", "exists"],
  list: ["contains", "exists"],
};

export const opsFor = (kind: ValueKind) => OPS_BY_KIND[kind];

// ── Editor state ────────────────────────────────────────────────────────────

// A condition as edited: the value stays text until the rule is saved, typed by its kind
// (the engine compares with ===, so 5 and "5" differ).
export type ConditionDraft = { field: string; kind: ValueKind; op: Op; value: string };
export type ActionDraft = { type: ActionType; values: Record<string, string> };
export type RuleForm = {
  name: string;
  trigger: string;
  isActive: boolean;
  match: Match;
  conditions: ConditionDraft[];
  actions: ActionDraft[];
};

export type ActionField = {
  key: string;
  label: string;
  input: "text" | "textarea" | "emails" | "url";
  max: number;
  hint?: string;
};
export type ActionSpec = {
  label: string;
  description: string;
  // the fact the action works on; the run fails for an event without it
  needs?: "order" | "customer" | "affiliate";
  fields: readonly ActionField[];
};

const reason = (what: string): ActionField => ({ key: "reason", label: "Reason", input: "text", max: 200, hint: what });
const PLACEHOLDER_HINT = "Use {{order.number}}-style placeholders for facts.";

export const ACTIONS: Record<ActionType, ActionSpec> = {
  tag_order: {
    label: "Tag the order",
    description: "Adds a tag to the order (once).",
    needs: "order",
    fields: [{ key: "tag", label: "Tag", input: "text", max: 50 }],
  },
  tag_customer: {
    label: "Tag the customer",
    description: "Adds a tag to the customer (once).",
    needs: "customer",
    fields: [{ key: "tag", label: "Tag", input: "text", max: 50 }],
  },
  hold_order: {
    label: "Put the order on hold",
    description: "Stops fulfilment until staff release it.",
    needs: "order",
    fields: [reason("Shown on the order")],
  },
  add_order_note: {
    label: "Add an order note",
    description: "Writes an internal note on the order timeline.",
    needs: "order",
    fields: [{ key: "note", label: "Note", input: "textarea", max: 1000, hint: PLACEHOLDER_HINT }],
  },
  notify: {
    label: "Send an email",
    description: "Emails up to 10 addresses.",
    fields: [
      { key: "to", label: "To", input: "emails", max: 10, hint: "Up to 10 addresses, separated by commas" },
      { key: "subject", label: "Subject", input: "text", max: 200, hint: PLACEHOLDER_HINT },
      { key: "message", label: "Message", input: "textarea", max: 5000, hint: PLACEHOLDER_HINT },
    ],
  },
  call_webhook: {
    label: "Call a webhook",
    description: "POSTs the facts as JSON to a public HTTPS URL; a non-2xx answer fails the action.",
    fields: [{ key: "url", label: "URL", input: "url", max: 2000 }],
  },
  suspend_affiliate: {
    label: "Suspend the affiliate",
    description: "Suspends an active affiliate.",
    needs: "affiliate",
    fields: [reason("Recorded on the affiliate")],
  },
  hold_affiliate_earnings: {
    label: "Hold affiliate earnings",
    description: "Pending earnings stop counting down to approval until staff review them.",
    needs: "affiliate",
    fields: [reason("For the record")],
  },
};

export const ACTION_TYPES = Object.keys(ACTIONS) as ActionType[];

export const blankCondition = (): ConditionDraft => ({
  field: "order.totalMinor",
  kind: "number",
  op: "gte",
  value: "",
});
export const blankAction = (type: ActionType = "tag_order"): ActionDraft => ({
  type,
  values: Object.fromEntries(ACTIONS[type].fields.map((f) => [f.key, ""])),
});
export const blankForm = (trigger = ""): RuleForm => ({
  name: "",
  trigger,
  isActive: true,
  match: "all",
  conditions: [],
  actions: [blankAction()],
});

// Changing the field resets the operator (and value) when they no longer fit its kind.
export function setConditionField(c: ConditionDraft, field: string): ConditionDraft {
  const known = factFor(field);
  const kind = known?.kind ?? c.kind;
  const op = opsFor(kind).includes(c.op) ? c.op : opsFor(kind)[0]!;
  return { field, kind, op, value: known && known.kind !== c.kind ? "" : c.value };
}

export function setConditionKind(c: ConditionDraft, kind: ValueKind): ConditionDraft {
  const op = opsFor(kind).includes(c.op) ? c.op : opsFor(kind)[0]!;
  return { ...c, kind, op, value: kind === c.kind ? c.value : "" };
}

export function setActionType(a: ActionDraft, type: ActionType): ActionDraft {
  const next = blankAction(type);
  // keep what was typed into fields both types share (e.g. "reason")
  for (const key of Object.keys(next.values)) if (a.values[key]) next.values[key] = a.values[key]!;
  return next;
}

export function moveItem<T>(list: readonly T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

// ── Values ──────────────────────────────────────────────────────────────────

const splitList = (raw: string) =>
  raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const isNumber = (s: string) => s.trim() !== "" && Number.isFinite(Number(s));

export function conditionValue(c: ConditionDraft): RuleCondition["value"] {
  if (c.op === "exists") return c.value !== "false";
  if (c.op === "in" || c.op === "not_in") {
    const items = splitList(c.value);
    return c.kind === "number" ? items.map(Number) : items;
  }
  if (c.kind === "number") return Number(c.value);
  if (c.kind === "boolean") return c.value === "true";
  return c.value.trim();
}

function valueText(value: RuleCondition["value"], op: Op): string {
  if (op === "exists") return value === false ? "false" : "true";
  if (Array.isArray(value)) return value.join(", ");
  return value === undefined ? "" : String(value);
}

function kindOf(field: string, value: RuleCondition["value"]): ValueKind {
  const known = factFor(field);
  if (known) return known.kind;
  const sample = Array.isArray(value) ? value[0] : value;
  return typeof sample === "number" ? "number" : typeof sample === "boolean" ? "boolean" : "string";
}

export function formFromRule(rule: Rule): RuleForm {
  const list = "match" in rule.conditions ? (rule.conditions as ConditionList) : null;
  return {
    name: rule.name,
    trigger: rule.trigger,
    isActive: rule.isActive,
    match: list?.match ?? "all",
    conditions: (list?.conditions ?? []).map((c) => ({
      field: c.field,
      kind: kindOf(c.field, c.value),
      op: c.op,
      value: valueText(c.value, c.op),
    })),
    actions: rule.actions.map((a) => {
      const { type, ...rest } = a;
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(rest)) values[k] = Array.isArray(v) ? v.join(", ") : String(v);
      return { type, values };
    }),
  };
}

export function conditionsPayload(form: Pick<RuleForm, "match" | "conditions">): Rule["conditions"] {
  if (form.conditions.length === 0) return {};
  return {
    match: form.match,
    conditions: form.conditions.map((c) => ({
      field: c.field.trim(),
      op: c.op,
      value: conditionValue(c),
    })),
  };
}

export function actionPayload(a: ActionDraft): RuleAction {
  const v = (key: string) => (a.values[key] ?? "").trim();
  switch (a.type) {
    case "tag_order":
    case "tag_customer":
      return { type: a.type, tag: v("tag") };
    case "hold_order":
    case "suspend_affiliate":
    case "hold_affiliate_earnings":
      return { type: a.type, reason: v("reason") };
    case "add_order_note":
      return { type: a.type, note: v("note") };
    case "notify":
      return { type: a.type, to: splitList(v("to")), subject: v("subject"), message: v("message") };
    case "call_webhook":
      return { type: a.type, url: v("url") };
  }
}

export function toBody(form: RuleForm): RuleBody {
  return {
    name: form.name.trim(),
    trigger: form.trigger,
    conditions: conditionsPayload(form),
    actions: form.actions.map(actionPayload),
    // always sent: the API turns a rule back on when isActive is left out
    isActive: form.isActive,
  };
}

// ── Validation (mirrors the API's schemas so mistakes show next to the field) ──

export type FormErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isHttpUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateCondition(c: ConditionDraft): string | null {
  if (!FIELD_PATTERN.test(c.field.trim())) return "Use a dot path of letters, e.g. order.totalMinor";
  if (c.op === "exists") return null;
  if (c.op === "in" || c.op === "not_in") {
    const items = splitList(c.value);
    if (!items.length) return "Enter at least one value, separated by commas";
    if (c.kind === "number" && !items.every(isNumber)) return "Every value must be a number";
    return null;
  }
  if (c.kind === "number" && !isNumber(c.value)) return "Enter a number";
  if (c.kind === "boolean" && c.value !== "true" && c.value !== "false") return "Choose yes or no";
  if ((c.kind === "string" || c.kind === "list") && !c.value.trim()) return "Enter a value";
  return null;
}

export function validateAction(a: ActionDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of ACTIONS[a.type].fields) {
    const raw = (a.values[f.key] ?? "").trim();
    if (f.input === "emails") {
      const list = splitList(raw);
      if (!list.length) errors[f.key] = "Enter at least one address";
      else if (list.length > f.max) errors[f.key] = `At most ${f.max} addresses`;
      else if (list.some((e) => !EMAIL.test(e))) errors[f.key] = "Check the addresses";
    } else if (!raw) errors[f.key] = `${f.label} is required`;
    else if (raw.length > f.max) errors[f.key] = `At most ${f.max} characters`;
    else if (f.input === "url" && !isHttpUrl(raw)) errors[f.key] = "Enter a full URL, e.g. https://example.com/hook";
  }
  return errors;
}

export function validateForm(form: RuleForm, triggers: readonly string[]): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  else if (form.name.trim().length > 200) errors.name = "At most 200 characters";
  if (!form.trigger) errors.trigger = "Choose a trigger";
  else if (triggers.length && !triggers.includes(form.trigger)) errors.trigger = "Not a trigger the API offers";
  if (form.conditions.length > MAX_CONDITIONS) errors.conditions = `At most ${MAX_CONDITIONS} conditions`;
  form.conditions.forEach((c, i) => {
    const message = validateCondition(c);
    if (message) errors[`conditions.${i}`] = message;
  });
  if (!form.actions.length) errors.actions = "Add at least one action";
  else if (form.actions.length > MAX_ACTIONS) errors.actions = `At most ${MAX_ACTIONS} actions`;
  form.actions.forEach((a, i) => {
    for (const [key, message] of Object.entries(validateAction(a))) errors[`actions.${i}.${key}`] = message;
  });
  return errors;
}

export const hasErrors = (errors: FormErrors) => Object.keys(errors).length > 0;

// ── Summaries ───────────────────────────────────────────────────────────────

export const triggerLabel = (trigger: string) => {
  const [entity, verb] = trigger.split(".");
  if (!verb) return trigger;
  const words = verb.replace(/_/g, " ");
  return `${entity![0]!.toUpperCase()}${entity!.slice(1)} ${words}`;
};

export function summarizeCondition(c: RuleCondition): string {
  const label = factFor(c.field)?.label ?? c.field;
  if (c.op === "exists") return `${label} ${c.value === false ? "is not set" : "is set"}`;
  const value = Array.isArray(c.value) ? c.value.join(", ") : String(c.value);
  return `${label} ${OP_LABELS[c.op]} ${value}`;
}

export function summarizeConditions(conditions: Rule["conditions"]): string {
  if (!("match" in conditions)) return "Every event";
  const list = conditions as ConditionList;
  return list.conditions.map(summarizeCondition).join(list.match === "any" ? " or " : " and ");
}

export function summarizeAction(a: RuleAction): string {
  switch (a.type) {
    case "tag_order":
      return `Tag order "${a.tag}"`;
    case "tag_customer":
      return `Tag customer "${a.tag}"`;
    case "hold_order":
      return "Hold the order";
    case "add_order_note":
      return "Add an order note";
    case "notify":
      return `Email ${a.to.join(", ")}`;
    case "call_webhook":
      return `Call ${a.url}`;
    case "suspend_affiliate":
      return "Suspend the affiliate";
    case "hold_affiliate_earnings":
      return "Hold affiliate earnings";
  }
}

// ── Dry run ─────────────────────────────────────────────────────────────────

export type TestDataInput = { orderId: string; customerId: string; affiliateId: string; extra: string };

// The sample event data for /workflows/test: ids the engine loads facts from, plus any other
// event fields as a JSON object. Returns an error message for unusable JSON.
export function buildTestData(input: TestDataInput): { data: Record<string, unknown> } | { error: string } {
  let extra: Record<string, unknown> = {};
  if (input.extra.trim()) {
    try {
      const parsed: unknown = JSON.parse(input.extra);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return { error: "Extra data must be a JSON object" };
      extra = parsed as Record<string, unknown>;
    } catch {
      return { error: "Extra data isn't valid JSON" };
    }
  }
  const data: Record<string, unknown> = { ...extra };
  if (input.orderId.trim()) data.orderId = input.orderId.trim();
  if (input.customerId.trim()) data.customerId = input.customerId.trim();
  if (input.affiliateId.trim()) data.affiliateId = input.affiliateId.trim();
  return { data };
}

export type PlannedAction = { action: RuleAction; label: string; outcome: "run" | "fail"; reason?: string };

// What a match would do: each action in order, and the ones that would fail because the event
// doesn't lead to the order, customer or affiliate they act on (the engine's "event has no …").
export function planActions(actions: readonly RuleAction[], facts: Record<string, unknown>): PlannedAction[] {
  return actions.map((action) => {
    const needs = ACTIONS[action.type].needs;
    const label = summarizeAction(action);
    if (needs && !facts[needs]) return { action, label, outcome: "fail", reason: `the event has no ${needs}` };
    return { action, label, outcome: "run" };
  });
}

// ── Runs ────────────────────────────────────────────────────────────────────

export type RunStatus = "skipped" | "succeeded" | "partial" | "failed";

export function runStatus(run: Pick<Run, "matched" | "result">): RunStatus {
  if (!run.matched) return "skipped";
  const failed = run.result.filter((r) => !r.ok).length;
  if (failed === 0) return "succeeded";
  return failed === run.result.length ? "failed" : "partial";
}

export const RUN_STATUS: Record<RunStatus, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  skipped: { label: "Didn't match", variant: "outline" },
  succeeded: { label: "Succeeded", variant: "secondary" },
  partial: { label: "Partly failed", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};
