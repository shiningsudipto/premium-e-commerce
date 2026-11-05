import type { Tokens } from "./cookies";

// The API rotates refresh tokens and revokes the whole session when a rotated token is presented
// again (spec §3.4). A page load and its prefetches can all arrive with the same expired cookie, so
// concurrent refreshes of one token share a single call, and the result is kept briefly for
// requests that left the browser before the new cookies arrived.
//
// The map lives on globalThis because proxy.ts and route handlers are bundled separately but run in
// one Node process. With several storefront instances, sticky sessions keep a browser on one of them.

type Entry = { promise: Promise<Tokens | null>; settledAt?: number };

const REUSE_WINDOW_MS = 60_000;
const store = ((globalThis as { __peRefresh?: Map<string, Entry> }).__peRefresh ??= new Map());

export function refreshOnce(
  refreshToken: string,
  refresh: (token: string) => Promise<Tokens | null>,
  now = Date.now(),
) {
  for (const [key, entry] of store) {
    if (entry.settledAt && now - entry.settledAt > REUSE_WINDOW_MS) store.delete(key);
  }
  const existing = store.get(refreshToken);
  if (existing) return existing.promise;

  const entry: Entry = {
    promise: refresh(refreshToken).then(
      (tokens) => {
        entry.settledAt = Date.now();
        return tokens;
      },
      (err) => {
        // a network failure isn't a verdict on the token, so the next request may try again
        store.delete(refreshToken);
        throw err;
      },
    ),
  };
  store.set(refreshToken, entry);
  return entry.promise;
}

export const clearRefreshCache = () => store.clear();
