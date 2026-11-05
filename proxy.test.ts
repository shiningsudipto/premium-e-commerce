import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRefreshCache } from "./src/lib/session/refresh";
import { proxy } from "./proxy";

const fetchMock = vi.fn<typeof fetch>();
const markets = [
  { handle: "bd", name: "Bangladesh", currency: "BDT", defaultLocale: "en", locales: ["en", "bn"], countries: ["BD"] },
  { handle: "in", name: "India", currency: "INR", defaultLocale: "en", locales: ["en"], countries: ["IN"] },
];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const visit = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`http://shop.test${path}`, { headers }));
const location = async (path: string, headers?: Record<string, string>) =>
  (await visit(path, headers)).headers.get("location");

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  delete (globalThis as { __peMarkets?: unknown }).__peMarkets;
  clearRefreshCache();
  fetchMock.mockImplementation(async (url) =>
    String(url).endsWith("/v1/store/markets") ? json(200, markets) : json(404, {}),
  );
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("proxy.ts (spec §3.3)", () => {
  it("adds the market prefix from the cookie, then the country, then the default", async () => {
    expect(await location("/products/bag?color=tan", { cookie: "pe_market=bn-bd" })).toBe(
      "http://shop.test/bn-bd/products/bag?color=tan",
    );
    expect(await location("/", { "cf-ipcountry": "IN" })).toBe("http://shop.test/en-in");
    expect(await location("/")).toBe("http://shop.test/en-bd");
    // a locale the market doesn't offer counts as no prefix
    expect(await location("/bn-in/x")).toBe("http://shop.test/en-bd/bn-in/x");
  });

  it("passes the market, locale, channel and a correlation ID downstream and remembers the market", async () => {
    const res = await visit("/bn-bd/products");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-request-x-market-segment")).toBe("bn-bd");
    expect(res.headers.get("x-middleware-request-x-locale")).toBe("bn");
    expect(res.headers.get("x-middleware-request-x-channel")).toBe("web");
    expect(res.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.cookies.get("pe_market")?.value).toBe("bn-bd");
  });

  it("refreshes an expired access token before rendering", async () => {
    const tokens = {
      accessToken: "a2",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
      refreshToken: "r2",
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    fetchMock.mockImplementation(async (url) =>
      String(url).endsWith("/markets") ? json(200, markets) : json(200, tokens),
    );
    const res = await visit("/en-bd", { cookie: "pe_rt=r1; pe_market=en-bd" });
    expect(res.cookies.get("pe_at")?.value).toBe("a2");
    expect(res.headers.get("x-middleware-request-cookie")).toContain("pe_at=a2");
  });

  it("falls back to the default market when the API is unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await location("/en-bd")).toBeNull();
    expect(await location("/")).toBe("http://shop.test/en-bd");
  });
});
