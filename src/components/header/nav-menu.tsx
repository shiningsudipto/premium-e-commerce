"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { Icon } from "../storefront/icon";

export type NavLink = { label: string; href: string; children: NavLink[] };

// Sub-items of the admin's "main" menu. Desktop: a dropdown under the parent that opens on hover,
// on the chevron (click / Enter / Space) and closes on Escape, leaving or clicking elsewhere; the
// parent label itself stays a link. Mobile drawer: the chevron expands the group in place.

function SubLinks({ links, onNavigate, depth = 0 }: { links: NavLink[]; onNavigate?: () => void; depth?: number }) {
  return (
    <ul className={depth ? "nav-sub nav-sub--nested" : "nav-sub"} role="list">
      {links.map((link, i) => (
        <li key={`${i}-${link.href}`}>
          <Link href={link.href} onClick={onNavigate}>
            {link.label}
          </Link>
          {link.children.length > 0 && <SubLinks links={link.children} onNavigate={onNavigate} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export function DesktopNavItem({ link, submenuLabel }: { link: NavLink; submenuLabel: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // a tap or click anywhere else closes it (touch screens have no "mouse leave")
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  if (!link.children.length) return <Link href={link.href}>{link.label}</Link>;

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // a short grace period, so moving the pointer from the label down to the panel doesn't close it
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div
      ref={root}
      className="nav-item"
      data-open={open || undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          root.current?.querySelector<HTMLButtonElement>(".nav-item__toggle")?.focus();
        }
      }}
    >
      <Link href={link.href} onClick={() => setOpen(false)}>
        {link.label}
      </Link>
      <button
        type="button"
        className="nav-item__toggle"
        aria-expanded={open}
        aria-controls={id}
        aria-label={submenuLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="chevron" size="sm" />
      </button>
      <div id={id} className="nav-item__panel">
        <SubLinks links={link.children} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}

export function MobileNavItem({
  link,
  submenuLabel,
  onNavigate,
}: {
  link: NavLink;
  submenuLabel: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!link.children.length) {
    return (
      <Link href={link.href} onClick={onNavigate} className="drawer__link">
        {link.label} <Icon name="arrow" />
      </Link>
    );
  }
  return (
    <div className="drawer__group" data-open={open || undefined}>
      <div className="drawer__group-row">
        <Link href={link.href} onClick={onNavigate} className="drawer__link">
          {link.label}
        </Link>
        <button
          type="button"
          className="drawer__expand"
          aria-expanded={open}
          aria-controls={id}
          aria-label={submenuLabel}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="chevron" />
        </button>
      </div>
      <div id={id} className="drawer__sub" hidden={!open}>
        <SubLinks links={link.children} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
