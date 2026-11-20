import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIpOf, contextHeaders } from "@/src/api/upstream";
import { isVisitorId, VISITOR_COOKIE } from "@/src/blocks/cms/visitor-id";
import { env } from "@/src/lib/env";
import { parseMarketSegment, type MarketRef } from "@/src/lib/market";

// Product activity beacon (product views, adds to the bag). The browser posts here, on this
// site, because the anonymous visitor ID cookie is httpOnly; this adds it and forwards the
// events to the API, but only while the store has product activity tracking switched on
// (admin → Settings → Analytics). Always answers 204: tracking never affects the shopper.

const body = z.object({
  segment: z.string().max(40),
  events: z
    .array(
      z.object({
        type: z.enum(["product_view", "add_to_cart"]),
        productId: z.string().min(1).max(60),
        variantId: z.string().max(60).optional(),
        quantity: z.number().int().min(1).max(999).optional(),
        path: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(10),
});

// whether tracking is on, re-read from the API at most once a minute per server instance
let enabled: { value: boolean; at: number } | null = null;
async function trackingEnabled(market: MarketRef): Promise<boolean> {
  if (enabled && Date.now() - enabled.at < 60_000) return enabled.value;
  try {
    const res = await fetch(`${env.API_URL}/v1/store/config`, {
      headers: contextHeaders({ market, channel: env.CHANNEL }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const config = (await res.json()) as { productActivity?: boolean };
    enabled = { value: res.ok && config.productActivity === true, at: Date.now() };
  } catch {
    enabled = { value: false, at: Date.now() };
  }
  return enabled.value;
}

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  const market = parsed.success ? parseMarketSegment(parsed.data.segment) : null;
  if (!parsed.success || !market) return done();
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!isVisitorId(visitorId) || !(await trackingEnabled(market))) return done();
  await fetch(`${env.API_URL}/v1/store/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...contextHeaders({
        market,
        channel: env.CHANNEL,
        clientIp: clientIpOf(request.headers),
        userAgent: request.headers.get("user-agent"),
      }),
      // signed-in shoppers: the API links the events to the customer
      ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
    },
    body: JSON.stringify({ visitorId, events: parsed.data.events }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // analytics only
  });
  return done();
}
