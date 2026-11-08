"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import { href } from "../../lib/links";
import { readReferralCookie } from "../affiliate/referral-cookie";
import type { Bag } from "../cart/types";
import { readAddress, readEmail, type FieldErrors } from "./address";

// Checkout steps (plan B.2). Each returns the repriced cart so the page can move on without a
// reload; the API keeps the rules (changing the address clears the shipping method, etc.).

export type DetailsState = { ok: boolean; cart?: Bag; errors: FieldErrors; message?: string };

const API_MESSAGES: Partial<Record<string, string>> = {
  CART_NOT_ACTIVE: "This bag has already been checked out.",
  CART_EMPTY: "Your bag is empty.",
  CART_INVALID: "Check your details and delivery method, then try again.",
  SHIPPING_UNAVAILABLE: "We can't deliver to that address yet.",
  INSUFFICIENT_STOCK: "Something in your bag has sold out. Check your bag and try again.",
  PAYMENT_PROVIDER_UNAVAILABLE: "That payment method isn't available. Choose another.",
  PAYMENT_FAILED: "The payment didn't go through. Try again or choose another method.",
  GUEST_CHECKOUT_DISABLED: "Sign in to check out.",
};

function apiFailure(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError) {
    // the API names fields as in its body ("shippingAddress.city"); the form uses "shipping.city"
    const details = err.details as { fieldErrors?: Record<string, string[]> } | undefined;
    const fields: FieldErrors = {};
    for (const [path, messages] of Object.entries(details?.fieldErrors ?? {})) {
      fields[path.replace(/^(shipping|billing)Address./, "$1.")] = messages[0];
    }
    return { message: API_MESSAGES[err.code] ?? err.message ?? fallback, fields };
  }
  return { message: fallback, fields: {} as FieldErrors };
}

export async function saveDetails(cartId: string, _prev: DetailsState, form: FormData): Promise<DetailsState> {
  const { email, error: emailError } = readEmail(form);
  const shipping = readAddress(form, "shipping");
  const sameBilling = form.get("billingSame") !== "off";
  const billing = sameBilling ? shipping : readAddress(form, "billing");
  const errors: FieldErrors = { ...shipping.errors, ...(sameBilling ? {} : billing.errors) };
  if (emailError) errors.email = emailError;
  if (Object.keys(errors).length) return { ok: false, errors };

  try {
    const [ctx, referral] = await Promise.all([requestContext(), readReferralCookie()]);
    const cart = await unwrap(
      serverApi(ctx).PATCH("/v1/store/carts/{id}", {
        params: { path: { id: cartId } },
        body: {
          email,
          shippingAddress: shipping.address,
          billingAddress: billing.address,
          acceptsMarketing: form.get("acceptsMarketing") === "on",
          // affiliate attribution (?ref= cookie); the API judges it when the order is placed
          ...(referral ? { referral } : {}),
        },
      }),
    );
    return { ok: true, cart, errors: {} };
  } catch (err) {
    const { message, fields } = apiFailure(err);
    return { ok: false, errors: fields, message };
  }
}

export async function chooseShipping(
  cartId: string,
  rateId: string,
): Promise<{ ok: true; cart: Bag } | { ok: false; message: string }> {
  try {
    const ctx = await requestContext();
    const cart = await unwrap(
      serverApi(ctx).PUT("/v1/store/carts/{id}/shipping-rate", {
        params: { path: { id: cartId } },
        body: { rateId },
      }),
    );
    return { ok: true, cart };
  } catch (err) {
    return { ok: false, message: apiFailure(err).message };
  }
}

// The key comes from the browser and stays the same for every retry of one attempt, so a
// double click or a timeout never places two orders (the API replays the first response).
export async function placeOrder(input: {
  cartId: string;
  paymentProvider: string;
  notes?: string;
  idempotencyKey: string;
}): Promise<{ ok: false; message: string }> {
  // the referral (if any) is already on the cart: saved with the details and when checkout opened,
  // so the total the shopper confirms is the total they pay
  const ctx = await requestContext();
  let orderId: string;
  try {
    const result = await unwrap(
      serverApi(ctx).POST("/v1/store/checkout/{id}/place-order", {
        params: { path: { id: input.cartId }, header: { "Idempotency-Key": input.idempotencyKey } },
        body: {
          paymentProvider: input.paymentProvider,
          ...(input.notes?.trim() ? { notes: input.notes.trim().slice(0, 1000) } : {}),
        },
      }),
    );
    orderId = result.orderId;
  } catch (err) {
    return { ok: false, message: apiFailure(err, "We couldn't place your order. Please try again.").message };
  }
  // the bag count in the header is now zero
  refresh();
  redirect(href(ctx.market, `/checkout/confirmation/${orderId}`));
}
