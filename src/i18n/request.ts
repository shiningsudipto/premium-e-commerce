import { getRequestConfig } from "next-intl/server";
import { market } from "next/root-params";
import { env } from "../lib/env";
import { parseMarketSegment } from "../lib/market";
import { loadMessages } from "./messages";

// The locale comes from the /{locale}-{market}/ root segment, so pages stay statically renderable.
// Root params aren't available in Server Functions or Route Handlers; those use the default market.
export default getRequestConfig(async () => {
  let segment = env.DEFAULT_MARKET;
  try {
    segment = (await market()) ?? segment;
  } catch {
    // outside the [market] tree
  }
  const ref = parseMarketSegment(segment) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  return {
    locale: ref.locale,
    messages: await loadMessages(ref.locale),
    onError: (error) => {
      if (error.code !== "MISSING_MESSAGE") console.error(error);
    },
    getMessageFallback: ({ namespace, key }) => [namespace, key].filter(Boolean).join("."),
  };
});
