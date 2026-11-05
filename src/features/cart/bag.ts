import "server-only";
import { unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";

// Items in the shopper's bag, for the header. Needs a session, so visitors without one see 0
// (and no cart is created for them). Reads cookies: render it behind <Suspense>.
export async function bagCount(): Promise<number> {
  const ctx = await requestContext();
  if (!ctx.token) return 0;
  try {
    const cart = await unwrap(serverApi(ctx).POST("/v1/store/carts"));
    return cart.itemCount;
  } catch {
    return 0;
  }
}
