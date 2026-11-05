"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "../storefront/icon";

type MenuLink = { label: string; href: string };

// The drawer on screens below 1280px. Base UI's dialog traps focus, closes on Escape and the
// scrim, and returns focus to the menu button.
export function MobileMenu({
  storeName,
  links,
  footerLinks,
  marketLabel,
  labels,
}: {
  storeName: string;
  links: MenuLink[];
  footerLinks: MenuLink[];
  marketLabel: string;
  labels: { open: string; close: string; menu: string; nav: string };
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="icon-btn menu-btn" aria-label={labels.open}>
        <Icon name="menu" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <div className="drawer">
          <Dialog.Backdrop className="drawer__scrim" />
          <Dialog.Popup className="drawer__panel" aria-label={labels.menu}>
            <div className="drawer__top">
              {/* the dialog is named "Menu" (aria-label); the store name is decoration here */}
              <span className="logo__word" aria-hidden="true">
                {storeName}
              </span>
              <Dialog.Close className="icon-btn" aria-label={labels.close}>
                <Icon name="close" />
              </Dialog.Close>
            </div>
            <nav className="drawer__nav" aria-label={labels.nav}>
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={close}>
                  {link.label} <Icon name="arrow" />
                </Link>
              ))}
            </nav>
            <div className="drawer__foot">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={close}>
                  {link.label}
                </Link>
              ))}
              <span className="muted">{marketLabel}</span>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
