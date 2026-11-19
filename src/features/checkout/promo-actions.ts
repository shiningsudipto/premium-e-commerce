"use server";

import { getTranslations } from "next-intl/server";
import { ApiError, unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { Bag } from "../cart/types";

// Promotion codes at checkout. Checkout keeps its cart in component state and changes it through
// Server Actions, so codes do the same here (the bag page uses RTK Query instead).

export type CodeResult = { ok: true; cart: Bag } | { ok: false; message: string };

// The API's wording for refused codes is written for shoppers; other failures get a generic line.
async function failure(err: unknown): Promise<CodeResult> {
  if (err instanceof ApiError && (err.code === "PROMOTION_CODE_INVALID" || err.code === "TOO_MANY_CODES")) {
    return { ok: false, message: err.message };
  }
  const t = await getTranslations("checkout.errors");
  return { ok: false, message: t("generic") };
}

export async function applyPromoCode(cartId: string, code: string): Promise<CodeResult> {
  try {
    const ctx = await requestContext();
    const cart = await unwrap(
      serverApi(ctx).POST("/v1/store/carts/{id}/promotion-codes", {
        params: { path: { id: cartId } },
        body: { code: code.trim().slice(0, 60) },
      }),
    );
    return { ok: true, cart };
  } catch (err) {
    return failure(err);
  }
}

export async function removePromoCode(cartId: string, code: string): Promise<CodeResult> {
  try {
    const ctx = await requestContext();
    const cart = await unwrap(
      serverApi(ctx).DELETE("/v1/store/carts/{id}/promotion-codes/{code}", {
        params: { path: { id: cartId, code } },
      }),
    );
    return { ok: true, cart };
  } catch (err) {
    return failure(err);
  }
}
