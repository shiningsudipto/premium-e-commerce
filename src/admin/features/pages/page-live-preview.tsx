"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ExternalLinkIcon, EyeIcon, MonitorIcon, RefreshCwIcon, SmartphoneIcon, TabletIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCan } from "../../components/can";
import { notifyError } from "../../lib/notify";
import { useGetV1AdminMarketsQuery, usePostV1AdminPagesIdPreviewLinkMutation } from "../../store/api.generated";
import { marketSegments, previewPath } from "./block-tree";
import type { AdminPage } from "./page-publishing";

// One-click, full-screen preview of the page as shoppers will see it, over the whole admin.
// Unsaved changes are saved to the draft first (the live page doesn't change until Publish), then
// the storefront shows the draft in a frame through a short-lived preview link. Device widths,
// language, refresh and "open in a new tab" sit in a thin bar on top; Esc closes it.

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%", icon: MonitorIcon },
  { id: "tablet", label: "Tablet", width: "820px", icon: TabletIcon },
  { id: "phone", label: "Phone", width: "390px", icon: SmartphoneIcon },
] as const;
type Device = (typeof DEVICES)[number]["id"];

const LANGUAGE: Record<string, string> = { en: "English", bn: "বাংলা" };
const segmentLabel = (segment: string) => {
  const [locale, market] = segment.split("-");
  return `${LANGUAGE[locale!] ?? locale} · ${market?.toUpperCase()}`;
};

// Preview state lives outside React: saving the draft re-creates the page editor (it's keyed by
// the page version), which would otherwise close the preview the moment it opens.
type PreviewState = {
  pageId: string;
  token: { handle: string; token: string } | null;
  open: boolean;
  busy: boolean;
  segment: string | null;
  device: Device;
  reloadKey: number;
};
let state: PreviewState | null = null;
const listeners = new Set<() => void>();
const store = {
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => state,
  set: (pageId: string, patch: Partial<PreviewState>) => {
    const base: PreviewState =
      state?.pageId === pageId
        ? state
        : { pageId, token: null, open: false, busy: false, segment: null, device: "desktop", reloadKey: 0 };
    state = { ...base, ...patch };
    listeners.forEach((fn) => fn());
  },
};
const usePreviewState = () => useSyncExternalStore(store.subscribe, store.get, () => null);

export function LivePreviewButton({
  page,
  dirty,
  disabled,
  onSave,
}: {
  page: AdminPage;
  dirty: boolean;
  disabled: boolean;
  onSave: () => Promise<boolean>;
}) {
  const canMarkets = useCan("settings.read");
  const markets = useGetV1AdminMarketsQuery({}, { skip: !canMarkets });
  const segments = marketSegments(markets.data ?? []);
  const [createLink] = usePostV1AdminPagesIdPreviewLinkMutation();
  const shared = usePreviewState();
  const mine = shared?.pageId === page.id ? shared : null;
  const set = (patch: Partial<PreviewState>) => store.set(page.id, patch);
  const busy = !!mine?.busy;

  // save the draft if needed, then get a fresh preview link (valid for an hour) and reload
  async function prepare(openAfter: boolean) {
    set({ busy: true });
    try {
      if (dirty && !(await onSave())) return;
      const res = await createLink({ id: page.id, body: { hours: 1 } }).unwrap();
      const current = store.get();
      store.set(page.id, {
        token: { handle: res.handle, token: res.token },
        reloadKey: (current?.pageId === page.id ? current.reloadKey : 0) + 1,
        ...(openAfter ? { open: true } : {}),
      });
    } catch (err) {
      notifyError(err);
    } finally {
      store.set(page.id, { busy: false });
    }
  }

  const chosen = mine?.segment ?? segments[0] ?? null;
  const url = mine?.token ? previewPath(mine.token, chosen) : null;

  return (
    <>
      <Button size="sm" variant="outline" disabled={disabled || busy} onClick={() => void prepare(true)}>
        <EyeIcon /> {busy && !mine?.open ? "Opening…" : "Live preview"}
      </Button>
      {mine?.open &&
        url &&
        createPortal(
          <PreviewOverlay
            title={page.title}
            url={url}
            reloadKey={mine.reloadKey}
            device={mine.device}
            onDevice={(device) => set({ device })}
            segments={segments}
            segment={chosen}
            onSegment={(segment) => set({ segment, reloadKey: mine.reloadKey + 1 })}
            busy={busy}
            onRefresh={() => void prepare(false)}
            onClose={() => set({ open: false })}
          />,
          document.body,
        )}
    </>
  );
}

function PreviewOverlay({
  title,
  url,
  reloadKey,
  device,
  onDevice,
  segments,
  segment,
  onSegment,
  busy,
  onRefresh,
  onClose,
}: {
  title: string;
  url: string;
  reloadKey: number;
  device: Device;
  onDevice: (d: Device) => void;
  segments: string[];
  segment: string | null;
  onSegment: (s: string) => void;
  busy: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const width = DEVICES.find((d) => d.id === device)!.width;
  const frameKey = `${reloadKey}:${url}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  // shown until the frame for the current URL and reload has finished loading
  const loadingNow = loadedKey !== frameKey;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // the admin underneath doesn't scroll while the preview is open
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${title}`}
      className="fixed inset-0 z-[100] flex flex-col bg-muted"
    >
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2 text-sm">
        <span className="min-w-0 truncate font-medium">{title}</span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
          Draft preview · not live until you publish
        </span>
        <div className="mx-auto flex gap-1" role="group" aria-label="Screen size">
          {DEVICES.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant={device === d.id ? "secondary" : "ghost"}
              aria-pressed={device === d.id}
              onClick={() => onDevice(d.id)}
              title={d.label}
            >
              <d.icon /> <span className="hidden sm:inline">{d.label}</span>
            </Button>
          ))}
        </div>
        {segments.length > 1 && (
          <Select value={segment ?? ""} onValueChange={(v) => v && onSegment(String(v))}>
            <SelectTrigger size="sm" aria-label="Language and market" className="w-36">
              <SelectValue>{segment ? segmentLabel(segment) : "Language"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s} value={s}>
                  {segmentLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="ghost" onClick={onRefresh} disabled={busy} title="Save the draft and reload">
          <RefreshCwIcon className={cn(busy && "animate-spin")} /> <span className="hidden sm:inline">Refresh</span>
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted"
          title="Open in a new tab"
        >
          <ExternalLinkIcon className="size-4" /> <span className="hidden sm:inline">New tab</span>
        </a>
        <Button ref={closeRef} size="sm" variant="outline" onClick={onClose}>
          <XIcon /> Close <kbd className="ml-1 hidden text-[10px] text-muted-foreground sm:inline">Esc</kbd>
        </Button>
      </div>
      <div className="relative flex flex-1 justify-center overflow-auto p-0 sm:p-3">
        {loadingNow && (
          <p className="absolute top-6 left-1/2 z-0 -translate-x-1/2 text-sm text-muted-foreground" role="status">
            Loading preview…
          </p>
        )}
        <iframe
          key={frameKey}
          src={url}
          title={`${title}: draft preview`}
          onLoad={() => setLoadedKey(frameKey)}
          style={{ width, maxWidth: "100%" }}
          className={cn(
            "relative z-10 h-full border-0 bg-background shadow-sm transition-[width] duration-200",
            device !== "desktop" && "rounded-md border",
          )}
        />
      </div>
    </div>
  );
}
