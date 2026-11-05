import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";
import { isAuthorized, revalidateBody } from "./revalidate";

describe("revalidation endpoint input", () => {
  it("accepts only the shared secret", () => {
    expect(isAuthorized("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorized("Bearer s3cre", "s3cret")).toBe(false);
    expect(isAuthorized(null, "s3cret")).toBe(false);
    expect(isAuthorized("s3cret", "s3cret")).toBe(false);
  });

  it("takes up to 100 tags", () => {
    expect(revalidateBody.safeParse({ tags: ["config", "page:home"] }).success).toBe(true);
    expect(revalidateBody.safeParse({ tags: [] }).success).toBe(false);
    expect(revalidateBody.safeParse({ tags: Array(101).fill("x") }).success).toBe(false);
  });
});

describe("environment", () => {
  it("names every invalid variable", () => {
    expect(() =>
      parseEnv({ API_URL: "nope", SITE_URL: "http://x", REVALIDATE_SECRET: "short", DEFAULT_MARKET: "bd" }),
    ).toThrow(/API_URL[\s\S]*REVALIDATE_SECRET[\s\S]*DEFAULT_MARKET/);
  });
});
