import type { GetV1AdminThemesIdApiResponse } from "../../store/api.generated";
import { isHexColor, type Palette, type PaletteKey } from "./contrast";

// Theme tokens (spec §9.2) as the API stores them, and how the storefront turns them into CSS
// custom properties (mirrors cssVariables() in the API's themes engine).
export type ThemeTokens = GetV1AdminThemesIdApiResponse["tokens"];
export type ButtonRadius = ThemeTokens["buttons"]["radius"];
export type ColorMode = "light" | "dark";

export const PALETTE_FIELDS: { key: PaletteKey; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "Page background" },
  { key: "foreground", label: "Text", hint: "Body text and headings" },
  { key: "primary", label: "Primary", hint: "Main buttons" },
  { key: "primaryForeground", label: "Primary text", hint: "Labels on primary buttons" },
  { key: "secondary", label: "Secondary", hint: "Secondary buttons and panels" },
  { key: "secondaryForeground", label: "Secondary text", hint: "Text on secondary surfaces" },
  { key: "muted", label: "Muted", hint: "Subtle panels" },
  { key: "mutedForeground", label: "Muted text", hint: "Captions and hints" },
  { key: "accent", label: "Accent", hint: "Links, badges and focus rings" },
  { key: "accentForeground", label: "Accent text", hint: "Text on accent badges" },
  { key: "border", label: "Border", hint: "Dividers and inputs" },
  { key: "destructive", label: "Destructive", hint: "Errors and sale prices" },
];

export const BUTTON_RADII: { value: ButtonRadius; label: string }[] = [
  { value: "none", label: "Square" },
  { value: "sm", label: "Small radius" },
  { value: "md", label: "Medium radius" },
  { value: "lg", label: "Large radius" },
  { value: "full", label: "Pill" },
];

// A neutral, AA-compliant starting point for a brand-new theme.
export function defaultTokens(): ThemeTokens {
  return {
    colors: {
      background: "#ffffff",
      foreground: "#1f1f1f",
      primary: "#1f1f1f",
      primaryForeground: "#ffffff",
      secondary: "#f2f2f2",
      secondaryForeground: "#1f1f1f",
      muted: "#f2f2f2",
      mutedForeground: "#595959",
      accent: "#005f73",
      accentForeground: "#ffffff",
      border: "#e0e0e0",
      destructive: "#b42318",
    },
    typography: {
      fontBody: '"Segoe UI", system-ui, sans-serif',
      fontHeading: "Georgia, serif",
      baseSizePx: 16,
      scale: 1.25,
    },
    radius: { sm: 2, md: 4, lg: 10 },
    spacing: { unitPx: 4 },
    shadows: {},
    buttons: { radius: "md", uppercase: false },
  };
}

// The colours in effect for a mode: dark mode overrides only the colours it names.
export function paletteFor(tokens: ThemeTokens, mode: ColorMode): Palette {
  if (mode === "light" || !tokens.dark) return tokens.colors;
  const overrides = Object.fromEntries(Object.entries(tokens.dark.colors).filter(([, v]) => !!v));
  return { ...tokens.colors, ...overrides };
}

// Sets one colour. In dark mode an empty value removes the override (falls back to light).
export function setColor(tokens: ThemeTokens, mode: ColorMode, key: PaletteKey, value: string): ThemeTokens {
  if (mode === "light") return { ...tokens, colors: { ...tokens.colors, [key]: value } };
  const colors = { ...(tokens.dark?.colors ?? {}) };
  if (value) colors[key] = value;
  else delete colors[key];
  return { ...tokens, dark: { colors } };
}

// Turns dark mode on (with no overrides yet) or off (dropping every override).
export function setDarkMode(tokens: ThemeTokens, enabled: boolean): ThemeTokens {
  if (enabled) return tokens.dark ? tokens : { ...tokens, dark: { colors: {} } };
  const rest = { ...tokens };
  delete rest.dark;
  return rest;
}

export const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const buttonRadius = (radius: ButtonRadius) =>
  radius === "none" ? "0px" : radius === "full" ? "9999px" : `var(--radius-${radius})`;

// CSS custom properties for a preview element: the same names the storefront's root layout
// sets, plus the derived button radius/case the storefront reads from tokens.buttons.
export function themeCssVariables(tokens: ThemeTokens, mode: ColorMode = "light"): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(paletteFor(tokens, mode))) vars[`--color-${kebab(k)}`] = v;
  vars["--font-body"] = tokens.typography.fontBody;
  vars["--font-heading"] = tokens.typography.fontHeading;
  vars["--font-size-base"] = `${tokens.typography.baseSizePx}px`;
  vars["--type-scale"] = String(tokens.typography.scale);
  vars["--radius-sm"] = `${tokens.radius.sm}px`;
  vars["--radius-md"] = `${tokens.radius.md}px`;
  vars["--radius-lg"] = `${tokens.radius.lg}px`;
  vars["--spacing-unit"] = `${tokens.spacing.unitPx}px`;
  for (const [k, v] of Object.entries(tokens.shadows)) vars[`--shadow-${kebab(k)}`] = v;
  vars["--button-radius"] = buttonRadius(tokens.buttons.radius);
  vars["--button-transform"] = tokens.buttons.uppercase ? "uppercase" : "none";
  return vars;
}

// Heading size n steps up the type scale, in px (h3 = 1 step, h1 = 3).
export const scaledSize = (tokens: ThemeTokens, steps: number) =>
  Math.round(tokens.typography.baseSizePx * tokens.typography.scale ** steps * 10) / 10;

const inRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

// Field errors keyed by token path ("colors.primary", "typography.scale"), mirroring the API's
// limits so a theme isn't sent only to be refused.
export function validateTokens(tokens: ThemeTokens): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens.colors))
    if (!isHexColor(v)) errors[`colors.${k}`] = "Use a hex colour like #1a1a1a";
  for (const [k, v] of Object.entries(tokens.dark?.colors ?? {}))
    if (v && !isHexColor(v)) errors[`dark.${k}`] = "Use a hex colour like #1a1a1a";
  const fonts = [
    ["typography.fontBody", tokens.typography.fontBody],
    ["typography.fontHeading", tokens.typography.fontHeading],
  ] as const;
  for (const [path, value] of fonts)
    if (!value.trim() || value.length > 200) errors[path] = "Enter a font stack of up to 200 characters";
  if (!inRange(tokens.typography.baseSizePx, 12, 22)) errors["typography.baseSizePx"] = "Between 12 and 22";
  if (!inRange(tokens.typography.scale, 1, 1.6)) errors["typography.scale"] = "Between 1 and 1.6";
  if (!inRange(tokens.radius.sm, 0, 32)) errors["radius.sm"] = "Between 0 and 32";
  if (!inRange(tokens.radius.md, 0, 32)) errors["radius.md"] = "Between 0 and 32";
  if (!inRange(tokens.radius.lg, 0, 48)) errors["radius.lg"] = "Between 0 and 48";
  if (!inRange(tokens.spacing.unitPx, 2, 8)) errors["spacing.unitPx"] = "Between 2 and 8";
  return errors;
}

// A handle for a copy that doesn't clash: "summer" → "summer-copy", "summer-copy-2", …
export function copyHandle(handle: string, taken: readonly string[]): string {
  const base = `${handle}-copy`;
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
