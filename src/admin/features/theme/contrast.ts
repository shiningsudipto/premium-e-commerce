// WCAG 2.x contrast checks for the theme editor (spec §9.2, §12.3). Pure functions so they can be
// tested; the API runs the same text-pair check when a theme is saved.

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isHexColor = (value: string) => HEX.test(value.trim());

// "#ABC" / "abc" / "#aabbcc" → "#aabbcc"; anything else → null.
export function normalizeHex(value: string): string | null {
  let v = value.trim().toLowerCase();
  if (!v.startsWith("#")) v = `#${v}`;
  if (!HEX.test(v)) return null;
  if (v.length === 4)
    v = `#${v
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("")}`;
  return v;
}

// Relative luminance (0 = black, 1 = white) of a hex colour.
export function relativeLuminance(hex: string): number {
  const full = normalizeHex(hex);
  if (!full) throw new Error(`Not a hex colour: ${hex}`);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contrast ratio between two colours, from 1 (identical) to 21 (black on white).
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// AA thresholds: 4.5:1 for body text, 3:1 for large text and UI shapes (buttons, focus rings).
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

export type PaletteKey =
  | "background"
  | "foreground"
  | "primary"
  | "primaryForeground"
  | "secondary"
  | "secondaryForeground"
  | "muted"
  | "mutedForeground"
  | "accent"
  | "accentForeground"
  | "border"
  | "destructive";

export type Palette = Record<PaletteKey, string>;

export type ContrastPair = {
  foreground: PaletteKey;
  background: PaletteKey;
  required: number;
  label: string;
};

// The pairs the storefront actually draws on top of each other.
export const CONTRAST_PAIRS: ContrastPair[] = [
  { foreground: "foreground", background: "background", required: AA_TEXT, label: "Body text on the page" },
  { foreground: "primaryForeground", background: "primary", required: AA_TEXT, label: "Primary button label" },
  {
    foreground: "secondaryForeground",
    background: "secondary",
    required: AA_TEXT,
    label: "Secondary button label",
  },
  { foreground: "mutedForeground", background: "background", required: AA_TEXT, label: "Muted text on the page" },
  { foreground: "mutedForeground", background: "muted", required: AA_TEXT, label: "Muted text on muted panels" },
  { foreground: "accentForeground", background: "accent", required: AA_TEXT, label: "Text on accent badges" },
  { foreground: "accent", background: "background", required: AA_TEXT, label: "Links on the page" },
  { foreground: "destructive", background: "background", required: AA_TEXT, label: "Error text on the page" },
  { foreground: "primary", background: "background", required: AA_LARGE, label: "Primary button against the page" },
];

export type ContrastResult = ContrastPair & {
  ratio: number;
  passes: boolean;
};

// Ratio for every pair, rounded to two decimals; pairs with an invalid colour are skipped.
export function checkContrast(palette: Palette, pairs: ContrastPair[] = CONTRAST_PAIRS): ContrastResult[] {
  return pairs.flatMap((pair) => {
    const fg = palette[pair.foreground];
    const bg = palette[pair.background];
    if (!fg || !bg || !isHexColor(fg) || !isHexColor(bg)) return [];
    const exact = contrastRatio(fg, bg);
    // rounded down, so a failing 4.496 never reads as "4.50:1"
    return [{ ...pair, ratio: Math.floor(exact * 100) / 100, passes: exact >= pair.required }];
  });
}

export const formatRatio = (ratio: number) => `${ratio.toFixed(2)}:1`;
