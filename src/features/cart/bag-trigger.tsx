"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useBag } from "./bag-provider";

// The header's bag button: a link to the bag page that opens the drawer instead on a plain
// click (new-tab clicks and no-JS visits still reach the page).
export function BagTrigger({ onClick, ...props }: ComponentProps<typeof Link>) {
  const { openBag } = useBag();
  return (
    <Link
      {...props}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openBag();
      }}
    />
  );
}
