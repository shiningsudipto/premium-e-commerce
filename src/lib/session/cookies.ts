// Cookie names. The session cookies are set and cleared by the API (ADR 0012); the web app only
// reads them (Server Components pass the token on server-to-server) and owns the market choice.

export const COOKIE = {
  access: "pe_at",
  refresh: "pe_rt",
  guest: "pe_guest",
  market: "pe_market",
} as const;

export type CookieWrite = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
};

export function marketCookie(segment: string, secure: boolean): CookieWrite {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    name: COOKIE.market,
    value: segment,
    maxAge: 365 * 24 * 3600,
  };
}
