"use server";

import { redirect } from "next/navigation";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { href } from "../../lib/links";
import { getOrderReturns } from "./data";
import { canHaveReturns, readReturnForm, returnableQuantities } from "./returns";
import type { ReturnFormState } from "./state";

// Customer return requests (plan B-Phase 2, spec §6.5). The form is checked against the order
// as it is now (shipped units, earlier returns); the API then applies the return window and
// final-sale rules and has the last word.

export async function requestReturn(_prev: ReturnFormState, form: FormData): Promise<ReturnFormState> {
  const get = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : "";
  };
  const values: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  const orderId = get("orderId");
  if (!orderId || orderId.length > 64) return { ok: false, errors: {}, messageKey: "failed", values };

  const ctx = await requestContext();
  if (ctx.kind !== "customer") return { ok: false, errors: {}, messageKey: "signInAgain", values };
  const api = serverApi(ctx);
  try {
    const [order, returns] = await Promise.all([
      unwrap(api.GET("/v1/store/orders/{id}", { params: { path: { id: orderId } } })),
      getOrderReturns(ctx, orderId),
    ]);
    if (!canHaveReturns(order.status)) return { ok: false, errors: {}, messageKey: "notShipped", values };
    const { input, errors } = readReturnForm(get, returnableQuantities(order.lines, returns));
    if (!input) return { ok: false, errors, values };

    // An exchange sends the same item again (the order doesn't say which other sizes or colours
    // its products come in, so a different variant can't be offered here).
    const lines = input.lines.map((l) => {
      if (input.resolution !== "EXCHANGE") return l;
      const variantId = order.lines.find((o) => o.id === l.orderLineId)?.variantId;
      return variantId ? { ...l, exchangeVariantId: variantId } : null;
    });
    if (lines.some((l) => l === null)) return { ok: false, errors: { resolution: "exchangeUnavailable" }, values };

    await unwrap(
      api.POST("/v1/store/orders/{id}/returns", {
        params: { path: { id: orderId } },
        body: { ...input, lines: lines.filter((l) => l !== null) },
      }),
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "RETURN_NOT_ELIGIBLE" || err.code === "VALIDATION_FAILED" || err.code === "BAD_REQUEST")
        return { ok: false, errors: {}, message: err.message, values };
      if (err.code === "NOT_FOUND" || err.code === "FORBIDDEN")
        return { ok: false, errors: {}, messageKey: "orderNotFound", values };
      if (err.code === "UNAUTHENTICATED" || err.code === "TOKEN_EXPIRED")
        return { ok: false, errors: {}, messageKey: "signInAgain", values };
      if (err.code === "RATE_LIMITED") return { ok: false, errors: {}, messageKey: "rateLimited", values };
    }
    return { ok: false, errors: {}, messageKey: "failed", values };
  }
  redirect(`${href(ctx.market, `/account/orders/${encodeURIComponent(orderId)}`)}?return=requested#returns`);
}
