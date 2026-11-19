// The anonymous visitor ID: one stable, random ID per browser, set by proxy.ts on the first
// storefront request and kept for a year. A/B experiments bucket visitors by it (the API hashes
// it per experiment), and the analytics beacon reports exposures under it. It is httpOnly: the
// server reads it when it decides a variant block and hands it to that block's exposure beacon.

export const VISITOR_COOKIE = "pe_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

// what the API accepts as a visitorId (8–100 chars); anything else is replaced
const SHAPE = /^[A-Za-z0-9_-]{8,100}$/;
export const isVisitorId = (value: string | undefined | null): value is string => !!value && SHAPE.test(value);

export const newVisitorId = () => crypto.randomUUID().replace(/-/g, "");

export function visitorCookie(value: string, secure: boolean) {
  return {
    name: VISITOR_COOKIE,
    value,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_YEAR,
  };
}
