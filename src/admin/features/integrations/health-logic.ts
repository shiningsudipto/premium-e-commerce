// Integration health wording and rules (plan B-Phase 3). Pure, so it's unit-tested.

export type HealthStatus = "up" | "degraded" | "down" | "disabled";

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  up: "Working",
  degraded: "Needs attention",
  down: "Down",
  disabled: "Not set up",
};

export function healthVariant(status: HealthStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "down") return "destructive";
  if (status === "degraded") return "default";
  if (status === "up") return "secondary";
  return "outline";
}

const RANK: Record<HealthStatus, number> = { down: 3, degraded: 2, up: 1, disabled: 0 };

// The worst status among the checks (a "not set up" integration doesn't count against the store).
export function overallStatus(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), "up");
}

export function overallMessage(checks: { status: HealthStatus; name: string }[]): string {
  const down = checks.filter((c) => c.status === "down");
  const degraded = checks.filter((c) => c.status === "degraded");
  if (down.length) return `${list(down.map((c) => c.name))} ${down.length === 1 ? "is" : "are"} down.`;
  if (degraded.length)
    return `${list(degraded.map((c) => c.name))} ${degraded.length === 1 ? "needs" : "need"} attention.`;
  return "Everything the store depends on is working.";
}

function list(names: string[]) {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

// Problems first, then working ones, then the ones not set up; the API's order within each group.
export function sortChecks<T extends { status: HealthStatus }>(checks: T[]): T[] {
  return checks
    .map((c, i) => ({ c, i }))
    .sort((a, b) => RANK[b.c.status] - RANK[a.c.status] || a.i - b.i)
    .map(({ c }) => c);
}

// The status data is stale when the last successful poll is older than three intervals.
export const isStale = (checkedAt: string | undefined, intervalMs: number, now = Date.now()) =>
  !checkedAt || now - new Date(checkedAt).getTime() > intervalMs * 3;
