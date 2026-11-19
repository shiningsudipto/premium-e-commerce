import { describe, expect, it } from "vitest";
import { isVisitorId, newVisitorId, visitorCookie, VISITOR_COOKIE } from "./visitor-id";

describe("visitor ID", () => {
  it("creates IDs the API accepts, different each time", () => {
    const a = newVisitorId();
    expect(isVisitorId(a)).toBe(true);
    expect(a).not.toBe(newVisitorId());
  });

  it("rejects missing, short, long or odd values", () => {
    expect(isVisitorId(undefined)).toBe(false);
    expect(isVisitorId("")).toBe(false);
    expect(isVisitorId("short")).toBe(false);
    expect(isVisitorId("x".repeat(101))).toBe(false);
    expect(isVisitorId("has spaces in it")).toBe(false);
    expect(isVisitorId("abc123_DEF-456")).toBe(true);
  });

  it("is a long-lived, httpOnly, first-party cookie", () => {
    expect(visitorCookie("abc12345", true)).toMatchObject({
      name: VISITOR_COOKIE,
      value: "abc12345",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 31_536_000,
    });
  });
});
