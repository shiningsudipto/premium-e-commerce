"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";

export type FilterDef =
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] };

// Filter values live in the URL, so a filtered list can be bookmarked, shared and reloaded.
export function useTableFilters(filters: FilterDef[]) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const values = useMemo(
    () => Object.fromEntries(filters.flatMap((f) => (params.get(f.key) ? [[f.key, params.get(f.key)!]] : []))),
    [filters, params],
  ) as Record<string, string>;

  const setValues = useCallback(
    (next: Record<string, string | undefined>) => {
      const search = new URLSearchParams(params);
      for (const f of filters) {
        const v = next[f.key]?.trim();
        if (v) search.set(f.key, v);
        else search.delete(f.key);
      }
      const query = search.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, params, pathname, router],
  );

  return { values, setValues, key: JSON.stringify(values) };
}

// Saved views (spec §6.4): named filter sets per table, kept in this browser.
export type SavedView = { name: string; values: Record<string, string> };

const STORAGE_PREFIX = "pa:views:";
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; views: SavedView[] }>();

function read(tableKey: string): SavedView[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_PREFIX + tableKey);
  } catch {
    // storage blocked: views just don't persist
  }
  const hit = cache.get(tableKey);
  if (hit && hit.raw === raw) return hit.views;
  let views: SavedView[] = [];
  try {
    views = raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    views = [];
  }
  cache.set(tableKey, { raw, views });
  return views;
}

const NO_VIEWS: SavedView[] = [];

export function useSavedViews(tableKey: string) {
  const views = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      window.addEventListener("storage", onChange);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    () => read(tableKey),
    () => NO_VIEWS,
  );

  const write = useCallback(
    (next: SavedView[]) => {
      try {
        localStorage.setItem(STORAGE_PREFIX + tableKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      listeners.forEach((l) => l());
    },
    [tableKey],
  );

  return {
    views,
    save: (name: string, values: Record<string, string>) =>
      write([...views.filter((v) => v.name !== name), { name, values }]),
    remove: (name: string) => write(views.filter((v) => v.name !== name)),
  };
}
