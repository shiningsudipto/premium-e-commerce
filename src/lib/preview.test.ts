import { describe, expect, it } from "vitest";
import { parsePreviewRequest } from "./preview";

const token = "eyJhbGciOiJIUzI1NiJ9.payload.signature";
const url = (q: string) => new URL(`https://shop.test/api/preview?${q}`);

describe("parsePreviewRequest", () => {
  it("reads the page handle, token and market", () => {
    expect(parsePreviewRequest(url(`handle=about-us&token=${token}&market=en-bd`))).toEqual({
      handle: "about-us",
      token,
      segment: "en-bd",
    });
    expect(parsePreviewRequest(url(`handle=about&token=${token}`))?.segment).toBeNull();
  });

  it("refuses malformed handles and tokens before asking the API", () => {
    expect(parsePreviewRequest(url(`token=${token}`))).toBeNull();
    expect(parsePreviewRequest(url(`handle=../admin&token=${token}`))).toBeNull();
    expect(parsePreviewRequest(url(`handle=About&token=${token}`))).toBeNull();
    expect(parsePreviewRequest(url("handle=about&token=short"))).toBeNull();
    expect(parsePreviewRequest(url(`handle=about&token=${encodeURIComponent("a b".repeat(10))}`))).toBeNull();
  });
});
