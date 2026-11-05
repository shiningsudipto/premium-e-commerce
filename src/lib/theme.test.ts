import { describe, expect, it } from "vitest";
import { fontStackCss, googleFontsUrl, inlineCss, resolveFontStack, webFontFamilies } from "./theme";

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

  it("can't close the inline style element", () => {
    expect(inlineCss("a{color:red}</style><script>x</script>")).toBe("a{color:red}<\\/style><script>x</script>");
    expect(inlineCss("a{}</STYLE >")).toBe("a{}<\\/STYLE >");
  });
});
