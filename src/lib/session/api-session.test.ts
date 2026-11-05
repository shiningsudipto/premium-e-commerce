import { describe, expect, it } from "vitest";
import { parseSetCookie } from "./api-session";

describe("passing the API's session cookies on", () => {
  it("keeps every attribute the API set", () => {
    expect(
      parseSetCookie(
        "pa_at=abc.def%3D; Domain=.example.com; Path=/; Expires=Fri, 06 Nov 2026 10:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
      ),
    ).toEqual({
      name: "pa_at",
      value: "abc.def=",
      options: {
        domain: ".example.com",
        path: "/",
        expires: new Date("Fri, 06 Nov 2026 10:00:00 GMT"),
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      },
    });
    expect(parseSetCookie("pa_mfa=x; Max-Age=600; Path=/").options.maxAge).toBe(600);
  });
});
