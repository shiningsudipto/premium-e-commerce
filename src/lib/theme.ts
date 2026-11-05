// Turns the active theme's tokens into what the root layout needs: a stylesheet URL for the
// web fonts the tokens name, and CSS that is safe to inline in a <style> element.

// Families the browser already has; everything else is loaded from Google Fonts.
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
  "times",
  "times new roman",
  "courier",
  "courier new",
  "verdana",
  "tahoma",
  "segoe ui",
]);

export function webFontFamilies(...stacks: string[]): string[] {
  const families = stacks.flatMap((stack) => {
    const first = stack
      .split(",")[0]
      ?.trim()
      .replace(/^["']|["']$/g, "");
    return first && !LOCAL_FAMILIES.has(first.toLowerCase()) && /^[\w\s-]+$/.test(first) ? [first] : [];
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
