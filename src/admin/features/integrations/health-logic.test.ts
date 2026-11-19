import { describe, expect, it } from "vitest";
import { healthVariant, isStale, overallMessage, overallStatus, sortChecks } from "./health-logic";

describe("integration health logic", () => {
  it("derives the overall status, ignoring integrations that aren't set up", () => {
    expect(overallStatus(["up", "disabled"])).toBe("up");
    expect(overallStatus(["up", "degraded", "disabled"])).toBe("degraded");
    expect(overallStatus(["degraded", "down"])).toBe("down");
    expect(overallStatus([])).toBe("up");
  });

  it("says what's wrong in a sentence", () => {
    expect(overallMessage([{ status: "up", name: "Database" }])).toBe("Everything the store depends on is working.");
    expect(overallMessage([{ status: "down", name: "Database" }])).toBe("Database is down.");
    expect(
      overallMessage([
        { status: "degraded", name: "Email" },
        { status: "degraded", name: "Webhooks" },
        { status: "degraded", name: "Storage" },
      ]),
    ).toBe("Email, Webhooks and Storage need attention.");
  });

  it("puts problems first and keeps the API's order otherwise", () => {
    const sorted = sortChecks([
      { key: "a", status: "up" as const },
      { key: "b", status: "disabled" as const },
      { key: "c", status: "down" as const },
      { key: "d", status: "up" as const },
      { key: "e", status: "degraded" as const },
    ]);
    expect(sorted.map((c) => c.key)).toEqual(["c", "e", "a", "d", "b"]);
  });

  it("styles statuses and spots stale data", () => {
    expect(healthVariant("down")).toBe("destructive");
    expect(healthVariant("disabled")).toBe("outline");
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(isStale("2026-01-01T11:59:00Z", 30_000, now)).toBe(false);
    expect(isStale("2026-01-01T11:50:00Z", 30_000, now)).toBe(true);
    expect(isStale(undefined, 30_000, now)).toBe(true);
  });
});
