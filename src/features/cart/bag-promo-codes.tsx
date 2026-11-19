"use client";

import type { MarketRef } from "../../lib/market";
import { useApplyCodeMutation, useBagErrorMessage, useRemoveCodeMutation } from "./cart-api";
import { PromoCodes } from "./promo-codes";
import type { Bag } from "./types";

// The code field on the bag page: codes go through RTK Query, and the repriced bag the API returns
// replaces the cached one, so the totals, drawer and header follow.
export function BagPromoCodes({ cart, market }: { cart: Bag; market: MarketRef }) {
  const [apply] = useApplyCodeMutation();
  const [remove] = useRemoveCodeMutation();
  const bagErrorMessage = useBagErrorMessage();
  return (
    <PromoCodes
      cart={cart}
      market={market}
      onApply={async (code) => {
        const result = await apply({ cartId: cart.id, code });
        return result.error ? apiMessage(result.error, bagErrorMessage) : null;
      }}
      onRemove={async (code) => {
        const result = await remove({ cartId: cart.id, code });
        return result.error ? apiMessage(result.error, bagErrorMessage) : null;
      }}
    />
  );
}

// The API's own wording for refused codes ("That code isn't valid", "Only one code can be used
// per order") is shopper-facing; anything else gets the generic bag message.
function apiMessage(error: unknown, bagErrorMessage: (error: unknown) => string): string {
  const data = (error as { data?: { code?: string; message?: string } }).data;
  if (data?.message && (data.code === "PROMOTION_CODE_INVALID" || data.code === "TOO_MANY_CODES")) return data.message;
  return bagErrorMessage(error);
}
