// Mutations through the BFF ride on cookies, so they must come from this site's own pages.
// Browsers send Origin on every cross-origin request and on same-origin POST/PUT/PATCH/DELETE.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isSameOriginRequest(request: Request, siteUrl: string): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(siteUrl).origin || origin === new URL(request.url).origin;
  // no Origin (some older browsers on same-origin requests): fall back to Fetch Metadata
  return request.headers.get("sec-fetch-site") === "same-origin";
}
