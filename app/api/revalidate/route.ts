import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { env } from "@/src/lib/env";
import { isAuthorized, revalidateBody } from "@/src/lib/revalidate";

// Called by the API worker after catalog, content, theme or settings changes (spec §3.5):
//   POST /api/revalidate  Authorization: Bearer <REVALIDATE_SECRET>  { tags: string[], eventId? }
// Tagged data is marked stale and refreshed in the background on the next visit.

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"), env.REVALIDATE_SECRET)) {
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Invalid revalidation secret" }, { status: 401 });
  }
  const parsed = revalidateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "VALIDATION_FAILED", message: "Expected { tags: string[] }" }, { status: 400 });
  }
  const tags = [...new Set(parsed.data.tags)];
  for (const tag of tags) revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: tags });
}
