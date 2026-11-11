import type { PostV1AdminPromotionsApiArg } from "../../store/api.generated";
import { formatMoney } from "../../lib/money";

// The promotion engine's rule language (spec §8.3), as the API accepts it: a condition tree of
// nested all/any groups over leaf conditions, and a list of actions. Everything here is pure so
// the builder's tree editing, validation and payloads are unit-tested.

type Body = PostV1AdminPromotionsApiArg["body"];
export type Condition = Extract<NonNullable<Body["conditions"]>, { type: string }>;
export type ConditionType = Condition["type"];
export type GroupCondition = Extract<Condition, { type: "all" | "any" }>;
export type LeafCondition = Exclude<Condition, GroupCondition>;
export type ItemFilter = NonNullable<Extract<Condition, { type: "contains" }>["filter"]>;
export type Action = Body["actions"][number];
export type ActionType = Action["type"];
export type ActionTarget = Extract<Action, { type: "percent_off" }>["target"];
export type Tier = Extract<Action, { type: "tiered" }>["tiers"][number];

// Path of a node from the root group: child indexes, [] being the root itself.
export type NodePath = number[];
export const pathKey = (path: NodePath) => path.join(".");

export const isGroup = (c: Condition): c is GroupCondition => c.type === "all" || c.type === "any";

export const MAX_GROUP_CONDITIONS = 50;
export const MAX_ACTIONS = 10;

// ── Metadata ─────────────────────────────────────────────────────────────────

export const CONDITION_TYPES: { value: LeafCondition["type"]; label: string; description: string }[] = [
  { value: "subtotal", label: "Cart subtotal", description: "The value of the items in the cart" },
  { value: "item_count", label: "Number of items", description: "Total quantity in the cart" },
  { value: "weight", label: "Cart weight", description: "Total weight in grams" },
  { value: "contains", label: "Cart contains", description: "Matching products, collections, tags…" },
  { value: "customer", label: "Customer", description: "Signed in, group, segment, first order" },
  { value: "currency", label: "Currency", description: "The cart's currency" },
  { value: "country", label: "Shipping country", description: "Where the order ships to" },
  { value: "channel", label: "Sales channel", description: "Where the order is placed" },
  { value: "shipping_method", label: "Shipping method", description: "The chosen shipping rate" },
  { value: "affiliate", label: "Affiliate referral", description: "Orders referred by an affiliate" },
];

export const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { value: "percent_off", label: "Percentage off", description: "A percentage off the order or matching items" },
  { value: "fixed_off", label: "Amount off", description: "A fixed amount off the order or matching items" },
  { value: "bogo", label: "Buy X get Y", description: "Buy some items, get others discounted or free" },
  { value: "tiered", label: "Tiered discount", description: "Bigger discounts at higher spend or quantity" },
  { value: "free_shipping", label: "Free shipping", description: "Takes the shipping charge off" },
];

export const TARGETS: { value: ActionTarget; label: string }[] = [
  { value: "order", label: "Whole order (matching items)" },
  { value: "items", label: "Each matching item" },
  { value: "cheapest", label: "Cheapest matching unit" },
  { value: "most_expensive", label: "Most expensive matching unit" },
];

export const FILTER_KEYS: { key: keyof ItemFilter; label: string; singular: string }[] = [
  { key: "productIds", label: "Products", singular: "product" },
  { key: "variantIds", label: "Variants", singular: "variant" },
  { key: "collectionIds", label: "Collections", singular: "collection" },
  { key: "categoryIds", label: "Categories", singular: "category" },
  { key: "tags", label: "Tags", singular: "tag" },
  { key: "vendors", label: "Vendors", singular: "vendor" },
];

export const conditionLabel = (type: ConditionType) =>
  type === "all"
    ? "All of these"
    : type === "any"
      ? "Any of these"
      : (CONDITION_TYPES.find((t) => t.value === type)?.label ?? type);

export const actionLabel = (type: ActionType) => ACTION_TYPES.find((t) => t.value === type)?.label ?? type;

// ── Blank values ─────────────────────────────────────────────────────────────

export const emptyGroup = (type: "all" | "any" = "all"): GroupCondition => ({ type, conditions: [] });

export function blankCondition(type: ConditionType): Condition {
  switch (type) {
    case "all":
    case "any":
      return emptyGroup(type);
    case "subtotal":
    case "item_count":
    case "weight":
      return { type };
    case "contains":
      return { type, filter: {}, minQuantity: 1 };
    case "customer":
      return { type, loggedIn: true };
    case "currency":
    case "country":
    case "channel":
      return { type, in: [] };
    case "shipping_method":
      return { type, rateIds: [] };
    case "affiliate":
      return { type, attributed: true };
  }
}

export function blankAction(type: ActionType): Action {
  switch (type) {
    case "percent_off":
      return { type, percent: 10, target: "order", filter: {} };
    case "fixed_off":
      return { type, amountMinor: Number.NaN, target: "order", filter: {}, perItem: false };
    case "bogo":
      return { type, buy: { quantity: 1, filter: {} }, get: { quantity: 1, filter: {}, percent: 100 } };
    case "tiered":
      return { type, basis: "subtotal", filter: {}, tiers: [{ threshold: Number.NaN, percent: 10 }] };
    case "free_shipping":
      return { type };
  }
}

// ── Reading what the API stored ──────────────────────────────────────────────

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// Drops undefined keys so a value compares and serializes cleanly.
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function readFilter(raw: unknown): ItemFilter {
  if (!isObject(raw)) return {};
  return compact(
    Object.fromEntries(
      FILTER_KEYS.map(({ key }) => {
        const list = strings(raw[key]);
        return [key, list.length ? list : undefined];
      }),
    ) as ItemFilter,
  );
}

// One stored condition, or null when it isn't one the engine knows.
export function readCondition(raw: unknown): Condition | null {
  if (!isObject(raw) || typeof raw.type !== "string") return null;
  const type = raw.type as ConditionType;
  switch (type) {
    case "all":
    case "any":
      return {
        type,
        conditions: (Array.isArray(raw.conditions) ? raw.conditions : [])
          .map(readCondition)
          .filter((c): c is Condition => c !== null),
      };
    case "subtotal":
    case "item_count":
    case "weight":
      return compact({ type, min: num(raw.min), max: num(raw.max) });
    case "contains":
      return compact({
        type,
        filter: readFilter(raw.filter),
        minQuantity: num(raw.minQuantity),
        minAmountMinor: num(raw.minAmountMinor),
      });
    case "customer": {
      const groupIds = strings(raw.groupIds);
      const segmentIds = strings(raw.segmentIds);
      return compact({
        type,
        loggedIn: bool(raw.loggedIn),
        groupIds: groupIds.length ? groupIds : undefined,
        segmentIds: segmentIds.length ? segmentIds : undefined,
        firstOrder: bool(raw.firstOrder),
      });
    }
    case "currency":
    case "country":
    case "channel":
      return { type, in: strings(raw.in) };
    case "shipping_method":
      return { type, rateIds: strings(raw.rateIds) };
    case "affiliate": {
      const tierIds = strings(raw.tierIds);
      return compact({ type, attributed: bool(raw.attributed) ?? true, tierIds: tierIds.length ? tierIds : undefined });
    }
    default:
      return null;
  }
}

// The stored root ({} for "no conditions", a group, or a single leaf) as the builder's root group.
export function readConditions(raw: unknown): GroupCondition {
  const c = readCondition(raw);
  if (!c) return emptyGroup();
  return c.type === "all" || c.type === "any" ? c : { type: "all", conditions: [c] };
}

export function readAction(raw: unknown): Action | null {
  if (!isObject(raw) || typeof raw.type !== "string") return null;
  const type = raw.type as ActionType;
  const target = (TARGETS.some((t) => t.value === raw.target) ? raw.target : "order") as ActionTarget;
  switch (type) {
    case "percent_off":
      return { type, percent: num(raw.percent) ?? Number.NaN, target, filter: readFilter(raw.filter) };
    case "fixed_off":
      return {
        type,
        amountMinor: num(raw.amountMinor) ?? Number.NaN,
        target,
        filter: readFilter(raw.filter),
        perItem: bool(raw.perItem) ?? false,
      };
    case "bogo": {
      const buy = isObject(raw.buy) ? raw.buy : {};
      const get = isObject(raw.get) ? raw.get : {};
      return compact({
        type,
        buy: { quantity: num(buy.quantity) ?? 1, filter: readFilter(buy.filter) },
        get: { quantity: num(get.quantity) ?? 1, filter: readFilter(get.filter), percent: num(get.percent) ?? 100 },
        maxApplications: num(raw.maxApplications),
      });
    }
    case "tiered":
      return {
        type,
        basis: raw.basis === "quantity" ? "quantity" : "subtotal",
        filter: readFilter(raw.filter),
        tiers: (Array.isArray(raw.tiers) ? raw.tiers : []).filter(isObject).map((t) =>
          compact({
            threshold: num(t.threshold) ?? Number.NaN,
            percent: num(t.percent),
            amountMinor: num(t.amountMinor),
          }),
        ),
      };
    case "free_shipping": {
      const rateIds = strings(raw.rateIds);
      return compact({
        type,
        rateIds: rateIds.length ? rateIds : undefined,
        maxShippingMinor: num(raw.maxShippingMinor),
      });
    }
    default:
      return null;
  }
}

export function readActions(raw: unknown): Action[] {
  return (Array.isArray(raw) ? raw : []).map(readAction).filter((a): a is Action => a !== null);
}

// ── Tree editing ─────────────────────────────────────────────────────────────

export function nodeAt(root: GroupCondition, path: NodePath): Condition | undefined {
  let node: Condition | undefined = root;
  for (const i of path) {
    if (!node || (node.type !== "all" && node.type !== "any")) return undefined;
    node = node.conditions[i];
  }
  return node;
}

// Replaces the node at `path` with fn(node); [] replaces the root (which must stay a group).
export function updateNode(root: GroupCondition, path: NodePath, fn: (node: Condition) => Condition): GroupCondition {
  if (path.length === 0) {
    const next = fn(root);
    return next.type === "all" || next.type === "any" ? next : root;
  }
  const [head, ...rest] = path;
  return {
    ...root,
    conditions: root.conditions.map((child, i) => {
      if (i !== head) return child;
      if (rest.length === 0) return fn(child);
      return child.type === "all" || child.type === "any" ? updateNode(child, rest, fn) : child;
    }),
  };
}

function updateGroup(root: GroupCondition, path: NodePath, fn: (group: GroupCondition) => GroupCondition) {
  return updateNode(root, path, (node) => (node.type === "all" || node.type === "any" ? fn(node) : node));
}

export function addChild(root: GroupCondition, groupPath: NodePath, child: Condition): GroupCondition {
  return updateGroup(root, groupPath, (g) =>
    g.conditions.length >= MAX_GROUP_CONDITIONS ? g : { ...g, conditions: [...g.conditions, child] },
  );
}

export function removeNode(root: GroupCondition, path: NodePath): GroupCondition {
  if (path.length === 0) return emptyGroup(root.type);
  const parent = path.slice(0, -1);
  const index = path[path.length - 1]!;
  return updateGroup(root, parent, (g) => ({ ...g, conditions: g.conditions.filter((_, i) => i !== index) }));
}

export function moveNode(root: GroupCondition, path: NodePath, delta: -1 | 1): GroupCondition {
  if (path.length === 0) return root;
  const parent = path.slice(0, -1);
  const from = path[path.length - 1]!;
  const to = from + delta;
  return updateGroup(root, parent, (g) => {
    if (to < 0 || to >= g.conditions.length) return g;
    const conditions = [...g.conditions];
    const [item] = conditions.splice(from, 1);
    conditions.splice(to, 0, item!);
    return { ...g, conditions };
  });
}

// Wraps a leaf in a new group (to combine it with others the opposite way).
export function wrapInGroup(root: GroupCondition, path: NodePath, type: "all" | "any"): GroupCondition {
  if (path.length === 0) return root;
  return updateNode(root, path, (node) => ({ type, conditions: [node] }));
}

export function countLeaves(node: Condition): number {
  return node.type === "all" || node.type === "any" ? node.conditions.reduce((s, c) => s + countLeaves(c), 0) : 1;
}

// ── Validation (mirrors the API's schemas, plus checks that catch rules which can never match) ──

const bad = (n: number | undefined) => n !== undefined && !Number.isFinite(n);
const isWhole = (n: number) => Number.isInteger(n);

function rangeError(c: { type: string; min?: number; max?: number }): string | null {
  if (bad(c.min) || bad(c.max)) return "Enter valid numbers";
  if (c.min === undefined && c.max === undefined) return "Set a minimum, a maximum or both";
  if ((c.min ?? 0) < 0 || (c.max ?? 0) < 0) return "Values can't be negative";
  if (c.type === "item_count" && ((c.min !== undefined && !isWhole(c.min)) || (c.max !== undefined && !isWhole(c.max))))
    return "Use whole numbers";
  if (c.min !== undefined && c.max !== undefined && c.min > c.max) return "The minimum can't be above the maximum";
  return null;
}

export function conditionError(c: Condition): string | null {
  switch (c.type) {
    case "all":
    case "any":
      return c.conditions.length > MAX_GROUP_CONDITIONS
        ? `At most ${MAX_GROUP_CONDITIONS} conditions in a group`
        : null;
    case "subtotal":
    case "item_count":
    case "weight":
      return rangeError(c);
    case "contains":
      if (
        c.minQuantity !== undefined &&
        (!Number.isFinite(c.minQuantity) || c.minQuantity < 1 || !isWhole(c.minQuantity))
      )
        return "The minimum quantity must be a whole number of at least 1";
      if (bad(c.minAmountMinor) || (c.minAmountMinor ?? 0) < 0) return "Enter a valid minimum amount";
      return null;
    case "customer":
      if (c.loggedIn === undefined && !c.groupIds?.length && !c.segmentIds?.length && c.firstOrder === undefined)
        return "Choose at least one customer rule";
      if (c.loggedIn === false && (c.groupIds?.length || c.segmentIds?.length))
        return "Guests have no group or segment, so this can never match";
      return null;
    case "currency":
      if (!c.in.length) return "Add at least one currency";
      return c.in.every((x) => /^[A-Z]{3}$/.test(x)) ? null : "Use 3-letter currency codes (BDT, USD)";
    case "country":
      if (!c.in.length) return "Add at least one country";
      return c.in.every((x) => /^[A-Z]{2}$/.test(x)) ? null : "Use 2-letter country codes (BD, US)";
    case "channel":
      return c.in.length ? null : "Add at least one channel";
    case "shipping_method":
      return c.rateIds.length ? null : "Add at least one shipping rate";
    case "affiliate":
      return !c.attributed && c.tierIds?.length ? "Tiers only apply to referred orders" : null;
  }
}

// Problems by node path ("" for the root group).
export function validateConditions(root: GroupCondition): Record<string, string> {
  const errors: Record<string, string> = {};
  const walk = (node: Condition, path: NodePath) => {
    const error = conditionError(node);
    if (error) errors[pathKey(path)] = error;
    if (node.type === "all" || node.type === "any") node.conditions.forEach((c, i) => walk(c, [...path, i]));
  };
  walk(root, []);
  return errors;
}

const percentError = (p: number) =>
  Number.isFinite(p) && p > 0 && p <= 100 ? null : "Use a percentage above 0, up to 100";
const amountError = (n: number | undefined, label = "amount") =>
  n !== undefined && Number.isFinite(n) && n > 0 && isWhole(n) ? null : `Enter an ${label} above zero`;
const quantityError = (n: number, label: string) =>
  Number.isFinite(n) && n >= 1 && isWhole(n) ? null : `${label} must be a whole number of at least 1`;

// Problems by action index, "<i>.tiers.<j>" for a tier, and "_form" for the list.
export function validateActions(actions: Action[]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (actions.length === 0) errors._form = "Add at least one action";
  if (actions.length > MAX_ACTIONS) errors._form = `At most ${MAX_ACTIONS} actions`;
  actions.forEach((a, i) => {
    let error: string | null = null;
    switch (a.type) {
      case "percent_off":
        error = percentError(a.percent);
        break;
      case "fixed_off":
        error = amountError(a.amountMinor);
        break;
      case "bogo":
        error =
          quantityError(a.buy.quantity, "Buy quantity") ??
          quantityError(a.get.quantity, "Get quantity") ??
          percentError(a.get.percent ?? 100) ??
          (a.maxApplications !== undefined ? quantityError(a.maxApplications, "Times it can apply") : null);
        break;
      case "tiered": {
        if (a.tiers.length === 0) error = "Add at least one tier";
        const seen = new Set<number>();
        a.tiers.forEach((t, j) => {
          let tierError: string | null = null;
          if (!Number.isFinite(t.threshold) || t.threshold < 0) tierError = "Enter a threshold of zero or more";
          else if (seen.has(t.threshold)) tierError = "Two tiers have the same threshold";
          else if ((t.percent === undefined) === (t.amountMinor === undefined))
            tierError = "Give either a percentage or an amount";
          else if (t.percent !== undefined) tierError = percentError(t.percent);
          else tierError = amountError(t.amountMinor);
          if (Number.isFinite(t.threshold)) seen.add(t.threshold);
          if (tierError) errors[`${i}.tiers.${j}`] = tierError;
        });
        break;
      }
      case "free_shipping":
        if (a.maxShippingMinor !== undefined) error = amountError(a.maxShippingMinor, "upper limit");
        break;
    }
    if (error) errors[String(i)] = error;
  });
  return errors;
}

// ── Payloads ─────────────────────────────────────────────────────────────────

export function cleanFilter(filter: ItemFilter | undefined): ItemFilter {
  return readFilter(filter ?? {});
}

export const filterIsEmpty = (filter: ItemFilter | undefined) => Object.keys(cleanFilter(filter)).length === 0;

function cleanCondition(c: Condition): Condition | null {
  if (c.type === "all" || c.type === "any") {
    const conditions = c.conditions.map(cleanCondition).filter((x): x is Condition => x !== null);
    // an empty nested group always passes; leave it out
    return conditions.length ? { type: c.type, conditions } : null;
  }
  if (c.type === "contains") return compact({ ...c, filter: cleanFilter(c.filter) });
  if (c.type === "customer")
    return compact({
      ...c,
      groupIds: c.groupIds?.length ? c.groupIds : undefined,
      segmentIds: c.segmentIds?.length ? c.segmentIds : undefined,
    });
  if (c.type === "affiliate") return compact({ ...c, tierIds: c.tierIds?.length ? c.tierIds : undefined });
  return compact({ ...c });
}

// What the API stores: {} when there are no conditions, otherwise the cleaned root group.
export function toConditionsInput(root: GroupCondition): Body["conditions"] {
  return cleanCondition(root) ?? {};
}

export function toActionsInput(actions: Action[]): Body["actions"] {
  return actions.map((a): Action => {
    switch (a.type) {
      case "percent_off":
        return { type: a.type, percent: a.percent, target: a.target, filter: cleanFilter(a.filter) };
      case "fixed_off":
        return {
          type: a.type,
          amountMinor: a.amountMinor,
          target: a.target,
          filter: cleanFilter(a.filter),
          perItem: a.target === "items" ? !!a.perItem : false,
        };
      case "bogo":
        return compact({
          type: a.type,
          buy: { quantity: a.buy.quantity, filter: cleanFilter(a.buy.filter) },
          get: { quantity: a.get.quantity, filter: cleanFilter(a.get.filter), percent: a.get.percent ?? 100 },
          maxApplications: a.maxApplications,
        });
      case "tiered":
        return {
          type: a.type,
          basis: a.basis,
          filter: cleanFilter(a.filter),
          tiers: [...a.tiers]
            .sort((x, y) => x.threshold - y.threshold)
            .map((t) =>
              t.percent !== undefined
                ? { threshold: t.threshold, percent: t.percent }
                : { threshold: t.threshold, amountMinor: t.amountMinor },
            ),
        };
      case "free_shipping":
        return compact({
          type: a.type,
          rateIds: a.rateIds?.length ? a.rateIds : undefined,
          maxShippingMinor: a.maxShippingMinor,
        });
    }
  });
}

// ── Plain-English summaries ──────────────────────────────────────────────────

// id → display name for collections, groups, rates and so on; unknown ids show as they are.
export type Names = Record<string, string>;

const list = (values: string[], names: Names = {}) => {
  const shown = values.slice(0, 3).map((v) => names[v] ?? v);
  return values.length > 3 ? `${shown.join(", ")} +${values.length - 3} more` : shown.join(", ");
};

export function summarizeFilter(filter: ItemFilter | undefined, names: Names = {}): string {
  const f = cleanFilter(filter);
  const parts = FILTER_KEYS.flatMap(({ key, label }) =>
    f[key]?.length ? [`${label.toLowerCase()}: ${list(f[key]!, names)}`] : [],
  );
  return parts.length ? parts.join("; ") : "any product";
}

const grams = (g: number) => (g >= 1000 ? `${g / 1000} kg` : `${g} g`);

function rangeText(c: { min?: number; max?: number }, fmt: (n: number) => string) {
  if (c.min !== undefined && c.max !== undefined) return `between ${fmt(c.min)} and ${fmt(c.max)}`;
  if (c.min !== undefined) return `at least ${fmt(c.min)}`;
  if (c.max !== undefined) return `at most ${fmt(c.max)}`;
  return "(not set)";
}

export function summarizeCondition(c: Condition, currency: string, names: Names = {}): string {
  const money = (n: number) => formatMoney(n, currency);
  switch (c.type) {
    case "all":
    case "any": {
      if (c.conditions.length === 0) return "No conditions";
      const parts = c.conditions.map((x) => {
        const text = summarizeCondition(x, currency, names);
        return x.type === "all" || x.type === "any" ? `(${text})` : text;
      });
      return parts.join(c.type === "all" ? " and " : " or ");
    }
    case "subtotal":
      return `subtotal ${rangeText(c, money)}`;
    case "item_count":
      return `${rangeText(c, String)} items`;
    case "weight":
      return `weight ${rangeText(c, grams)}`;
    case "contains": {
      const qty = c.minQuantity ?? 1;
      const amount = c.minAmountMinor !== undefined ? ` worth at least ${money(c.minAmountMinor)}` : "";
      return `contains ${qty} or more of ${summarizeFilter(c.filter, names)}${amount}`;
    }
    case "customer": {
      const parts: string[] = [];
      if (c.loggedIn !== undefined) parts.push(c.loggedIn ? "signed in" : "a guest");
      if (c.firstOrder !== undefined) parts.push(c.firstOrder ? "on their first order" : "a returning customer");
      if (c.groupIds?.length) parts.push(`in group ${list(c.groupIds, names)}`);
      if (c.segmentIds?.length) parts.push(`in segment ${list(c.segmentIds, names)}`);
      return parts.length ? `customer is ${parts.join(", ")}` : "any customer";
    }
    case "currency":
      return `currency is ${list(c.in)}`;
    case "country":
      return `ships to ${list(c.in)}`;
    case "channel":
      return `sold on ${list(c.in, names)}`;
    case "shipping_method":
      return `shipping by ${list(c.rateIds, names)}`;
    case "affiliate":
      return c.attributed
        ? `referred by an affiliate${c.tierIds?.length ? ` in tier ${list(c.tierIds, names)}` : ""}`
        : "not referred by an affiliate";
  }
}

export function summarizeConditions(root: GroupCondition, currency: string, names: Names = {}): string {
  const cleaned = cleanCondition(root);
  return cleaned ? summarizeCondition(cleaned, currency, names) : "Every cart qualifies";
}

const pct = (n: number) => `${Number.isFinite(n) ? n : "?"}%`;

export function summarizeAction(a: Action, currency: string, names: Names = {}): string {
  const money = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? formatMoney(n, currency) : "?");
  const on = (target: ActionTarget, filter: ItemFilter | undefined) => {
    const what = summarizeFilter(filter, names);
    switch (target) {
      case "order":
        return what === "any product" ? "the order" : `items matching ${what}`;
      case "items":
        return what === "any product" ? "each item" : `each item matching ${what}`;
      case "cheapest":
        return `the cheapest unit${what === "any product" ? "" : ` of ${what}`}`;
      case "most_expensive":
        return `the most expensive unit${what === "any product" ? "" : ` of ${what}`}`;
    }
  };
  switch (a.type) {
    case "percent_off":
      return `${pct(a.percent)} off ${on(a.target, a.filter)}`;
    case "fixed_off":
      return `${money(a.amountMinor)} off ${on(a.target, a.filter)}${a.target === "items" && a.perItem ? " (per unit)" : ""}`;
    case "bogo": {
      const get = (a.get.percent ?? 100) >= 100 ? "free" : `${pct(a.get.percent ?? 100)} off`;
      const times = a.maxApplications ? `, up to ${a.maxApplications}×` : "";
      return `Buy ${a.buy.quantity} of ${summarizeFilter(a.buy.filter, names)}, get ${a.get.quantity} of ${summarizeFilter(a.get.filter, names)} ${get}${times}`;
    }
    case "tiered": {
      const tiers = [...a.tiers]
        .sort((x, y) => x.threshold - y.threshold)
        .map((t) => {
          const at = a.basis === "subtotal" ? money(t.threshold) : `${t.threshold} items`;
          return `${at}: ${t.percent !== undefined ? pct(t.percent) : money(t.amountMinor)} off`;
        });
      const what = summarizeFilter(a.filter, names);
      return `Tiered by ${a.basis}${what === "any product" ? "" : ` of ${what}`} — ${tiers.join(", ") || "no tiers"}`;
    }
    case "free_shipping": {
      const rates = a.rateIds?.length ? ` on ${list(a.rateIds, names)}` : "";
      const cap = a.maxShippingMinor !== undefined ? ` (up to ${money(a.maxShippingMinor)})` : "";
      return `Free shipping${rates}${cap}`;
    }
  }
}
