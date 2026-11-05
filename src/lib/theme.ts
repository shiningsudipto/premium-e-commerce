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

// Overrides the theme's --font-body / --font-heading so self-hosted families resolve.
export function fontStackCss(fontBody: string, fontHeading: string): string {
  return `:root { --font-body: ${resolveFontStack(fontBody)}; --font-heading: ${resolveFontStack(fontHeading)}; }`;
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
