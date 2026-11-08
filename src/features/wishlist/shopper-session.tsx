"use client";

import { useEffect, useSyncExternalStore } from "react";

// Whether the shopper is signed in, as far as browser code needs to know. The session cookies are
// httpOnly, so the header's account button (rendered per request on the server) reports it here.
// Until it does — and always during prerendering — the answer is `null` (unknown), so cached
// pages never depend on it and per-customer requests (saved wishlist items) wait for a "yes".

type Listener = () => void;
let signedIn: boolean | null = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useSignedIn = () =>
  useSyncExternalStore(
    subscribe,
    () => signedIn,
    () => null,
  );

export function SessionHint({ signedIn: value }: { signedIn: boolean }) {
  useEffect(() => {
    if (signedIn === value) return;
    signedIn = value;
    for (const listener of listeners) listener();
  }, [value]);
  return null;
}
