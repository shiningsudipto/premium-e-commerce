"use client";

import { Dialog } from "@base-ui/react/dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Icon } from "../../components/storefront/icon";
import type { Sort } from "./listing-query";

// The two interactive pieces of a listing; everything else is server-rendered links.

export function SortSelect({
  options,
  value,
  label,
}: {
  options: { value: Sort; label: string }[];
  value?: Sort;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  return (
    <label className="plp__toolbar-group">
      <span className="sr-only">{label}</span>
      <select
        className="select"
        value={value ?? ""}
        disabled={pending}
        aria-label={label}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set("sort", e.target.value);
          else next.delete("sort");
          next.delete("page");
          start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value === "featured" ? "" : o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// On phones the filter panel opens as a side sheet; its content is the same server-rendered panel.
export function FilterSheet({
  children,
  count,
  labels,
}: {
  children: ReactNode;
  count: number;
  labels: { open: string; title: string; close: string; done: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="btn btn--secondary plp__filter-btn">
        {labels.open}
        {count > 0 && ` (${count})`}
      </Dialog.Trigger>
      <Dialog.Portal>
        <div className="panel panel--left">
          <Dialog.Backdrop className="panel__scrim" />
          <Dialog.Popup className="panel__body" aria-label={labels.title}>
            <div className="panel__head">
              <span className="panel__title">{labels.title}</span>
              <Dialog.Close className="icon-btn" aria-label={labels.close}>
                <Icon name="close" />
              </Dialog.Close>
            </div>
            {/* following a filter link navigates and the sheet closes with the page change */}
            <div className="panel__scroll" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
              {children}
            </div>
            <div className="panel__foot">
              <Dialog.Close className="btn btn--primary btn--block">{labels.done}</Dialog.Close>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
