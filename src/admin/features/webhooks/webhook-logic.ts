import type {
  GetV1AdminWebhooksApiResponse,
  GetV1AdminWebhooksIdDeliveriesApiResponse,
} from "../../store/api.generated";

// Outbound webhooks (spec §11.3): endpoint status, the event picker and the delivery log.

export type Endpoint = GetV1AdminWebhooksApiResponse[number];
export type Delivery = GetV1AdminWebhooksIdDeliveriesApiResponse["items"][number];

export const ALL_EVENTS = "*";
// the API's limits
export const MAX_EVENTS = 60;
export const MAX_DESCRIPTION = 200;
// the delivery log endpoint returns at most this many entries (newest first)
export const MAX_DELIVERIES = 200;
export const DELIVERY_PAGE = 50;

// ── Endpoint status ─────────────────────────────────────────────────────────

export type EndpointStatus = "active" | "auto_disabled" | "disabled";

export function endpointStatus(e: Pick<Endpoint, "isActive" | "disabledAt">): EndpointStatus {
  if (e.isActive) return "active";
  // disabledAt is only set when the API switched the endpoint off after repeated failures
  return e.disabledAt ? "auto_disabled" : "disabled";
}

export const ENDPOINT_STATUS: Record<
  EndpointStatus,
  { label: string; variant: "secondary" | "outline" | "destructive" }
> = {
  active: { label: "Active", variant: "secondary" },
  auto_disabled: { label: "Auto-disabled", variant: "destructive" },
  disabled: { label: "Disabled", variant: "outline" },
};

export function eventsSummary(events: readonly string[]): string {
  if (events.includes(ALL_EVENTS)) return "All events";
  if (events.length <= 2) return events.join(", ");
  return `${events.slice(0, 2).join(", ")} +${events.length - 2} more`;
}

// ── Event picker ────────────────────────────────────────────────────────────

// "order.paid" → grouped under "order", groups in catalog order
export function groupEvents(events: readonly string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const e of events) {
    const group = e.split(".")[0]!;
    groups.set(group, [...(groups.get(group) ?? []), e]);
  }
  return [...groups.entries()];
}

export function toggleEvent(selected: readonly string[], event: string, on: boolean): string[] {
  if (event === ALL_EVENTS) return on ? [ALL_EVENTS] : [];
  const rest = selected.filter((e) => e !== event && e !== ALL_EVENTS);
  return on ? [...rest, event] : rest;
}

export function toggleGroup(selected: readonly string[], group: readonly string[], on: boolean): string[] {
  const rest = selected.filter((e) => !group.includes(e) && e !== ALL_EVENTS);
  return on ? [...rest, ...group] : rest;
}

// ── Form ────────────────────────────────────────────────────────────────────

export type EndpointForm = { url: string; description: string; events: string[]; isActive: boolean };
export type EndpointErrors = Partial<Record<"url" | "events" | "description", string>>;

export function validateEndpoint(form: EndpointForm): EndpointErrors {
  const errors: EndpointErrors = {};
  const url = form.url.trim();
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!url) errors.url = "URL is required";
  else if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:"))
    errors.url = "Enter a full URL, e.g. https://example.com/webhooks";
  else if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))
    errors.url = "Use https (plain http only works for localhost in development)";
  if (!form.events.length) errors.events = "Choose at least one event";
  else if (form.events.length > MAX_EVENTS) errors.events = `At most ${MAX_EVENTS} events; choose "All events" instead`;
  if (form.description.trim().length > MAX_DESCRIPTION) errors.description = `At most ${MAX_DESCRIPTION} characters`;
  return errors;
}

export const formFromEndpoint = (e: Endpoint): EndpointForm => ({
  url: e.url,
  description: e.description ?? "",
  events: [...e.events],
  isActive: e.isActive,
});

export function createBody(form: EndpointForm) {
  const description = form.description.trim();
  return { url: form.url.trim(), events: form.events, ...(description ? { description } : {}) };
}

// Only what changed, so re-enabling (which also clears the failure count) is deliberate.
export function patchBody(form: EndpointForm, before: Endpoint) {
  const body: { url?: string; events?: string[]; description?: string | null; isActive?: boolean } = {};
  if (form.url.trim() !== before.url) body.url = form.url.trim();
  const sameEvents = form.events.length === before.events.length && form.events.every((e) => before.events.includes(e));
  if (!sameEvents) body.events = form.events;
  const description = form.description.trim() || null;
  if (description !== before.description) body.description = description;
  if (form.isActive !== before.isActive) body.isActive = form.isActive;
  return body;
}

// ── Delivery log ────────────────────────────────────────────────────────────

export type DeliveryOutcome = "ok" | "http_error" | "no_response";

export function deliveryOutcome(d: Pick<Delivery, "ok" | "status">): DeliveryOutcome {
  if (d.ok) return "ok";
  return typeof d.status === "number" ? "http_error" : "no_response";
}

export function deliveryStatusLabel(d: Pick<Delivery, "ok" | "status" | "error">): string {
  const outcome = deliveryOutcome(d);
  if (outcome === "no_response") return d.error ? `No response: ${d.error}` : "No response";
  return `HTTP ${d.status}`;
}

export const formatDuration = (ms: number | null | undefined) =>
  ms === null || ms === undefined ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

export type DeliveryFilter = { outcome: "all" | "ok" | "failed"; eventType: string };

export function filterDeliveries(items: readonly Delivery[], filter: DeliveryFilter): Delivery[] {
  return items.filter((d) => {
    const ok = deliveryOutcome(d) === "ok";
    const outcomeFits = filter.outcome === "all" || (filter.outcome === "ok" ? ok : !ok);
    return outcomeFits && (!filter.eventType || d.eventType === filter.eventType);
  });
}

export const eventTypesIn = (items: readonly Delivery[]) => [...new Set(items.map((d) => d.eventType))].sort();

// A readable, bounded preview of a JSON payload.
export function previewJson(value: unknown, max = 4000): string {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "";
  } catch {
    text = String(value);
  }
  return text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters)` : text;
}
