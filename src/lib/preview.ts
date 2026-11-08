// Draft previews of CMS pages (plan B-Phase 2: "preview mode via signed token (draft mode)").
// The admin's preview link opens /api/preview, which checks the API's signed token, turns on
// Next.js Draft Mode and keeps the token in an httpOnly cookie for the page to send back to the
// API. Published pages stay cached for everyone else.

export const PREVIEW_COOKIE = "pe_preview";
// the API's preview tokens expire on their own; this only bounds the browser cookie
export const PREVIEW_MAX_AGE = 60 * 60 * 8;

const HANDLE = /^[a-z0-9][a-z0-9-]{0,199}$/;

export type PreviewRequest = { handle: string; token: string; segment: string | null } | null;

// Reads /api/preview?handle=&token=&market=. Anything malformed is refused before the API is asked.
export function parsePreviewRequest(url: URL): PreviewRequest {
  const handle = url.searchParams.get("handle") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const segment = url.searchParams.get("market");
  if (!HANDLE.test(handle) || token.length < 20 || token.length > 4096 || /\s/.test(token)) return null;
  return { handle, token, segment };
}
