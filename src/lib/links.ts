import type { MarketRef } from "./market";

// Storefront paths always carry the market prefix.
export const href = (market: MarketRef, path = "/") => `/${market.segment}${path === "/" ? "" : path}`;
