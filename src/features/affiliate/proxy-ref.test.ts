import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { affiliateRefRedirect } from "./proxy-ref";
import { parseReferral, REF_COOKIE } from "./referral";

const fetchMock = vi.fn<typeof fetch>();
const market = { segment: "en-bd", market: "bd", locale: "en" };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 202 }));
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const request = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://shop.test${path}`, { headers });

describe("affiliate ?ref= handling in the proxy", () => {
  it("leaves URLs without ref alone", () => {
    expect(affiliateRefRedirect(request("/en-bd/products?sub=x"), undefined, market)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to the clean URL, sets the cookie and reports the click in the background", async () => {
    const waitUntil = vi.fn();
    const res = affiliateRefRedirect(
      request("/en-bd/products?sort=new&ref=anna&sub=ig&asset=a1", {
        "user-agent": "UA",
        "x-forwarded-for": "203.0.113.9",
      }),
      { waitUntil },
      market,
    )!;
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://shop.test/en-bd/products?sort=new");
    const cookie = res.cookies.get(REF_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(parseReferral(cookie.value)?.last).toMatchObject({ code: "ANNA", subId: "ig", assetId: "a1" });

    expect(waitUntil).toHaveBeenCalledOnce();
    await waitUntil.mock.calls[0]![0];
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/v1/store/affiliate/click");
    expect(JSON.parse(init!.body as string)).toEqual({
      code: "ANNA",
      subId: "ig",
      assetId: "a1",
      path: "/en-bd/products",
    });
    const headers = init!.headers as Record<string, string>;
    expect(headers["x-market"]).toBe("bd");
    expect(headers["x-forwarded-for"]).toBe("203.0.113.9");
    expect(headers["user-agent"]).toBe("UA");
  });

  it("keeps the first referral from an earlier click", () => {
    const first = affiliateRefRedirect(request("/en-bd?ref=FIRST"), undefined, market)!;
    const cookie = first.cookies.get(REF_COOKIE)!.value;
    const second = affiliateRefRedirect(
      request("/en-bd?ref=SECOND", { cookie: `${REF_COOKIE}=${encodeURIComponent(cookie)}` }),
      undefined,
      market,
    )!;
    const referral = parseReferral(second.cookies.get(REF_COOKIE)!.value)!;
    expect(referral.first.code).toBe("FIRST");
    expect(referral.last.code).toBe("SECOND");
  });

  it("never lets a failing beacon break the redirect", async () => {
    fetchMock.mockRejectedValue(new Error("API down"));
    const waitUntil = vi.fn();
    const res = affiliateRefRedirect(request("/en-bd?ref=ANNA"), { waitUntil }, market)!;
    expect(res.status).toBe(307);
    await expect(waitUntil.mock.calls[0]![0]).resolves.toBeUndefined();
  });

  it("strips a malformed code without remembering or reporting it", () => {
    const res = affiliateRefRedirect(request("/en-bd/products?ref=%3Cx%3E&page=2"), undefined, market)!;
    expect(res.headers.get("location")).toBe("http://shop.test/en-bd/products?page=2");
    expect(res.cookies.get(REF_COOKIE)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
