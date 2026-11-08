import "server-only";
import { cache } from "react";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { isEnabled } from "../../lib/flags";

// Who may see the affiliate dashboard, worked out once per request and shared by its layout
// and pages. Reads cookies, so callers sit behind <Suspense>.
export type DashboardAccess =
  | { kind: "signed-out" }
  | { kind: "disabled" }
  | { kind: "not-affiliate" }
  | { kind: "terms"; me: AffiliateMe; currentTermsVersion: string }
  | { kind: "ok"; me: AffiliateMe };

export type AffiliateMe = Awaited<ReturnType<typeof fetchMe>>;

async function fetchMe() {
  const ctx = await requestContext();
  return unwrap(serverApi(ctx).GET("/v1/affiliate/me"));
}

export const dashboardAccess = cache(async (): Promise<DashboardAccess> => {
  const ctx = await requestContext();
  if (ctx.kind !== "customer") return { kind: "signed-out" };
  if (!(await isEnabled("affiliates"))) return { kind: "disabled" };
  try {
    const me = await fetchMe();
    if (me.termsCurrent) return { kind: "ok", me };
    // /me says the terms are outdated but not which version is current; the status call does
    const { currentTermsVersion } = await affiliateStatus();
    return { kind: "terms", me, currentTermsVersion };
  } catch (err) {
    // no affiliate role or not active (403: FORBIDDEN, AFFILIATE_NOT_ACTIVE), or the program
    // was switched off between the flag read and this call (404)
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return { kind: "not-affiliate" };
    throw err;
  }
});

// For dashboard pages: the affiliate when the dashboard may show, else null (the layout has
// already redirected or put the terms prompt in their place).
export async function activeAffiliate(): Promise<AffiliateMe | null> {
  const access = await dashboardAccess();
  return access.kind === "ok" ? access.me : null;
}

// The shopper's application or profile, for the account page.
export async function affiliateStatus() {
  const ctx = await requestContext();
  return unwrap(serverApi(ctx).GET("/v1/store/affiliate/status"));
}
