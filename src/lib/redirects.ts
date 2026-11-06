// Merchant redirects (admin → Redirects), applied in proxy.ts before a page renders. Paths are
// stored without the market prefix ("/old-sale" → "/collections/sale"), so one rule covers
// every market.

export type RedirectRule = { fromPath: string; toPath: string; statusCode: number };
export type RedirectTable = Map<string, RedirectRule>;

// "/Old-Sale/" and "/old-sale" are the same rule; the query string is ignored for matching.
export function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0] ?? "/";
  const trimmed = bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
  try {
    return decodeURIComponent(trimmed).toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function buildTable(rules: RedirectRule[]): RedirectTable {
  return new Map(rules.map((r) => [normalizePath(r.fromPath), r]));
}

// Where a request should go instead, or null. External targets are kept as they are; site paths
// get the shopper's market prefix. Permanent codes stay permanent (301/308), others are 307.
export function resolveRedirect(
  table: RedirectTable,
  path: string,
  segment: string,
): { location: string; status: 301 | 302 | 307 | 308 } | null {
  const rule = table.get(normalizePath(path));
  if (!rule) return null;
  const location = /^https?:\/\//i.test(rule.toPath)
    ? rule.toPath
    : `/${segment}${rule.toPath.startsWith("/") ? rule.toPath : `/${rule.toPath}`}`.replace(/\/$/, "") || "/";
  if (normalizePath(location) === normalizePath(`/${segment}${path}`)) return null;
  const status = ([301, 302, 307, 308] as const).find((s) => s === rule.statusCode) ?? 301;
  return { location, status };
}
