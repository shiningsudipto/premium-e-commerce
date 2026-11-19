import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../../../proxy";

// proxy.ts step 6: the anonymous visitor ID behind A/B buckets.

const fetchMock = vi.fn<typeof fetch>();
const markets = [
  { handle: "bd", name: "Bangladesh", currency: "BDT", defaultLocale: "en", locales: ["en", "bn"], countries: ["BD"] },
];
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const visit = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`http://shop.test${path}`, { headers }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  delete (globalThis as { __peMarkets?: unknown }).__peMarkets;
  fetchMock.mockImplementation(async (url) =>
    String(url).endsWith("/v1/store/markets") ? json(200, markets) : json(404, {}),
  );
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("proxy.ts visitor ID", () => {
  it("gives a first visit an httpOnly ID cookie and passes it to this render", async () => {
    const res = await visit("/en-bd/pages/about");
    const cookie = res.cookies.get("pe_vid");
    expect(cookie?.value).toMatch(/^[0-9a-f]{32}$/);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(res.headers.get("x-middleware-request-cookie")).toContain(`pe_vid=${cookie!.value}`);
  });

  it("keeps an existing ID without setting the cookie again", async () => {
    const res = await visit("/en-bd", { cookie: "pe_vid=abcdef1234567890; pe_market=en-bd" });
    expect(res.cookies.get("pe_vid")).toBeUndefined();
  });

  it("replaces a malformed ID", async () => {
    const res = await visit("/en-bd", { cookie: "pe_vid=bad; pe_market=en-bd" });
    expect(res.cookies.get("pe_vid")?.value).toMatch(/^[0-9a-f]{32}$/);
  });

  it("doesn't set it on redirects", async () => {
    const res = await visit("/products");
    expect(res.headers.get("location")).toContain("/en-bd/products");
    expect(res.cookies.get("pe_vid")).toBeUndefined();
  });
});
