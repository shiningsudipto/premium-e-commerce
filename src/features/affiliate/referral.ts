// Affiliate attribution (spec §7.3). A visit with ?ref=CODE (plus optional &sub= and &asset=)
// is remembered in an httpOnly cookie holding the first and the last referral click, in the
// shape the API's `referralInput` expects ({ first, last }: { code, subId, assetId, clickedAt }).
// The storefront sends it with the cart (PATCH /v1/store/carts/{id} { referral }); the API
// decides at order placement whether the click still counts (window, self-referral, status).
// Pure helpers only, so proxy.ts, Server Actions and tests can share them.

export const REF_COOKIE = "pe_ref";
// The API enforces the attribution window (setting affiliate.cookie_days, at most 365) from
// clickedAt, so the cookie only has to outlive the longest window an admin can choose.
export const REF_COOKIE_MAX_AGE = 365 * 24 * 3600;

export const REF_PARAMS = ["ref", "sub", "asset"] as const;

export type ReferralClick = { code: string; subId: string | null; assetId: string | null; clickedAt: string };
export type Referral = { first: ReferralClick; last: ReferralClick };

const CODE = /^[A-Za-z0-9_-]{1,60}$/;
const ASSET = /^[A-Za-z0-9_-]{1,60}$/;

// Sub-IDs are free text chosen by the affiliate ("instagram-bio"); keep them printable and short.
function cleanSubId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return value ? value.slice(0, 100) : null;
}

// The referral in a URL, or null when it has no (valid) ref code.
export function readRefParams(
  params: URLSearchParams,
): { code: string; subId: string | null; assetId: string | null } | null {
  const code = params.get("ref")?.trim() ?? "";
  if (!CODE.test(code)) return null;
  const asset = params.get("asset")?.trim() ?? "";
  return { code: code.toUpperCase(), subId: cleanSubId(params.get("sub")), assetId: ASSET.test(asset) ? asset : null };
}

// Whether the URL carries referral parameters that should be recorded and removed.
export const hasRefParams = (params: URLSearchParams) => params.has("ref");

// The query string without the referral parameters ("" or "?a=1&b=2"), other params untouched.
export function cleanSearch(params: URLSearchParams): string {
  const next = new URLSearchParams(params);
  for (const p of REF_PARAMS) next.delete(p);
  const s = next.toString();
  return s ? `?${s}` : "";
}

function readClick(value: unknown): ReferralClick | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.code !== "string" || !CODE.test(v.code)) return null;
  if (typeof v.clickedAt !== "string" || Number.isNaN(Date.parse(v.clickedAt))) return null;
  return {
    code: v.code,
    subId: typeof v.subId === "string" ? cleanSubId(v.subId) : null,
    assetId: typeof v.assetId === "string" && ASSET.test(v.assetId) ? v.assetId : null,
    clickedAt: v.clickedAt,
  };
}

// The cookie's value, or null when it's missing or was tampered with into something unusable.
export function parseReferral(raw: string | null | undefined): Referral | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { first?: unknown; last?: unknown };
    const first = readClick(value?.first);
    const last = readClick(value?.last);
    if (!first && !last) return null;
    return { first: (first ?? last)!, last: (last ?? first)! };
  } catch {
    return null;
  }
}

// A new click keeps the original first referral and replaces the last one, so the API can apply
// either attribution model (affiliate.attribution_model).
export function nextReferral(
  previous: Referral | null,
  click: { code: string; subId: string | null; assetId: string | null },
  now: Date,
): Referral {
  const last: ReferralClick = { ...click, clickedAt: now.toISOString() };
  return { first: previous?.first ?? last, last };
}

export const serializeReferral = (referral: Referral) => JSON.stringify(referral);

// A shareable link: any storefront path with ?ref= (and &sub= when given). `path` may carry its
// own query string; existing referral params in it are replaced.
export function buildAffiliateLink(input: {
  origin: string;
  path: string;
  code: string;
  subId?: string | null;
}): string {
  const url = new URL(input.path.startsWith("/") ? input.path : `/${input.path}`, input.origin);
  for (const p of REF_PARAMS) url.searchParams.delete(p);
  url.searchParams.set("ref", input.code);
  const sub = cleanSubId(input.subId);
  if (sub) url.searchParams.set("sub", sub);
  return url.toString();
}

// Only same-site paths are offered in the link builder ("/products/x", not "https://…" or "//x").
export function normalizeLinkPath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || /[\s\\]/.test(value)) return null;
  return value.slice(0, 500);
}
