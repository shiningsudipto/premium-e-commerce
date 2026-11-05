// Session cookies owned by the BFF (ADR 0002). All httpOnly: browser JavaScript never sees a token.

export const COOKIE = {
  access: "pe_at",
  refresh: "pe_rt",
  guest: "pe_guest",
  market: "pe_market",
} as const;

export type Tokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type CookieWrite = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires?: Date;
  maxAge?: number;
};

// The access cookie expires a little before the token, so a request never carries a token
// that dies on the way and the refresh happens up front instead.
const EARLY_EXPIRY_MS = 30_000;

const base = (secure: boolean) => ({ httpOnly: true, secure, sameSite: "lax" as const, path: "/" });

export function sessionCookies(tokens: Tokens, secure: boolean): CookieWrite[] {
  return [
    {
      ...base(secure),
      name: COOKIE.access,
      value: tokens.accessToken,
      expires: new Date(new Date(tokens.accessTokenExpiresAt).getTime() - EARLY_EXPIRY_MS),
    },
    {
      ...base(secure),
      name: COOKIE.refresh,
      value: tokens.refreshToken,
      expires: new Date(tokens.refreshTokenExpiresAt),
    },
  ];
}

export function guestCookie(token: string, secure: boolean): CookieWrite {
  return { ...base(secure), name: COOKIE.guest, value: token, maxAge: 30 * 24 * 3600 };
}

export function marketCookie(segment: string, secure: boolean): CookieWrite {
  return { ...base(secure), name: COOKIE.market, value: segment, maxAge: 365 * 24 * 3600 };
}

export const clearedSession = (secure: boolean): CookieWrite[] =>
  [COOKIE.access, COOKIE.refresh].map((name) => ({ ...base(secure), name, value: "", maxAge: 0 }));
