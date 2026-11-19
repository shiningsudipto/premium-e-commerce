import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { unwrap } from "../../api/errors";
import { requestContext, serverApi } from "../../api/server";
import type { Assignments, Visitor } from "./blocks";
import { isVisitorId, VISITOR_COOKIE } from "./visitor-id";

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

// The visitor's A/B variants, once per request, for variant blocks (each behind its own
// <Suspense>). The ID comes from the cookie proxy.ts sets; without one, or when the API can't be
// reached, the visitor is in no experiment and variant blocks show nothing.
export const currentAssignments = cache(async (): Promise<{ visitorId: string | null; assignments: Assignments }> => {
  const visitorId = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!isVisitorId(visitorId)) return { visitorId: null, assignments: {} };
  const ctx = await requestContext();
  const assignments = await unwrap(
    serverApi({ market: ctx.market, requestId: ctx.requestId }).GET("/v1/store/experiments", {
      params: { query: { visitorId } },
    }),
  ).catch((): Assignments => ({}));
  return { visitorId, assignments };
});
