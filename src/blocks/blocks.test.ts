import { describe, expect, it } from "vitest";
import { artFor } from "../components/storefront/art";
import { swatchColor } from "../components/storefront/primitives";
import { toMenuLinks, type ProductSummary } from "../lib/catalog";
import { remaining } from "./offer/offer-timer";
import { badgeFor } from "./product-shelf/product-card";

const market = { segment: "en-bd", locale: "en", market: "bd" };

const product = (over: Partial<ProductSummary> = {}): ProductSummary => ({
  id: "p1",
  handle: "kawran-tote",
  title: "Kawran Tote",
  vendor: null,
  tags: [],
  images: [],
  price: { currency: "BDT", minMinor: 1250000, maxMinor: 1250000, compareAtMinor: null },
  swatches: ["Tan"],
  availableForSale: true,
  variantCount: 1,
  ...over,
});

describe("header navigation from the admin's menu", () => {
  it("links categories, collections, pages and URLs under the market, skipping malformed items", () => {
    const links = toMenuLinks(
      [
        {
          label: "Bags",
          type: "category",
          ref: "bags",
          children: [{ label: "Travel", type: "category", ref: "travel-bags" }],
        },
        { label: "Leather goods", type: "collection", ref: "leather-goods" },
        { label: "Journal", type: "url", url: "https://journal.example.com" },
        { label: "Broken", type: "category" },
        { type: "page", ref: "about" },
        "nonsense",
      ],
      market,
    );
    expect(links).toEqual([
      {
        label: "Bags",
        href: "/en-bd/categories/bags",
        children: [{ label: "Travel", href: "/en-bd/categories/travel-bags", children: [] }],
      },
      { label: "Leather goods", href: "/en-bd/collections/leather-goods", children: [] },
      { label: "Journal", href: "https://journal.example.com", children: [] },
    ]);
    expect(toMenuLinks(null, market)).toEqual([]);
  });
});

describe("product cards", () => {
  it("picks placeholder art from the product's words", () => {
    expect(artFor("Leather Weekender Bag")).toBe("weekender");
    expect(artFor("Leather Card Wallet")).toBe("card");
    expect(artFor("Classic Bifold Wallet")).toBe("wallet");
    expect(artFor("Heritage Belt, 35 mm")).toBe("belt");
    expect(artFor("Something else", "bag")).toBe("tote");
    expect(artFor("Mystery")).toBe("tote");
  });

  it("badges sold-out, sale and new products, in that order", () => {
    expect(badgeFor(product())).toBeNull();
    expect(badgeFor(product({ tags: ["New"] }))).toEqual({ label: "New", kind: "new" });
    expect(
      badgeFor(
        product({
          price: { currency: "BDT", minMinor: 323000, maxMinor: 323000, compareAtMinor: 380000 },
          tags: ["new"],
        }),
      ),
    ).toEqual({ label: "−15%", kind: "sale" });
    expect(badgeFor(product({ availableForSale: false, tags: ["new"] }))).toEqual({ label: "Sold out", kind: "out" });
  });

  it("colours catalog swatch names, with a neutral for unknown ones", () => {
    expect(swatchColor("Tan")).toBe("var(--swatch-tan)");
    expect(swatchColor(" navy ")).toBe("var(--swatch-navy)");
    expect(swatchColor("Olive")).toBe("var(--swatch-default)");
  });
});

describe("offer countdown", () => {
  it("splits the time left into days, hours and minutes, and ends at zero", () => {
    const now = Date.parse("2026-12-18T20:30:00+06:00");
    expect(remaining("2026-12-20T23:59:00+06:00", now)).toEqual({ over: false, days: 2, hours: 3, minutes: 29 });
    expect(remaining("2026-12-18T20:30:00+06:00", now).over).toBe(true);
    expect(remaining("not a date", now).over).toBe(true);
  });
});
