import { describe, expect, it } from "vitest";
import { isJobState, jobStateVariant, queueAttention, queueLabel, timeAgo } from "./job-logic";

const counts = { created: 0, retry: 0, active: 0, completed: 0, failed: 0, cancelled: 0 };

describe("job monitor logic", () => {
  it("names queues in plain words, with a fallback", () => {
    expect(queueLabel("notification.send-email")).toBe("Send emails");
    expect(queueLabel("sub.outbound-webhooks")).toBe("Queue webhook deliveries");
    expect(queueLabel("sub.new-thing")).toBe("Event handler: new-thing");
    expect(queueLabel("custom.queue")).toBe("custom.queue");
  });

  it("flags failures, backlogs and dead letters", () => {
    expect(queueAttention({ kind: "task", counts, failedLast24h: 1 })).toBe("failed");
    expect(queueAttention({ kind: "task", counts: { ...counts, created: 80, retry: 20 }, failedLast24h: 0 })).toBe(
      "backlog",
    );
    expect(queueAttention({ kind: "task", counts: { ...counts, failed: 9 }, failedLast24h: 0 })).toBeNull();
    expect(queueAttention({ kind: "dead-letter", counts: { ...counts, created: 2 }, failedLast24h: 0 })).toBe("failed");
    expect(queueAttention({ kind: "dead-letter", counts, failedLast24h: 0 })).toBeNull();
  });

  it("formats relative times", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(timeAgo(null, now)).toBe("Never");
    expect(timeAgo("2026-01-01T11:59:30Z", now)).toBe("Just now");
    expect(timeAgo("2026-01-01T11:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-01-01T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2025-12-25T12:00:00Z", now)).toBe("7 days ago");
  });

  it("styles states and validates filter values", () => {
    expect(jobStateVariant("failed")).toBe("destructive");
    expect(jobStateVariant("created")).toBe("outline");
    expect(isJobState("failed")).toBe(true);
    expect(isJobState("nope")).toBe(false);
    expect(isJobState(undefined)).toBe(false);
  });
});
