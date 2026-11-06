"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./actions";

// Account sections; the current one is marked for screen readers and styled by aria-current.
export function AccountNav({
  links,
  signOutLabel,
  label,
}: {
  links: { href: string; label: string }[];
  signOutLabel: string;
  label: string;
}) {
  const pathname = usePathname();
  const current = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="account__nav" aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.href === current ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <form action={signOut}>
        <button
          type="submit"
          className="link-btn"
          style={{ padding: "var(--space-3) var(--space-2)" }}
          data-testid="sign-out"
        >
          {signOutLabel}
        </button>
      </form>
    </nav>
  );
}
