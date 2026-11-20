import type { MarketRef } from "../../lib/market";

// Product activity beacons for the admin's Product activity report. They go to this site's
// /api/track, which adds the anonymous visitor ID and drops everything while tracking is off in
// Settings, so callers don't need to know whether it's on. Never throws; never blocks the page.

type TrackEvent =
  | { type: "product_view"; productId: string }
  | { type: "add_to_cart"; productId: string; variantId?: string; quantity?: number };

function send(market: MarketRef, event: TrackEvent) {
  if (typeof window === "undefined") return;
  const path = (window.location.pathname + window.location.search).slice(0, 500);
  fetch("/api/track", {
    method: "POST",
    // the shopper may leave right away; let it finish
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ segment: market.segment, events: [{ ...event, path }] }),
  }).catch(() => {});
}

// once per product per page load (React may run effects twice in development)
const viewed = new Set<string>();
let viewedPage = "";

export function trackProductView(market: MarketRef, productId: string) {
  if (typeof window === "undefined") return;
  const page = window.location.pathname;
  if (page !== viewedPage) {
    viewedPage = page;
    viewed.clear();
  }
  if (viewed.has(productId)) return;
  viewed.add(productId);
  send(market, { type: "product_view", productId });
}

export function trackAddToCart(market: MarketRef, productId: string, variantId: string, quantity: number) {
  send(market, { type: "add_to_cart", productId, variantId, quantity });
}
