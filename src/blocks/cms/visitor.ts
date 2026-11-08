import "server-only";
import { cache } from "react";
import { unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { Visitor } from "./blocks";

// The visitor a targeted block is decided for, once per request. Reads the session cookies, so it
// is only called from targeted blocks, each behind its own <Suspense>; the rest of the page stays
// shared and cached. Segment IDs are fetched only for signed-in customers.
export const currentVisitor = cache(async (): Promise<Visitor> => {
  const ctx = await requestContext();
  const signedIn = ctx.kind === "customer";
  let segmentIds: string[] = [];
  if (signedIn) {
    segmentIds = await unwrap(serverApi(ctx).GET("/v1/store/account/segments"))
      .then((r) => r.segmentIds)
      .catch(() => []);
  }
  return { signedIn, isNew: ctx.kind === null, segmentIds };
});
