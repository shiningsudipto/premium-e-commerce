// Recently viewed product IDs, newest first, kept in this browser only (never sent with page
// requests, so cached pages stay shared). Storage can be missing or blocked (private windows,
// disabled site data): every access is guarded and falls back to "nothing viewed".

const KEY = "pe_recently_viewed";
export const MAX_RECENT = 12;

const ID = /^[A-Za-z0-9_-]{1,60}$/;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((id): id is string => typeof id === "string" && ID.test(id)).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

// Moves the product to the front; returns the list as it was before this view.
export function recordView(productId: string): string[] {
  const before = readRecent();
  if (!ID.test(productId)) return before;
  try {
    const next = [productId, ...before.filter((id) => id !== productId)].slice(0, MAX_RECENT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: the strip just won't remember this one
  }
  return before;
}
