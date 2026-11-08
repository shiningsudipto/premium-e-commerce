"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Dashboard sections; the current one is marked for screen readers and styled by aria-current
// (same look as the account sections).
export function AffiliateNav({ links, label }: { links: { href: string; label: string }[]; label: string }) {
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
    </nav>
  );
}
