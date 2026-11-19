import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { market } from "next/root-params";
import { env } from "../lib/env";
import { parseMarketSegment } from "../lib/market";
import { loadMessages } from "./messages";

// The locale comes from the /{locale}-{market}/ root segment, so pages stay statically renderable.
// Root params aren't available in Server Functions or Route Handlers. Those always run per request,
// so they read the segment proxy.ts put on the request (x-market-segment, the page the action was
// posted from) and answer in the shopper's language; failing that, the default market.
async function currentSegment(): Promise<string | undefined> {
  try {
    const segment = await market();
    if (segment) return segment;
  } catch {
    // outside the [market] tree: a Server Function or Route Handler
  }
  try {
    return (await headers()).get("x-market-segment") ?? undefined;
  } catch {
    return undefined;
  }
}

export default getRequestConfig(async () => {
  const ref = parseMarketSegment(await currentSegment()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  return {
    locale: ref.locale,
    messages: await loadMessages(ref.locale),
    onError: (error) => {
      if (error.code !== "MISSING_MESSAGE") console.error(error);
    },
    getMessageFallback: ({ namespace, key }) => [namespace, key].filter(Boolean).join("."),
  };
});
