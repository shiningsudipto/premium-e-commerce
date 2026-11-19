import { describe, expect, it } from "vitest";
import {
  DEFAULT_FONT_STACKS,
  fontStackCss,
  googleFontsUrl,
  inlineCss,
  resolveFontStack,
  webFontFamilies,
  withBengaliFallback,
} from "./theme";

describe("theme helpers", () => {
  it("loads only web fonts named first in each stack", () => {
    expect(webFontFamilies("Inter, system-ui, sans-serif", "Fraunces, Georgia, serif", "Georgia, serif")).toEqual([
      "Inter",
    ]);
    expect(webFontFamilies("system-ui", "'Playfair Display', serif")).toEqual(["Playfair Display"]);
    expect(webFontFamilies("x;}</style>, serif")).toEqual([]);
    expect(googleFontsUrl(["Playfair Display"])).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
    );
    expect(googleFontsUrl([])).toBeNull();
  });

  it("points self-hosted families at their next/font variables and doesn't fetch them", () => {
    expect(resolveFontStack("Fraunces, Georgia, serif")).toBe("var(--font-fraunces), Georgia, serif");
    expect(resolveFontStack("'Figtree', system-ui")).toBe("var(--font-figtree), system-ui");
    expect(resolveFontStack("Lora, serif")).toBe("Lora, serif");
    expect(webFontFamilies("Figtree, sans-serif", "Lora, serif")).toEqual(["Lora"]);
    expect(fontStackCss("Figtree, sans-serif", "Lora, serif")).toBe(
      ":root { --font-body: var(--font-figtree), sans-serif; --font-heading: Lora, serif; }",
    );
  });

  it("adds the Bengali face after the first family on Bangla pages", () => {
    expect(withBengaliFallback("Lora, serif")).toBe("Lora, var(--font-bengali), serif");
    expect(fontStackCss("Figtree, sans-serif", "Lora, serif", { bengali: true })).toBe(
      ":root { --font-body: var(--font-figtree), var(--font-bengali), sans-serif; --font-heading: Lora, var(--font-bengali), serif; }",
    );
    expect(fontStackCss(DEFAULT_FONT_STACKS.fontBody, DEFAULT_FONT_STACKS.fontHeading, { bengali: true })).toContain(
      '--font-heading: var(--font-fraunces), var(--font-bengali), "Iowan Old Style", Georgia, serif;',
    );
  });

  it("can't close the inline style element", () => {
    expect(inlineCss("a{color:red}</style><script>x</script>")).toBe("a{color:red}<\\/style><script>x</script>");
    expect(inlineCss("a{}</STYLE >")).toBe("a{}<\\/STYLE >");
  });
});
