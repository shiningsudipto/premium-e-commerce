import type {
  GetV1AdminReportsProductActivityApiArg,
  GetV1AdminReportsProductActivityApiResponse,
} from "../../store/api.generated";

// Product activity report (admin → Sales → Product activity): filters kept in the URL so a view
// can be bookmarked or shared, the meaning of each hint, and the CSV export.

export type ActivityReport = GetV1AdminReportsProductActivityApiResponse;
export type ActivityItem = ActivityReport["items"][number];
export type Signal = ActivityItem["signals"][number];
export type ActivitySort = NonNullable<GetV1AdminReportsProductActivityApiArg["sort"]>;

export const SORTS: { value: ActivitySort; label: string }[] = [
  { value: "views", label: "Most viewed" },
  { value: "viewers", label: "Most unique viewers" },
  { value: "adds", label: "Most added to bag" },
  { value: "addRate", label: "Highest add rate" },
  { value: "unitsSold", label: "Most sold" },
];

export const LIMITS = [25, 50, 100, 200] as const;

// What each hint means and what to do about it, shown as badges and in the legend.
export const SIGNAL_INFO: Record<
  Signal,
  { label: string; tone: "good" | "warn" | "info"; meaning: string; action: string }
> = {
  popular: {
    label: "Popular",
    tone: "good",
    meaning: "Among the most-added products in this period (added by 3 or more different visitors).",
    action: "Keep it in stock, feature it on the home page or in a collection, and use it in ads.",
  },
  popular_low_stock: {
    label: "Popular, low stock",
    tone: "warn",
    meaning: "Popular, and its sellable stock is at or below the low-stock threshold.",
    action: "Reorder now so it doesn't sell out while demand is high.",
  },
  viewed_not_added: {
    label: "Many views, few adds",
    tone: "warn",
    meaning: "Seen by 20 or more visitors, but fewer than 5% added it to the bag.",
    action:
      "Check the price, photos, size or fit details, description and delivery charge; compare with similar products that sell.",
  },
  added_not_bought: {
    label: "Added, not bought",
    tone: "info",
    meaning: "Added to the bag by 5 or more visitors, but not ordered in this period.",
    action:
      "Check what happens at checkout (delivery cost, stock, payment options); consider abandoned-cart reminders or a small offer.",
  },
};
export const SIGNAL_ORDER: Signal[] = ["popular_low_stock", "viewed_not_added", "added_not_bought", "popular"];

export type ActivityFilters = {
  q: string;
  categoryId: string | null;
  collectionId: string | null;
  signal: Signal | null;
  minViews: number;
  sort: ActivitySort;
  limit: number;
};

const isSignal = (v: string | null): v is Signal => !!v && v in SIGNAL_INFO;

export function parseActivityParams(params: { get(name: string): string | null }): ActivityFilters {
  const sort = params.get("sort");
  const limit = Number(params.get("limit"));
  const minViews = Number(params.get("minViews"));
  const signal = params.get("hint");
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    categoryId: params.get("category") || null,
    collectionId: params.get("collection") || null,
    signal: isSignal(signal) ? signal : null,
    minViews: Number.isInteger(minViews) && minViews > 0 ? Math.min(minViews, 100000) : 0,
    sort: SORTS.some((s) => s.value === sort) ? (sort as ActivitySort) : "views",
    limit: (LIMITS as readonly number[]).includes(limit) ? limit : 50,
  };
}

// The URL parameters for a filter change (null removes a parameter, keeping URLs short).
export function activityParamChanges(f: Partial<ActivityFilters>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if ("q" in f) out.q = f.q?.trim() || null;
  if ("categoryId" in f) out.category = f.categoryId ?? null;
  if ("collectionId" in f) out.collection = f.collectionId ?? null;
  if ("signal" in f) out.hint = f.signal ?? null;
  if ("minViews" in f) out.minViews = f.minViews ? String(f.minViews) : null;
  if ("sort" in f) out.sort = f.sort && f.sort !== "views" ? f.sort : null;
  if ("limit" in f) out.limit = f.limit && f.limit !== 50 ? String(f.limit) : null;
  return out;
}

export const percent = (rate: number | null) => (rate === null ? "–" : `${(Math.round(rate * 1000) / 10).toFixed(1)}%`);

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function activityCsv(items: ActivityItem[]): string {
  const head = [
    "Product",
    "Handle",
    "Views",
    "Unique viewers",
    "Adds to bag",
    "Unique adders",
    "Units added",
    "Add rate %",
    "Units sold",
    "Signed-in shoppers",
    "In stock",
    "Hints",
  ];
  const rows = items.map((i) => [
    i.title,
    i.handle,
    i.views,
    i.viewers,
    i.adds,
    i.adders,
    i.addedUnits,
    i.addRate === null ? null : Math.round(i.addRate * 1000) / 10,
    i.unitsSold,
    i.customers,
    i.available,
    i.signals.map((s) => SIGNAL_INFO[s].label).join("; "),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
