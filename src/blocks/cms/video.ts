// How a video block's URL is shown: YouTube and Vimeo links become their privacy-friendly embed
// players; any other https URL is played directly with <video>. Anything else isn't shown.

export type VideoSource =
  { kind: "embed"; src: string; provider: "youtube" | "vimeo" } | { kind: "file"; src: string } | null;

const YT_ID = /^[\w-]{11}$/;

export function videoSource(raw: unknown, opts: { autoplay?: boolean; loop?: boolean } = {}): VideoSource {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");

  const ytId =
    host === "youtu.be"
      ? url.pathname.slice(1)
      : host === "youtube.com" || host === "youtube-nocookie.com"
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : /^\/(embed|shorts)\/([\w-]{11})/.exec(url.pathname)?.[2]
        : null;
  if (ytId && YT_ID.test(ytId)) {
    const q = new URLSearchParams({ rel: "0" });
    if (opts.autoplay) {
      q.set("autoplay", "1");
      q.set("mute", "1");
    }
    if (opts.loop) {
      q.set("loop", "1");
      q.set("playlist", ytId);
    }
    return { kind: "embed", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${ytId}?${q}` };
  }

  const vimeoId = host === "vimeo.com" || host === "player.vimeo.com" ? /(\d{6,})/.exec(url.pathname)?.[1] : null;
  if (vimeoId) {
    const q = new URLSearchParams({ dnt: "1" });
    if (opts.autoplay) {
      q.set("autoplay", "1");
      q.set("muted", "1");
    }
    if (opts.loop) q.set("loop", "1");
    return { kind: "embed", provider: "vimeo", src: `https://player.vimeo.com/video/${vimeoId}?${q}` };
  }

  // a video site's page that isn't a recognisable video can't be played directly either
  if (/^(youtube(-nocookie)?\.com|youtu\.be|(player\.)?vimeo\.com)$/.test(host)) return null;
  return { kind: "file", src: url.toString() };
}
