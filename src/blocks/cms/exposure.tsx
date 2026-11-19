"use client";

import { useEffect } from "react";
import type { MarketRef } from "../../lib/market";

// Reports that the visitor saw an A/B variant (the analytics beacon's experiment_exposure), so the
// experiment's results count exposed visitors per variant. Rendered next to a variant block once
// the server decided to show it; renders nothing itself.
//
// Once per page view per experiment: several blocks of the same experiment on one page, or
// boundaries that stream in at different moments, report it once. Exposures that mount together
// go out in one request.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CHANNEL = process.env.NEXT_PUBLIC_CHANNEL ?? "web";

let page = "";
let reported = new Set<string>();
let pending: { visitorId: string; market: MarketRef; experiments: Record<string, string> } | null = null;

function flush() {
  const batch = pending;
  pending = null;
  if (!batch) return;
  fetch(`${API_URL}/v1/store/events`, {
    method: "POST",
    credentials: "include",
    // the visitor may leave right away; let the report finish
    keepalive: true,
    headers: {
      "content-type": "application/json",
      "x-market": batch.market.market,
      "x-locale": batch.market.locale,
      "x-channel": CHANNEL,
    },
    body: JSON.stringify({
      visitorId: batch.visitorId,
      events: [{ type: "experiment_exposure", path: page.slice(0, 500), experiments: batch.experiments }],
    }),
  }).catch(() => {
    // analytics only: a lost exposure never affects the page
  });
}

export function reportExposure(visitorId: string, market: MarketRef, key: string, variant: string, path: string) {
  // a new page view (client navigation or full load) starts a fresh count
  if (path !== page) {
    page = path;
    reported = new Set();
  }
  if (reported.has(key)) return false;
  reported.add(key);
  if (!pending) {
    pending = { visitorId, market, experiments: {} };
    setTimeout(flush, 0);
  }
  pending.experiments[key] = variant;
  return true;
}

export function ExperimentExposure({
  visitorId,
  market,
  experimentKey,
  variant,
}: {
  visitorId: string;
  market: MarketRef;
  experimentKey: string;
  variant: string;
}) {
  useEffect(() => {
    reportExposure(visitorId, market, experimentKey, variant, window.location.pathname + window.location.search);
  }, [visitorId, market, experimentKey, variant]);
  return null;
}
