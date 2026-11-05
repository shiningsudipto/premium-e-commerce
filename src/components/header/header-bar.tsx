"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, type ReactNode } from "react";

// The sticky header condenses (shorter bar, smaller mark, soft shadow) once the page scrolls.
// Its contents stay server-rendered and are passed in as children.
export function HeaderBar({ children }: { children: ReactNode }) {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={cn("site-header", condensed && "is-condensed")} data-block="header">
      {children}
    </header>
  );
}
