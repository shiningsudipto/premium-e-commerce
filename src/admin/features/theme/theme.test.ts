import { describe, expect, it } from "vitest";
import { AA_LARGE, checkContrast, contrastRatio, formatRatio, normalizeHex, relativeLuminance } from "./contrast";
import {
  copyHandle,
  defaultTokens,
  paletteFor,
  scaledSize,
  setColor,
  setDarkMode,
  themeCssVariables,
  validateTokens,
} from "./tokens";

describe("contrast", () => {
  it("normalizes hex colours", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("1a2b3c")).toBe("#1a2b3c");
    expect(normalizeHex(" #FFFFFF ")).toBe("#ffffff");
    expect(normalizeHex("#abcd")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
  });

  it("computes luminance and WCAG ratios", () => {
    expect(relativeLuminance("#000")).toBe(0);
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 10);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777", "#777")).toBe(1);
    // well-known reference values
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(() => relativeLuminance("nope")).toThrow();
  });

  it("checks the pairs that matter", () => {
    const palette = { ...defaultTokens().colors, mutedForeground: "#777777", primary: "#dddddd" };
    const results = checkContrast(palette);
    const muted = results.find((r) => r.foreground === "mutedForeground" && r.background === "background");
    expect(muted).toMatchObject({ passes: false, required: 4.5, ratio: 4.47 });
    const button = results.find((r) => r.foreground === "primary" && r.background === "background");
    expect(button).toMatchObject({ passes: false, required: AA_LARGE });
    expect(results.find((r) => r.foreground === "foreground")?.passes).toBe(true);
    expect(checkContrast(defaultTokens().colors).every((r) => r.passes)).toBe(true);
  });

  it("skips invalid colours and rounds down", () => {
    const palette = { ...defaultTokens().colors, foreground: "#12" };
    expect(checkContrast(palette).some((r) => r.foreground === "foreground")).toBe(false);
    expect(formatRatio(4.5)).toBe("4.50:1");
  });
});

describe("theme tokens", () => {
  it("maps tokens to the storefront's CSS variables", () => {
    const tokens = { ...defaultTokens(), shadows: { cardHover: "0 1px 2px #0002" } };
    const vars = themeCssVariables(tokens);
    expect(vars["--color-primary-foreground"]).toBe("#ffffff");
    expect(vars["--color-muted-foreground"]).toBe("#595959");
    expect(vars["--font-size-base"]).toBe("16px");
    expect(vars["--radius-lg"]).toBe("10px");
    expect(vars["--spacing-unit"]).toBe("4px");
    expect(vars["--shadow-card-hover"]).toBe("0 1px 2px #0002");
    expect(vars["--button-radius"]).toBe("var(--radius-md)");
    expect(themeCssVariables({ ...tokens, buttons: { radius: "full", uppercase: true } })).toMatchObject({
      "--button-radius": "9999px",
      "--button-transform": "uppercase",
    });
  });

  it("applies dark overrides on top of the light palette", () => {
    let tokens = setDarkMode(defaultTokens(), true);
    expect(tokens.dark).toEqual({ colors: {} });
    tokens = setColor(tokens, "dark", "background", "#111111");
    expect(paletteFor(tokens, "dark").background).toBe("#111111");
    expect(paletteFor(tokens, "dark").primary).toBe(tokens.colors.primary);
    expect(paletteFor(tokens, "light").background).toBe("#ffffff");
    expect(themeCssVariables(tokens, "dark")["--color-background"]).toBe("#111111");
    tokens = setColor(tokens, "dark", "background", "");
    expect(tokens.dark).toEqual({ colors: {} });
    expect(setDarkMode(tokens, false).dark).toBeUndefined();
    expect(setColor(defaultTokens(), "light", "primary", "#000000").colors.primary).toBe("#000000");
  });

  it("validates like the API", () => {
    expect(validateTokens(defaultTokens())).toEqual({});
    const bad = defaultTokens();
    bad.colors.primary = "blue";
    bad.typography.scale = 2;
    bad.radius.lg = 60;
    bad.spacing.unitPx = 1;
    bad.typography.fontBody = " ";
    expect(Object.keys(validateTokens(bad)).sort()).toEqual([
      "colors.primary",
      "radius.lg",
      "spacing.unitPx",
      "typography.fontBody",
      "typography.scale",
    ]);
  });

  it("scales headings and names copies", () => {
    expect(scaledSize(defaultTokens(), 0)).toBe(16);
    expect(scaledSize(defaultTokens(), 2)).toBe(25);
    expect(copyHandle("summer", [])).toBe("summer-copy");
    expect(copyHandle("summer", ["summer-copy", "summer-copy-2"])).toBe("summer-copy-3");
  });
});
