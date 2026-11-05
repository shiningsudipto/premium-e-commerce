// Sign-in goes to the API's cookie session endpoints (/v1/admin/session/*, ADR 0012) through the
// generated RTK Query hooks; these helpers only decide where to go next.

export type SignInStatus = "authenticated" | "mfa_required" | "mfa_enrollment_required";

// Only admin paths are followed after sign-in.
export function safeNext(next: string | null): string {
  const ok = !!next && /^\/admin(\/|\?|$)/.test(next) && !/^\/admin\/(login|mfa)(\/|\?|$)/.test(next);
  return ok ? next! : "/admin";
}

export function pathAfterSignIn(status: SignInStatus, next: string): string {
  const query = next === "/admin" ? "" : `?next=${encodeURIComponent(next)}`;
  if (status === "mfa_required") return `/admin/mfa${query}`;
  if (status === "mfa_enrollment_required") return `/admin/mfa/enroll${query}`;
  return next;
}
