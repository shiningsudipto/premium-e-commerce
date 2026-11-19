// Job monitor wording and rules (plan B-Phase 3). Pure, so it's unit-tested (job-logic.test.ts).

export const JOB_STATES = ["created", "retry", "active", "completed", "failed", "cancelled"] as const;
export type JobState = (typeof JOB_STATES)[number];

export const JOB_STATE_LABELS: Record<JobState, string> = {
  created: "Waiting",
  retry: "Retrying",
  active: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function jobStateVariant(state: JobState): "default" | "secondary" | "destructive" | "outline" {
  if (state === "failed") return "destructive";
  if (state === "active") return "default";
  if (state === "completed") return "secondary";
  return "outline";
}

export type QueueKind = "scheduled" | "task" | "subscriber" | "dead-letter";

export const QUEUE_KIND_LABELS: Record<QueueKind, string> = {
  scheduled: "Scheduled",
  task: "On demand",
  subscriber: "Event handler",
  "dead-letter": "Dead letters",
};

// What each queue does, in plain words. Unknown queues fall back to their name.
const QUEUE_LABELS: Record<string, string> = {
  "search-log": "Search log writes",
  "notification.send-email": "Send emails",
  "storefront.revalidate": "Storefront refresh",
  "catalog.publish-scheduled": "Publish scheduled products",
  "orders.expire-pending": "Cancel unpaid orders",
  "maintenance.cleanup": "Clean up expired data",
  "affiliate.click": "Record affiliate clicks",
  "affiliate.approve-earnings": "Approve affiliate earnings",
  "content.publish-scheduled": "Publish scheduled pages",
  "cart.detect-abandoned": "Find abandoned carts",
  "customers.refresh-segments": "Refresh customer segments",
  "reviews.request": "Ask for reviews",
  "customers.process-deletions": "Process account deletions",
  "data.run-job": "Imports and exports",
  "analytics.events": "Analytics events",
  "webhooks.deliver": "Deliver webhooks",
  "affiliate.evaluate-tiers": "Update affiliate tiers",
  "affiliate.detect-fraud": "Detect affiliate fraud",
  "reports.send-scheduled": "Send scheduled reports",
  "dead-letter": "Dead letters (jobs that ran out of retries)",
};

const SUBSCRIBER_LABELS: Record<string, string> = {
  "audit-to-mongo": "Write the audit log",
  "revalidate-storefront": "Refresh storefront pages",
  "customer-emails": "Customer emails",
  "affiliate-earnings": "Affiliate earnings",
  "lifecycle-emails": "Lifecycle emails",
  "workflow-rules": "Workflow rules",
  "outbound-webhooks": "Queue webhook deliveries",
};

export function queueLabel(name: string): string {
  if (QUEUE_LABELS[name]) return QUEUE_LABELS[name];
  if (name.startsWith("sub.")) {
    const sub = name.slice(4);
    return SUBSCRIBER_LABELS[sub] ?? `Event handler: ${sub}`;
  }
  return name;
}

type Counts = Record<JobState, number>;

// A queue needs a look when jobs have failed recently or many are piling up.
export function queueAttention(q: {
  kind: QueueKind;
  counts: Counts;
  failedLast24h: number;
}): "failed" | "backlog" | null {
  if (q.kind === "dead-letter") return q.counts.created > 0 ? "failed" : null;
  if (q.failedLast24h > 0) return "failed";
  if (q.counts.created + q.counts.retry >= 100) return "backlog";
  return null;
}

// "3 min ago" style for timestamps that move (last completion).
export function timeAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "Never";
  const ms = now - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const isJobState = (v: string | undefined): v is JobState =>
  !!v && (JOB_STATES as readonly string[]).includes(v);
