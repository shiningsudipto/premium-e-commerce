"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { contextHeaders } from "../../api/upstream";
import { env } from "../../lib/env";
import { callSession } from "../../lib/session/api-session";
import { COOKIE } from "../../lib/session/cookies";
import type { Bag, BagResult } from "./types";

// Adding to the bag from any page (spec §5.2). A first-time visitor gets a guest session, the
// same one the BFF would create, so the cart follows them to checkout.

export type AddToBagResult =
  | { ok: true; itemCount: number; cart: Bag }
  | { ok: false; reason: "choose_options" | "sold_out" | "unavailable"; message: string };

const MESSAGES: Partial<Record<string, string>> = {
  INSUFFICIENT_STOCK: "Sorry, there isn't enough stock left for that.",
  PRICE_NOT_AVAILABLE: "This piece isn't sold in your market.",
  CART_NOT_ACTIVE: "Your bag is being checked out. Refresh and try again.",
};

async function shopperToken() {
  const ctx = await requestContext();
  if (ctx.token) return ctx;
  // the API starts the guest session and sets its cookie; pass that cookie on to the browser
  const result = await callSession(
    "store",
    "guest",
    "",
    contextHeaders({ market: ctx.market, channel: env.CHANNEL, requestId: ctx.requestId ?? crypto.randomUUID() }),
  );
  const guest = result.cookies.find((c) => c.name === COOKIE.guest);
  if (!result.ok || !guest) throw new Error("guest session failed");
  const jar = await cookies();
  for (const c of result.cookies) jar.set(c.name, c.value, c.options);
  return { ...ctx, token: guest.value, kind: "guest" as const };
}

// variantId when the shopper chose one; otherwise the product's only variant is used, and a
// product with several asks the shopper to choose on its page.
export async function addToBag(input: {
  variantId?: string;
  handle?: string;
  quantity?: number;
}): Promise<AddToBagResult> {
  try {
    const ctx = await shopperToken();
    const api = serverApi(ctx);
    let variantId = input.variantId;
    if (!variantId && input.handle) {
      const product = await unwrap(
        api.GET("/v1/store/products/{handle}", { params: { path: { handle: input.handle } } }),
      );
      if (product.variants.length !== 1) {
        return { ok: false, reason: "choose_options", message: "Choose a colour or size first." };
      }
      variantId = product.variants[0]!.id;
    }
    if (!variantId) return { ok: false, reason: "unavailable", message: "This piece can't be added right now." };

    const cart = await unwrap(api.POST("/v1/store/carts"));
    const updated = await unwrap(
      api.POST("/v1/store/carts/{id}/lines", {
        params: { path: { id: cart.id } },
        body: { variantId, quantity: input.quantity ?? 1 },
      }),
    );
    // the header's bag count is rendered on the server
    refresh();
    return { ok: true, itemCount: updated.itemCount, cart: updated };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : undefined;
    if (code === "INSUFFICIENT_STOCK") return { ok: false, reason: "sold_out", message: MESSAGES[code]! };
    return {
      ok: false,
      reason: "unavailable",
      message: (code && MESSAGES[code]) ?? "Something went wrong. Please try again.",
    };
  }
}

const failure = (err: unknown): BagResult => {
  const code = err instanceof ApiError ? err.code : undefined;
  return { ok: false, message: (code && MESSAGES[code]) ?? "Something went wrong. Please try again." };
};

// The shopper's bag for the drawer. Without a session there is no bag (and none is created).
export async function loadBag(): Promise<Bag | null> {
  const ctx = await requestContext();
  if (!ctx.token) return null;
  try {
    return await unwrap(serverApi(ctx).POST("/v1/store/carts"));
  } catch {
    return null;
  }
}

// Quantity 0 removes the line. The API checks the cart belongs to this shopper.
export async function setLineQuantity(cartId: string, lineId: string, quantity: number): Promise<BagResult> {
  try {
    const ctx = await requestContext();
    const cart = await unwrap(
      serverApi(ctx).PATCH("/v1/store/carts/{id}/lines/{lineId}", {
        params: { path: { id: cartId, lineId } },
        body: { quantity: Math.max(0, Math.min(999, Math.trunc(quantity))) },
      }),
    );
    refresh();
    return { ok: true, cart };
  } catch (err) {
    return failure(err);
  }
}

export async function removeLine(cartId: string, lineId: string): Promise<BagResult> {
  try {
    const ctx = await requestContext();
    const cart = await unwrap(
      serverApi(ctx).DELETE("/v1/store/carts/{id}/lines/{lineId}", { params: { path: { id: cartId, lineId } } }),
    );
    refresh();
    return { ok: true, cart };
  } catch (err) {
    return failure(err);
  }
}
