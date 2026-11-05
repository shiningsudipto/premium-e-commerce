import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

const req = (method: string, headers: Record<string, string> = {}) =>
  new Request("http://internal:3000/api/bff/v1/store/carts", { method, headers });

describe("CSRF origin check", () => {
  it("lets reads through and requires this site's origin for writes", () => {
    expect(isSameOriginRequest(req("GET", { origin: "https://evil.example" }), "https://shop.example")).toBe(true);
    expect(isSameOriginRequest(req("POST", { origin: "https://shop.example" }), "https://shop.example")).toBe(true);
    expect(isSameOriginRequest(req("POST", { origin: "https://evil.example" }), "https://shop.example")).toBe(false);
    expect(isSameOriginRequest(req("DELETE"), "https://shop.example")).toBe(false);
    expect(isSameOriginRequest(req("PATCH", { "sec-fetch-site": "same-origin" }), "https://shop.example")).toBe(true);
    expect(isSameOriginRequest(req("PATCH", { "sec-fetch-site": "cross-site" }), "https://shop.example")).toBe(false);
  });
});
