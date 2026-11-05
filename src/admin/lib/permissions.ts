// Mirrors the API's hasPermission(): the Owner holds every staff permission through "*".
// UI gating only; the API checks every request itself.
export const ALL = "*";

export function can(granted: readonly string[] | undefined, required: string | readonly string[]): boolean {
  if (!granted) return false;
  if (granted.includes(ALL)) return true;
  const needed = typeof required === "string" ? [required] : required;
  // a list means any one of them
  return needed.some((p) => granted.includes(p));
}
