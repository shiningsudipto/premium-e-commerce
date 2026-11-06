import "server-only";
import { market } from "next/root-params";
import { env } from "./env";
import { parseMarketSegment, type MarketRef } from "./market";

// The market of the page being rendered, from the /{locale}-{market}/ root segment. proxy.ts
// guarantees a valid one; the default is a fallback for code outside the [market] tree.
export async function currentMarket(): Promise<MarketRef> {
  return parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
}
