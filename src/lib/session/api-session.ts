import { env } from "../env";

// The API owns session cookies (ADR 0012). When the web server has to act on a session itself —
// proxy.ts refreshing an expired one before a page renders, or a Server Action starting a guest
// session — it calls the API's /session endpoint with the browser's cookies and hands the
// Set-Cookie headers the API answers with on to the browser, unchanged.

export type SessionAudience = "admin" | "store";

export type ParsedCookie = {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    domain?: string;
    expires?: Date;
    maxAge?: number;
  };
};

export function parseSetCookie(header: string): ParsedCookie {
  const [pair = "", ...attributes] = header.split(";");
  const eq = pair.indexOf("=");
  const cookie: ParsedCookie = {
    name: pair.slice(0, eq).trim(),
    value: decodeURIComponent(pair.slice(eq + 1).trim()),
    options: {},
  };
  for (const attribute of attributes) {
    const [rawKey = "", ...rest] = attribute.split("=");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key === "httponly") cookie.options.httpOnly = true;
    else if (key === "secure") cookie.options.secure = true;
    else if (key === "path") cookie.options.path = value;
    else if (key === "domain") cookie.options.domain = value;
    else if (key === "expires") cookie.options.expires = new Date(value);
    else if (key === "max-age") cookie.options.maxAge = Number(value);
    else if (key === "samesite") cookie.options.sameSite = value.toLowerCase() as ParsedCookie["options"]["sameSite"];
  }
  return cookie;
}

export type SessionResult = { ok: boolean; cookies: ParsedCookie[] };

// ok: false means the API refused (no session, expired, revoked or reused); its answer then
// clears the cookies. A network failure throws, so a flaky connection doesn't sign anyone out.
export async function callSession(
  audience: SessionAudience,
  action: "refresh" | "guest",
  cookieHeader: string,
  headers: Record<string, string> = {},
): Promise<SessionResult> {
  const res = await fetch(`${env.API_URL}/v1/${audience}/session/${action}`, {
    method: "POST",
    headers: { ...headers, ...(cookieHeader ? { cookie: cookieHeader } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const cookies = res.headers.getSetCookie().map(parseSetCookie);
  if (res.ok) return { ok: true, cookies };
  if (res.status >= 400 && res.status < 500) return { ok: false, cookies };
  throw new Error(`session ${action} failed with ${res.status}`);
}
