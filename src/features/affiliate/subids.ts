// The overview's reporting period and its sub-ID table: both live in the URL (?period=, ?sort=,
// ?dir=), so the table sorts with plain links and works before JavaScript loads.

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

export const SUB_ID_SORTS = ["subId", "clicks", "conversions", "rate"] as const;
export type SubIdSortKey = (typeof SUB_ID_SORTS)[number];
export type SortDir = "asc" | "desc";
export type SubIdSort = { key: SubIdSortKey; dir: SortDir };
export const DEFAULT_SORT: SubIdSort = { key: "clicks", dir: "desc" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export function periodOf(params: Params): Period {
  const n = Number(one(params.period));
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : DEFAULT_PERIOD;
}

export function sortOf(params: Params): SubIdSort {
  const key = one(params.sort);
  const dir = one(params.dir);
  if (!key || !(SUB_ID_SORTS as readonly string[]).includes(key)) return DEFAULT_SORT;
  return {
    key: key as SubIdSortKey,
    dir: dir === "asc" ? "asc" : dir === "desc" ? "desc" : defaultDir(key as SubIdSortKey),
  };
}

// text sorts A→Z first, numbers largest first
export const defaultDir = (key: SubIdSortKey): SortDir => (key === "subId" ? "asc" : "desc");

// The stats range for a period ending now (the API's `from`; `to` defaults to now).
export function periodFrom(period: Period, now: Date): string {
  return new Date(now.getTime() - period * 86400_000).toISOString();
}

// Query string for a dashboard link that keeps the other settings.
export function overviewQuery(period: Period, sort: SubIdSort): string {
  const q = new URLSearchParams();
  if (period !== DEFAULT_PERIOD) q.set("period", String(period));
  if (sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir) {
    q.set("sort", sort.key);
    q.set("dir", sort.dir);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

// Clicking a header sorts by it; clicking the current one flips the direction.
export function nextSort(current: SubIdSort, key: SubIdSortKey): SubIdSort {
  if (current.key !== key) return { key, dir: defaultDir(key) };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

export type SubIdRow = { subId: string | null; clicks: number; conversions: number };
export type SubIdView = SubIdRow & {
  // orders per click; null without clicks (orders can arrive without a counted click)
  rate: number | null;
  // share of all clicks in the period, 0..1, for the bar
  share: number;
};

export function subIdRows(rows: SubIdRow[], sort: SubIdSort): SubIdView[] {
  const total = rows.reduce((n, r) => n + r.clicks, 0);
  const view = rows.map((r) => ({
    ...r,
    rate: r.clicks ? r.conversions / r.clicks : null,
    share: total ? r.clicks / total : 0,
  }));
  const sign = sort.dir === "asc" ? 1 : -1;
  const value = (r: SubIdView) => {
    switch (sort.key) {
      case "subId":
        return r.subId ?? "";
      case "clicks":
        return r.clicks;
      case "conversions":
        return r.conversions;
      case "rate":
        return r.rate ?? -1;
    }
  };
  return view.sort((a, b) => {
    const x = value(a);
    const y = value(b);
    const c = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : (x as number) - (y as number);
    // ties: busiest first, then by name, so the order is stable between requests
    return sign * c || b.clicks - a.clicks || (a.subId ?? "").localeCompare(b.subId ?? "");
  });
}
