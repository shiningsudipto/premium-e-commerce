// Staff session cookie names. The API sets and clears them on /v1/admin/session/* (ADR 0012);
// the web app only checks whether a session exists before rendering console pages.
export const COOKIE = {
  access: "pa_at",
  refresh: "pa_rt",
  // the short-lived token between password and MFA code
  mfa: "pa_mfa",
} as const;
