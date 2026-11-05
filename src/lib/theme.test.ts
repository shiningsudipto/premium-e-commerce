import { describe, expect, it } from "vitest";
import { googleFontsUrl, inlineCss, webFontFamilies } from "./theme";

describe("theme helpers", () => {
  it("loads only web fonts named first in each stack", () => {
    expect(webFontFamilies("Inter, system-ui, sans-serif", "Fraunces, Georgia, serif", "Georgia, serif")).toEqual([
      "Inter",
      "Fraunces",
    ]);
    expect(webFontFamilies("system-ui", "'Playfair Display', serif")).toEqual(["Playfair Display"]);
    expect(webFontFamilies("x;}</style>, serif")).toEqual([]);
    expect(googleFontsUrl(["Playfair Display"])).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
    );
    expect(googleFontsUrl([])).toBeNull();
  });

  it("can't close the inline style element", () => {
    expect(inlineCss("a{color:red}</style><script>x</script>")).toBe("a{color:red}<\\/style><script>x</script>");
    expect(inlineCss("a{}</STYLE >")).toBe("a{}<\\/STYLE >");
  });
});
