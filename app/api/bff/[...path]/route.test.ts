import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRefreshCache } from "@/src/lib/session/refresh";
import { GET, POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-1" },
  });
const ctx = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const request = (path: string, init: { method?: string; cookies?: string; origin?: string; body?: string } = {}) =>
  new NextRequest(`http://shop.test/api/bff/${path}`, {
    method: init.method ?? "GET",
    body: init.body,
    headers: {
      ...(init.cookies ? { cookie: init.cookies } : {}),
      ...(init.origin ? { origin: init.origin } : {}),
      "x-forwarded-for": "203.0.113.7",
      "content-type": "application/json",
    },
  });
const sent = (i: number) => {
  const [url, init] = fetchMock.mock.calls[i]!;
  return { url: String(url), headers: new Headers(init?.headers), method: init?.method };
};
const tokens = (n: number) => ({
  accessToken: `access-${n}`,
  accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
  refreshToken: `refresh-${n}`,
  refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  clearRefreshCache();
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("BFF proxy (ADR 0002)", () => {
  it("forwards storefront calls with the session token and context headers", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { type: "customer" }));
    const res = await GET(
      request("v1/store/auth/me?x=1", { cookies: "pe_at=access-1; pe_market=bn-bd" }),
      ctx("v1/store/auth/me"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const call = sent(0);
    expect(call.url).toBe("http://api.test/v1/store/auth/me?x=1");
    expect(call.headers.get("authorization")).toBe("Bearer access-1");
    expect(
      Object.fromEntries(["x-market", "x-locale", "x-channel", "x-forwarded-for"].map((h) => [h, call.headers.get(h)])),
    ).toEqual({ "x-market": "bd", "x-locale": "bn", "x-channel": "web", "x-forwarded-for": "203.0.113.7" });
  });

  it("refuses admin APIs, token-issuing auth calls and cross-site writes", async () => {
    expect((await GET(request("v1/admin/orders"), ctx("v1/admin/orders"))).status).toBe(404);
    expect((await POST(request("v1/store/auth/login", { method: "POST" }), ctx("v1/store/auth/login"))).status).toBe(
      404,
    );
    const cross = await POST(
      request("v1/store/carts", { method: "POST", origin: "https://evil.example" }),
      ctx("v1/store/carts"),
    );
    expect(cross.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired session once and retries", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { code: "TOKEN_EXPIRED", message: "expired" }))
      .mockResolvedValueOnce(json(200, tokens(2)))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const res = await GET(
      request("v1/store/account", { cookies: "pe_at=stale; pe_rt=refresh-1" }),
      ctx("v1/store/account"),
    );
    expect(res.status).toBe(200);
    expect(sent(1).url).toBe("http://api.test/v1/store/auth/refresh");
    expect(sent(2).headers.get("authorization")).toBe("Bearer access-2");
    expect(res.cookies.get("pe_at")?.value).toBe("access-2");
    expect(res.cookies.get("pe_rt")).toMatchObject({ value: "refresh-2", httpOnly: true });
  });

  it("signs out when the refresh token is refused", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { code: "UNAUTHENTICATED", message: "already used" }))
      .mockResolvedValueOnce(json(401, { code: "UNAUTHENTICATED", message: "Sign in required" }));
    const res = await GET(request("v1/store/account", { cookies: "pe_rt=refresh-1" }), ctx("v1/store/account"));
    expect(res.status).toBe(401);
    expect(sent(1).headers.get("authorization")).toBeNull();
    expect(res.cookies.get("pe_rt")?.value).toBe("");
    expect(res.cookies.get("pe_at")?.value).toBe("");
  });

  it("creates a guest token for cart calls from a new visitor", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { guestToken: "guest-1" }))
      .mockResolvedValueOnce(json(200, { id: "cart-1" }));
    const res = await POST(
      request("v1/store/carts", { method: "POST", origin: "http://shop.test", body: "{}" }),
      ctx("v1/store/carts"),
    );
    expect(res.status).toBe(200);
    expect(sent(0).url).toBe("http://api.test/v1/store/auth/guest");
    expect(sent(1).headers.get("authorization")).toBe("Bearer guest-1");
    expect(res.cookies.get("pe_guest")).toMatchObject({ value: "guest-1", httpOnly: true });
  });

  it("answers 502 in the API's error shape when the API is down", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const res = await GET(request("v1/store/config"), ctx("v1/store/config"));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "INTERNAL_ERROR" });
  });
});
