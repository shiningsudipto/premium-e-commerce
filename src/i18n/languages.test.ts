import { describe, expect, it } from "vitest";
import { languageName, localizedPath, marketLanguages } from "./languages";

describe("storefront languages", () => {
  it("links to the same page and query in another language", () => {
    expect(localizedPath("/en-bd/products/bag", "colour=red&size=m", "bn", "bd")).toBe(
      "/bn-bd/products/bag?colour=red&size=m",
    );
    expect(localizedPath("/bn-bd/search", "?q=bag", "en", "bd")).toBe("/en-bd/search?q=bag");
    expect(localizedPath("/en-bd", "", "bn", "bd")).toBe("/bn-bd");
    expect(localizedPath("/en-bd/", "", "bn", "bd")).toBe("/bn-bd");
    // no market segment: that language's home page
    expect(localizedPath("/", "", "bn", "bd")).toBe("/bn-bd");
  });

  it("offers the languages the market has, in switcher order, named in their own language", () => {
    expect(marketLanguages(["bn", "en", "fr"])).toEqual(["en", "bn"]);
    expect(marketLanguages(["en"])).toEqual(["en"]);
    expect(languageName("bn")).toBe("বাংলা");
    expect(languageName("fr")).toBe("FR");
  });
});
