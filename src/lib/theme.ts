// Turns the active theme's tokens into what the root layout needs: font stacks that use the
// self-hosted fonts where possible, a stylesheet URL for any other web fonts the tokens name,
// and CSS that is safe to inline in a <style> element.

// Families bundled with next/font in the root layout (no layout shift, no third-party request).
// The theme names them by family, but next/font's @font-face names differ, so stacks are rewritten.
export const SELF_HOSTED_FONTS: Record<string, string> = {
  fraunces: "var(--font-fraunces)",
  figtree: "var(--font-figtree)",
};

// Families the browser already has.
const LOCAL_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "arial",
  "helvetica",
  "helvetica neue",
  "georgia",
  "iowan old style",
  "times",
  "times new roman",
  "courier",
  "courier new",
  "verdana",
  "tahoma",
  "segoe ui",
]);

const firstFamily = (stack: string) => (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");

// "Fraunces, Georgia, serif" → "var(--font-fraunces), Georgia, serif"
export function resolveFontStack(stack: string): string {
  const hosted = SELF_HOSTED_FONTS[firstFamily(stack).toLowerCase()];
  if (!hosted) return stack;
  return [
    hosted,
    ...stack
      .split(",")
      .slice(1)
      .map((s) => s.trim()),
  ].join(", ");
}

// Bangla pages: the theme's Latin faces have no Bengali glyphs, so a self-hosted Bengali face
// (next/font, bengali subset only, see the root layout) goes right after each stack's first family.
// Latin text keeps the theme's face; Bengali text gets Noto Sans Bengali instead of whatever the
// device has. The browser fetches it only when Bengali characters are on the page (unicode-range).
export const BENGALI_FONT = "var(--font-bengali)";

// The stacks app/globals.css uses before a theme is activated.
export const DEFAULT_FONT_STACKS = {
  fontBody: 'Figtree, "Segoe UI", system-ui, sans-serif',
  fontHeading: 'Fraunces, "Iowan Old Style", Georgia, serif',
};

// "var(--font-figtree), system-ui" → "var(--font-figtree), var(--font-bengali), system-ui"
export function withBengaliFallback(stack: string): string {
  const [first = "", ...rest] = stack.split(",").map((s) => s.trim());
  return [first, BENGALI_FONT, ...rest].filter(Boolean).join(", ");
}

// Overrides the theme's --font-body / --font-heading so self-hosted families resolve, and on
// Bangla pages so Bengali text has a matching face.
export function fontStackCss(fontBody: string, fontHeading: string, options: { bengali?: boolean } = {}): string {
  const stack = (s: string) => (options.bengali ? withBengaliFallback(resolveFontStack(s)) : resolveFontStack(s));
  return `:root { --font-body: ${stack(fontBody)}; --font-heading: ${stack(fontHeading)}; }`;
}

// Families to fetch from Google Fonts: the first of each stack, unless local or self-hosted.
export function webFontFamilies(...stacks: string[]): string[] {
  const families = stacks.flatMap((stack) => {
    const first = firstFamily(stack);
    const key = first.toLowerCase();
    return first && !LOCAL_FAMILIES.has(key) && !SELF_HOSTED_FONTS[key] && /^[\w\s-]+$/.test(first) ? [first] : [];
  });
  return [...new Set(families)];
}

// Regular and bold of each family; the theme names families, not weights.
export function googleFontsUrl(families: string[]): string | null {
  if (!families.length) return null;
  const params = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

// The API already refuses <style>/<script> tags in custom CSS; this also stops anything from
// closing the inline <style> element early.
export const inlineCss = (css: string) => css.replace(/<\/(style)/gi, "<\\/$1");
