import { describe, expect, it } from "vitest";
import { bannerSnippet, copySnippet, downloadName, fileFormat, fileSize, trackedUrl } from "./assets";
import { statusTone } from "./status";

describe("marketing asset helpers", () => {
  it("adds the market prefix to the API's tracked path", () => {
    expect(trackedUrl("https://shop.example", "/en-bd", "/products/lamp?ref=ABC&asset=a1")).toBe(
      "https://shop.example/en-bd/products/lamp?ref=ABC&asset=a1",
    );
    expect(trackedUrl("https://shop.example", "/en-bd", "/?ref=ABC&asset=a1")).toBe(
      "https://shop.example/en-bd?ref=ABC&asset=a1",
    );
  });

  it("names file formats and download files", () => {
    expect(fileFormat("image/png")).toBe("PNG");
    expect(fileFormat("image/jpeg; charset=binary")).toBe("JPG");
    expect(fileFormat("application/x-thing")).toBe("X-THING");
    expect(fileFormat(null)).toBeNull();
    expect(downloadName("Eid Sale — Banner 1200×628!", "image/webp")).toBe("eid-sale-banner-1200628.webp");
    expect(downloadName("***", undefined)).toBe("asset");
  });

  it("formats file sizes", () => {
    expect(fileSize(512, "en")).toBe("512 byte");
    expect(fileSize(1536, "en")).toBe("1.5 kB");
    expect(fileSize(25 * 1024 * 1024, "en")).toBe("25 MB");
  });

  it("builds escaped snippets", () => {
    expect(
      bannerSnippet({
        link: "https://s/x?ref=A&asset=1",
        imageUrl: "https://cdn/b.png",
        alt: 'Eid "sale"',
        width: 300,
        height: 250,
      }),
    ).toBe(
      '<a href="https://s/x?ref=A&amp;asset=1" rel="sponsored"><img src="https://cdn/b.png" alt="Eid &quot;sale&quot;" width="300" height="250"></a>',
    );
    expect(copySnippet(" Lamps for every room. ", "https://s/l")).toBe("Lamps for every room.\n\nhttps://s/l");
    expect(copySnippet(null, "https://s/l")).toBe("https://s/l");
  });

  it("maps statuses to tones", () => {
    expect(statusTone("PAID")).toBe("done");
    expect(statusTone("DRAFT")).toBe("warn");
    expect(statusTone("REVERSED")).toBe("stop");
    expect(statusTone("ARCHIVED")).toBe("stop");
    expect(statusTone("SOMETHING")).toBeNull();
  });
});
