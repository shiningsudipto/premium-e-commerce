import { describe, expect, it } from "vitest";
import {
  confirmsRevoke,
  expiresAt,
  groupState,
  keyBody,
  keyStatus,
  scopeGroups,
  toggleScope,
  toggleScopeGroup,
  validateKey,
} from "./api-key-logic";

const now = new Date("2026-06-01T12:00:00.000Z");

describe("key status", () => {
  it("revoked wins over expired, expired once the time has passed", () => {
    expect(keyStatus({ revokedAt: null, expiresAt: null }, now)).toBe("active");
    expect(keyStatus({ revokedAt: null, expiresAt: "2026-07-01T00:00:00.000Z" }, now)).toBe("active");
    expect(keyStatus({ revokedAt: null, expiresAt: "2026-05-01T00:00:00.000Z" }, now)).toBe("expired");
    expect(keyStatus({ revokedAt: "2026-05-02T00:00:00.000Z", expiresAt: "2026-05-01T00:00:00.000Z" }, now)).toBe(
      "revoked",
    );
  });
});

describe("scopes", () => {
  const catalog = ["orders.read", "orders.write", "inventory.read", "inventory.write"];

  it("groups the catalog and marks scopes the creator doesn't hold", () => {
    expect(scopeGroups(catalog, ["orders.read", "inventory.read", "inventory.write"])).toEqual([
      [
        "inventory",
        [
          { scope: "inventory.read", held: true },
          { scope: "inventory.write", held: true },
        ],
      ],
      [
        "orders",
        [
          { scope: "orders.read", held: true },
          { scope: "orders.write", held: false },
        ],
      ],
    ]);
    // the Owner holds everything through "*"
    expect(scopeGroups(catalog, ["*"]).every(([, opts]) => opts.every((o) => o.held))).toBe(true);
  });

  it("toggles single scopes and whole groups (held scopes only)", () => {
    const orders = [
      { scope: "orders.read", held: true },
      { scope: "orders.write", held: false },
    ];
    expect(toggleScope(["a"], "b", true)).toEqual(["a", "b"]);
    expect(toggleScope(["a", "b"], "a", false)).toEqual(["b"]);
    expect(toggleScopeGroup(["x"], orders, true)).toEqual(["x", "orders.read"]);
    expect(toggleScopeGroup(["x", "orders.read"], orders, false)).toEqual(["x"]);
    expect(groupState(["orders.read"], orders)).toBe("checked");
    expect(groupState([], orders)).toBe("unchecked");
    expect(
      groupState(
        ["inventory.read"],
        [
          { scope: "inventory.read", held: true },
          { scope: "inventory.write", held: true },
        ],
      ),
    ).toBe("mixed");
  });
});

describe("expiry", () => {
  it("computes presets, custom dates and never", () => {
    expect(expiresAt("never", "", now)).toBeNull();
    expect(expiresAt("30", "", now)).toBe("2026-07-01T12:00:00.000Z");
    const custom = new Date(expiresAt("custom", "2026-12-31", now)!);
    expect([custom.getFullYear(), custom.getMonth(), custom.getDate(), custom.getHours()]).toEqual([2026, 11, 31, 23]);
    expect(expiresAt("custom", "", now)).toBeUndefined();
  });
});

describe("create form", () => {
  it("needs a name, a scope and a future expiry", () => {
    expect(validateKey({ name: " ", scopes: [], expiry: "custom", customDate: "" }, now)).toEqual({
      name: "Name is required",
      scopes: "Choose at least one scope",
      expiry: "Choose a date",
    });
    expect(
      validateKey({ name: "3PL", scopes: ["orders.read"], expiry: "custom", customDate: "2026-01-01" }, now).expiry,
    ).toBe("Choose a date in the future");
    expect(validateKey({ name: "3PL", scopes: ["orders.read"], expiry: "never", customDate: "" }, now)).toEqual({});
  });

  it("builds the body with sorted scopes", () => {
    expect(
      keyBody({ name: " 3PL ", scopes: ["orders.read", "inventory.read"], expiry: "never", customDate: "" }, now),
    ).toEqual({
      name: "3PL",
      scopes: ["inventory.read", "orders.read"],
      expiresAt: null,
    });
  });

  it("revocation needs the exact name", () => {
    expect(confirmsRevoke(" 3PL ", { name: "3PL" })).toBe(true);
    expect(confirmsRevoke("3pl", { name: "3PL" })).toBe(false);
  });
});
