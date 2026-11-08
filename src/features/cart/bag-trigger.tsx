"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useBag } from "./bag-provider";
import { useBagDispatch } from "./bag-store";
import { bagApi } from "./cart-api";

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

// The header's bag button with its item count. The server renders the count it knows; once the
// browser has the bag (after opening the drawer or changing it), RTK Query's cached bag takes
// over, so the count follows every change without re-rendering the page on the server.
export function BagButtonLink({ href, initial, icon }: { href: string; initial: number; icon: ReactNode }) {
  const t = useTranslations("header");
  const count = useBagCount(initial);
  return (
    <BagTrigger className="icon-btn" href={href} aria-label={t("bag", { count })} data-testid="bag-link">
      {icon}
      {count > 0 && (
        <span className="cart-count" aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </BagTrigger>
  );
}

function useBagCount(initial: number) {
  const dispatch = useBagDispatch();
  const { data } = bagApi.endpoints.getBag.useQueryState();
  // keep a cached bag alive while the header shows its count (never fetches by itself)
  bagApi.endpoints.getBag.useQuerySubscription(undefined, { skip: data === undefined });

  // A new server count means the session or bag changed elsewhere (sign-in merged the guest
  // bag, checkout placed the order, another tab): drop the cached bag so it is loaded afresh.
  const previous = useRef(initial);
  useEffect(() => {
    if (previous.current === initial) return;
    previous.current = initial;
    dispatch(bagApi.util.invalidateTags(["Bag"]));
  }, [dispatch, initial]);

  return data === undefined ? initial : (data?.itemCount ?? 0);
}
