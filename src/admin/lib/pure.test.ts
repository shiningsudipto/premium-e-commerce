import { describe, expect, it } from "vitest";
import { auditEntries, diffEntries } from "../components/audit-diff/diff";
import { visibleNav } from "../components/console-shell";
import { fieldKind, humanize, validate, type JsonSchema } from "../components/json-schema-form/schema";
import { safeNext, pathAfterSignIn } from "../features/auth/auth-api";
import { targetingSummary } from "../features/flags/flags-screen";
import { groupPermissions } from "../features/staff/roles-screen";
import { can } from "./permissions";

describe("permission gating", () => {
  it("matches the API: the wildcard holds everything, a list means any of them", () => {
    expect(can(["*"], "flags.write")).toBe(true);
    expect(can(["settings.read"], "flags.write")).toBe(false);
    expect(can(["audit.read_own"], ["audit.read", "audit.read_own"])).toBe(true);
    expect(can(undefined, "settings.read")).toBe(false);
  });

  it("shows only the sections a role can open", () => {
    const labels = (perms: string[]) => visibleNav(perms).flatMap((s) => s.items.map((i) => i.label));
    expect(labels(["audit.read_own"])).toEqual(["Dashboard", "Audit log"]);
    expect(visibleNav(["*"]).flatMap((s) => s.items.map((i) => i.href))).toEqual([
      "/admin",
      "/admin/settings",
      "/admin/flags",
      "/admin/staff",
      "/admin/roles",
      "/admin/audit",
    ]);
    expect(labels(["*"])).toEqual(["Dashboard", "Settings", "Feature flags", "Staff", "Roles", "Audit log"]);
  });
});

describe("JSON Schema form helpers", () => {
  const nullableInt: JsonSchema = {
    anyOf: [{ type: "integer", minimum: 0, maximum: 9007199254740991 }, { type: "null" }],
  };

  it("picks a control for every setting shape the API emits", () => {
    expect(fieldKind({ type: "string", minLength: 1 })).toMatchObject({ kind: "text", multiline: false });
    expect(fieldKind({ type: "string" })).toMatchObject({ kind: "text", multiline: true });
    expect(fieldKind({ type: "string", format: "email" })).toMatchObject({ inputType: "email" });
    expect(fieldKind({ type: "string", enum: ["merge", "replace"] })).toEqual({
      kind: "enum",
      options: ["merge", "replace"],
    });
    expect(fieldKind({ type: "array", items: { type: "string", enum: ["tax"] } })).toEqual({
      kind: "enum-list",
      options: ["tax"],
    });
    expect(fieldKind({ type: "array", items: { type: "string" } })).toEqual({ kind: "string-list" });
    expect(fieldKind(nullableInt)).toMatchObject({ kind: "nullable", inner: { type: "integer" } });
    expect(fieldKind({ type: "object" })).toEqual({ kind: "json" });
  });

  it("validates like the API, with readable messages", () => {
    expect(validate({ type: "string", minLength: 1 }, "")).toEqual({ "": "Required" });
    expect(validate({ type: "string", format: "email" }, "nope")).toEqual({ "": "Enter an email address" });
    expect(validate({ type: "integer", minimum: 1, maximum: 10 }, 11)).toEqual({ "": "Must be 1–10" });
    expect(validate({ type: "integer", minimum: 0, maximum: 9007199254740991 }, 2.5)).toEqual({
      "": "Enter a whole number",
    });
    expect(validate({ type: "integer", minimum: 0 }, Number.NaN)).toEqual({ "": "Enter a number" });
    expect(validate(nullableInt, null)).toEqual({});
    expect(validate({ type: "array", maxItems: 1, items: { type: "string", minLength: 1 } }, ["a", ""])).toEqual({
      "": "At most 1 items",
      "1": "Required",
    });
    expect(validate({ type: "object", properties: { a: { type: "boolean" } }, required: ["a"] }, {})).toEqual({
      a: "Required",
    });
  });

  it("turns keys into labels", () => {
    expect(humanize("affiliate.cookie_days")).toBe("Cookie days");
    expect(humanize("keep_customer")).toBe("Keep customer");
    expect(humanize("fontBody")).toBe("Font body");
  });
});

describe("audit diff", () => {
  it("lists added, removed and changed fields, ignoring housekeeping columns", () => {
    expect(
      diffEntries(
        { name: "A", tags: ["x"], meta: { a: 1 }, version: 1 },
        { name: "B", tags: ["x"], meta: { b: 2 }, version: 2 },
      ),
    ).toEqual([
      { path: "meta.a", kind: "removed", before: 1 },
      { path: "meta.b", kind: "added", after: 2 },
      { path: "name", kind: "changed", before: "A", after: "B" },
    ]);
  });

  it("reads from/to change sets and plain change sets", () => {
    expect(auditEntries({ changes: { status: { from: "ACTIVE", to: "DISABLED" } } })).toEqual([
      { path: "status", kind: "changed", before: "ACTIVE", after: "DISABLED" },
    ]);
    expect(auditEntries({ changes: { value: "Premium" } })).toEqual([
      { path: "value", kind: "added", after: "Premium" },
    ]);
    expect(auditEntries({})).toEqual([]);
    // setting.reset records the old value itself, not an object
    expect(auditEntries({ before: "Premium" })).toEqual([{ path: "value", kind: "removed", before: "Premium" }]);
    expect(auditEntries({ before: 5, after: 7 })).toEqual([{ path: "value", kind: "changed", before: 5, after: 7 }]);
  });
});

describe("screens' pure helpers", () => {
  it("summarizes flag targeting", () => {
    expect(targetingSummary({})).toBe("Everyone");
    expect(targetingSummary({ markets: ["bd"], percentage: 25 })).toBe("1 market · 25% of shoppers");
    expect(targetingSummary({ percentage: 100 })).toBe("Everyone");
  });

  it("groups permissions by area", () => {
    expect(groupPermissions(["orders.refund", "audit.read", "orders.read"])).toEqual([
      ["audit", ["audit.read"]],
      ["orders", ["orders.refund", "orders.read"]],
    ]);
  });

  it("only follows admin paths after sign-in", () => {
    expect(safeNext("/admin/staff?x=1")).toBe("/admin/staff?x=1");
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/en-bd/cart")).toBe("/admin");
    expect(safeNext("//evil.example")).toBe("/admin");
    expect(safeNext("https://evil.example")).toBe("/admin");
    expect(safeNext("/admin/login")).toBe("/admin");
    expect(safeNext("/administration")).toBe("/admin");
    expect(pathAfterSignIn("mfa_required", "/admin/flags")).toBe("/admin/mfa?next=%2Fadmin%2Fflags");
    expect(pathAfterSignIn("mfa_enrollment_required", "/admin")).toBe("/admin/mfa/enroll");
    expect(pathAfterSignIn("authenticated", "/admin/flags")).toBe("/admin/flags");
  });
});
