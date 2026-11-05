"use client";

import { cn } from "@/lib/utils";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// WAI-ARIA tabs with roving focus: arrow keys, Home and End move between tabs. Panels are
// rendered on the server and passed in; only the active one is shown.
export function ProductTabs({
  tabs,
  label,
  aside,
}: {
  tabs: { id: string; label: string; panel: ReactNode }[];
  label: string;
  aside?: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const onKeyDown = (e: KeyboardEvent) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? active === last
          ? 0
          : active + 1
        : e.key === "ArrowLeft"
          ? active === 0
            ? last
            : active - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div className="grid-tools">
        <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={cn("tab", i === active && "is-active")}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {aside}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          id={`${base}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={i !== active}
        >
          {tab.panel}
        </div>
      ))}
    </>
  );
}
