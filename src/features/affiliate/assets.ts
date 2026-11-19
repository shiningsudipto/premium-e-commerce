// Marketing asset helpers shared by the assets page, its download route and the tracked-link
// panel (no server or browser APIs, so they can be unit-tested).

// The API's tracked path has no market prefix ("/products/x?ref=CODE&asset=ID", "/?ref=…").
export function trackedUrl(origin: string, marketPrefix: string, trackedPath: string): string {
  const path = trackedPath.startsWith("/") ? trackedPath : `/${trackedPath}`;
  // "/?ref=…" (the home page) → "/en-bd?ref=…"
  const rest = path.startsWith("/?") || path === "/" ? path.slice(1) : path;
  return new URL(`${marketPrefix}${rest}`, origin).toString();
}

const FORMATS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "application/pdf": "PDF",
  "video/mp4": "MP4",
  "text/plain": "TXT",
};

// Short file format for a MIME type: "image/png" → "PNG".
export function fileFormat(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null;
  const type = mimeType.split(";")[0]!.trim().toLowerCase();
  return FORMATS[type] ?? (type.split("/")[1]?.toUpperCase().slice(0, 8) || null);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "text/plain": "txt",
};

// A safe download name: the asset title as a slug plus an extension for its type.
export function downloadName(title: string, mimeType: string | null | undefined): string {
  const slug =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "-")
      .slice(0, 60)
      .replace(/^-|-$/g, "") || "asset";
  const ext = mimeType ? EXTENSIONS[mimeType.split(";")[0]!.trim().toLowerCase()] : undefined;
  return ext ? `${slug}.${ext}` : slug;
}

// File size in KB / MB for people (1 decimal under 10).
export function fileSize(bytes: number, locale: string): string {
  const units = [
    ["megabyte", 1024 * 1024],
    ["kilobyte", 1024],
  ] as const;
  for (const [unit, size] of units) {
    if (bytes >= size) {
      const value = bytes / size;
      return new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: "short",
        maximumFractionDigits: value < 10 ? 1 : 0,
      }).format(value);
    }
  }
  return new Intl.NumberFormat(locale, { style: "unit", unit: "byte", unitDisplay: "short" }).format(bytes);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// HTML for a banner that links through the tracked link, for blogs and websites.
export function bannerSnippet(input: {
  link: string;
  imageUrl: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}): string {
  const size = input.width && input.height ? ` width="${input.width}" height="${input.height}"` : "";
  return `<a href="${escapeHtml(input.link)}" rel="sponsored"><img src="${escapeHtml(input.imageUrl)}" alt="${escapeHtml(input.alt)}"${size}></a>`;
}

// Ready-to-post copy: the text, then the tracked link.
export function copySnippet(body: string | null | undefined, link: string): string {
  return body?.trim() ? `${body.trim()}\n\n${link}` : link;
}
