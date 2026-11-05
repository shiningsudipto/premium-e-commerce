import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "@/proxy";
import { clearRefreshCache } from "@/src/lib/session/refresh";

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown, setCookies: string[] = []) => {
  const headers = new Headers({ "content-type": "application/json" });
  for (const c of setCookies) headers.append("set-cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
};
const visit = (path: string, cookie = "") =>
  proxy(new NextRequest(`http://shop.test${path}`, { headers: cookie ? { cookie } : {} })) as Promise<NextResponse>;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  clearRefreshCache();
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("proxy.ts for /admin", () => {
  it("sends signed-out visitors to sign-in and back afterwards, without a market prefix", async () => {
    expect((await visit("/admin/staff?page=2")).headers.get("location")).toBe(
      "http://shop.test/admin/login?next=%2Fadmin%2Fstaff%3Fpage%3D2",
    );
    expect((await visit("/admin")).headers.get("location")).toBe("http://shop.test/admin/login");
    expect((await visit("/admin/login")).headers.get("location")).toBeNull();
    expect((await visit("/admin/mfa/enroll")).headers.get("location")).toBeNull();
    // admin pages never fetch the storefront's markets
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a session through and refreshes an expired one through the API", async () => {
    expect((await visit("/admin/flags", "pa_at=a")).headers.get("location")).toBeNull();
    fetchMock.mockResolvedValueOnce(
      json(200, { status: "authenticated" }, [
        "pa_at=a2; Path=/; HttpOnly; SameSite=Lax",
        "pa_rt=r2; Path=/; HttpOnly; SameSite=Lax",
      ]),
    );
    const refreshed = await visit("/admin/flags", "pa_rt=r1");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("http://api.test/v1/admin/session/refresh");
    expect(new Headers(init!.headers).get("cookie")).toBe("pa_rt=r1");
    expect(refreshed.headers.get("location")).toBeNull();
    expect(refreshed.cookies.get("pa_at")).toMatchObject({ value: "a2", httpOnly: true });
  });

  it("signs out when the API refuses the refresh, passing on its cleared cookies", async () => {
    fetchMock.mockResolvedValueOnce(
      json(401, { code: "UNAUTHENTICATED", message: "Session expired" }, [
        "pa_rt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]),
    );
    const res = await visit("/admin/flags", "pa_rt=old");
    expect(res.headers.get("location")).toBe("http://shop.test/admin/login?next=%2Fadmin%2Fflags");
    expect(res.cookies.get("pa_rt")?.value).toBe("");
  });

  it("a storefront path that only starts with 'admin' is still a storefront path", async () => {
    fetchMock.mockResolvedValue(json(200, []));
    expect((await visit("/administration")).headers.get("location")).toMatch(/\/en-bd\/administration$/);
  });
});
