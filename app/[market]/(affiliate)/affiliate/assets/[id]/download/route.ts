import { ApiError, unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { downloadName, trackedUrl } from "@/src/features/affiliate/assets";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";

// Downloads a marketing asset as an attachment, with the shopper's session cookies.
// POST /v1/affiliate/assets/{id}/download counts the download and returns the asset with its
// media URL (public storage, not a signed URL) and the affiliate's tracked link; the file is
// streamed from storage through here so the browser saves it under a clean name. Copy assets
// download as a text file: the copy, then the tracked link.

const ID = /^[\w-]{1,64}$/;
const FETCH_TIMEOUT_MS = 20_000;

const noStore = { "cache-control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ market: string; id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return new Response(null, { status: 404, headers: noStore });
  const ctx = await requestContext();
  if (ctx.kind !== "customer") {
    const signIn = `${href(ctx.market, "/account/sign-in")}?next=${encodeURIComponent(href(ctx.market, "/affiliate/assets"))}`;
    return new Response(null, { status: 303, headers: { ...noStore, location: signIn } });
  }

  let asset;
  try {
    asset = await unwrap(serverApi(ctx).POST("/v1/affiliate/assets/{id}/download", { params: { path: { id } } }));
  } catch (err) {
    const status = err instanceof ApiError && [401, 403, 404].includes(err.status) ? err.status : 502;
    return new Response(null, { status, headers: noStore });
  }

  const link = trackedUrl(env.SITE_URL, href(ctx.market), asset.trackedPath);
  if (!asset.media) {
    const text = asset.body?.trim() ? `${asset.body.trim()}\n\n${link}\n` : `${link}\n`;
    return new Response(text, {
      headers: {
        ...noStore,
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${downloadName(asset.title, "text/plain")}"`,
        "x-content-type-options": "nosniff",
      },
    });
  }

  let source: URL;
  try {
    source = new URL(asset.media.url, env.API_URL);
  } catch {
    return new Response(null, { status: 502, headers: noStore });
  }
  if (source.protocol !== "https:" && source.protocol !== "http:") {
    return new Response(null, { status: 502, headers: noStore });
  }
  const file = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(
    () => null,
  );
  if (!file?.ok || !file.body) return new Response(null, { status: 502, headers: noStore });

  const headers: Record<string, string> = {
    ...noStore,
    "content-type": asset.media.mimeType || file.headers.get("content-type") || "application/octet-stream",
    "content-disposition": `attachment; filename="${downloadName(asset.title, asset.media.mimeType)}"`,
    "x-content-type-options": "nosniff",
  };
  // fetch() decodes compressed bodies, so the length only holds for an unencoded response
  const length = file.headers.get("content-length");
  if (length && !file.headers.get("content-encoding")) headers["content-length"] = length;
  return new Response(file.body, { headers });
}
