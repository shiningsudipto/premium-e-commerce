import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const call = (action: string, body: unknown, cookies = "") =>
  POST(
    new NextRequest(`http://shop.test/api/auth/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        origin: "http://shop.test",
        "content-type": "application/json",
        ...(cookies ? { cookie: cookies } : {}),
      },
    }),
    { params: Promise.resolve({ action }) },
  );

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("BFF sign-in and sign-out", () => {
  it("keeps tokens in httpOnly cookies and returns only the customer ID", async () => {
    const session = {
      accessToken: "a",
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
      refreshToken: "r",
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
    fetchMock.mockResolvedValueOnce(json(200, { customerId: "c1", session }));
    const res = await call("login", { email: "a@b.co", password: "x" });
    expect(await res.json()).toEqual({ customerId: "c1" });
    expect(res.cookies.get("pe_at")).toMatchObject({ value: "a", httpOnly: true, sameSite: "lax" });
    expect(res.cookies.get("pe_rt")).toMatchObject({ value: "r", httpOnly: true });
  });

  it("passes API errors through without setting cookies", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { code: "INVALID_CREDENTIALS", message: "Wrong email or password" }));
    const res = await call("login", { email: "a@b.co", password: "x" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(res.cookies.getAll()).toHaveLength(0);
  });

  it("revokes the refresh token and clears the cookies on sign-out", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
    const res = await call("logout", {}, "pe_at=a; pe_rt=r");
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))).toEqual({ refreshToken: "r" });
    expect(res.cookies.get("pe_at")?.value).toBe("");
    expect(res.cookies.get("pe_rt")?.value).toBe("");
  });
});
