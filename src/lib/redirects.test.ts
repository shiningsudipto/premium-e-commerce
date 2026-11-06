import { describe, expect, it } from "vitest";
import { buildTable, normalizePath, resolveRedirect } from "./redirects";

const table = buildTable([
  { fromPath: "/Old-Sale/", toPath: "/collections/sale", statusCode: 301 },
  { fromPath: "/press", toPath: "https://press.example.com", statusCode: 302 },
  { fromPath: "/loop", toPath: "/loop", statusCode: 301 },
  { fromPath: "/odd", toPath: "/pages/odd", statusCode: 418 },
]);

describe("redirects", () => {
  it("normalizes case, trailing slashes and queries", () => {
    expect(normalizePath("/Old-Sale/?utm=x")).toBe("/old-sale");
    expect(normalizePath("/")).toBe("/");
  });

  it("sends site paths to the shopper's market", () => {
    expect(resolveRedirect(table, "/old-sale", "en-bd")).toEqual({ location: "/en-bd/collections/sale", status: 301 });
  });

  it("keeps external targets and their status", () => {
    expect(resolveRedirect(table, "/press", "en-bd")).toEqual({ location: "https://press.example.com", status: 302 });
  });

  it("ignores unknown paths, self-redirects and odd status codes", () => {
    expect(resolveRedirect(table, "/new", "en-bd")).toBeNull();
    expect(resolveRedirect(table, "/loop", "en-bd")).toBeNull();
    expect(resolveRedirect(table, "/odd", "en-bd")?.status).toBe(301);
  });
});
