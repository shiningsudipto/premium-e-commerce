import { describe, expect, it } from "vitest";
import {
  createBody,
  deliveryOutcome,
  deliveryStatusLabel,
  endpointStatus,
  eventsSummary,
  eventTypesIn,
  filterDeliveries,
  formatDuration,
  formFromEndpoint,
  groupEvents,
  patchBody,
  previewJson,
  toggleEvent,
  toggleGroup,
  validateEndpoint,
  type Delivery,
  type Endpoint,
} from "./webhook-logic";

const endpoint: Endpoint = {
  id: "w1",
  url: "https://hooks.example.com/in",
  description: "ERP",
  events: ["order.paid", "order.placed"],
  isActive: true,
  consecutiveFailures: 0,
  disabledAt: null,
  disabledReason: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const delivery = (over: Partial<Delivery>): Delivery => ({
  id: "d",
  subscriptionId: "w1",
  eventId: "e",
  eventType: "order.paid",
  payload: {},
  occurredAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("endpoint status", () => {
  it("tells a manual switch-off from an automatic one", () => {
    expect(endpointStatus(endpoint)).toBe("active");
    expect(endpointStatus({ isActive: false, disabledAt: null })).toBe("disabled");
    expect(endpointStatus({ isActive: false, disabledAt: "2026-01-02T00:00:00.000Z" })).toBe("auto_disabled");
  });

  it("summarizes events", () => {
    expect(eventsSummary(["*"])).toBe("All events");
    expect(eventsSummary(["a.b", "c.d", "e.f", "g.h"])).toBe("a.b, c.d +2 more");
  });
});

describe("event picker", () => {
  it("groups by entity in catalog order", () => {
    expect(groupEvents(["order.placed", "product.created", "order.paid"])).toEqual([
      ["order", ["order.placed", "order.paid"]],
      ["product", ["product.created"]],
    ]);
  });

  it("treats all events as exclusive", () => {
    expect(toggleEvent(["order.paid"], "*", true)).toEqual(["*"]);
    expect(toggleEvent(["*"], "order.paid", true)).toEqual(["order.paid"]);
    expect(toggleEvent(["order.paid", "order.placed"], "order.paid", false)).toEqual(["order.placed"]);
    expect(toggleGroup(["*"], ["order.paid", "order.placed"], true)).toEqual(["order.paid", "order.placed"]);
    expect(toggleGroup(["order.paid", "x.y"], ["order.paid", "order.placed"], false)).toEqual(["x.y"]);
  });
});

describe("endpoint form", () => {
  it("validates URL, events and description", () => {
    expect(validateEndpoint({ url: "", description: "", events: [], isActive: true })).toEqual({
      url: "URL is required",
      events: "Choose at least one event",
    });
    expect(
      validateEndpoint({ url: "http://example.com/x", description: "", events: ["*"], isActive: true }).url,
    ).toMatch(/https/);
    expect(validateEndpoint({ url: "http://127.0.0.1:9/x", description: "", events: ["*"], isActive: true })).toEqual(
      {},
    );
    expect(
      validateEndpoint({ url: "nope", description: "x".repeat(201), events: ["*"], isActive: true }),
    ).toMatchObject({
      url: expect.stringContaining("full URL"),
      description: "At most 200 characters",
    });
  });

  it("creates without an empty description and patches only changes", () => {
    expect(createBody({ url: " https://a.io ", description: " ", events: ["*"], isActive: true })).toEqual({
      url: "https://a.io",
      events: ["*"],
    });
    const form = formFromEndpoint(endpoint);
    expect(patchBody(form, endpoint)).toEqual({});
    expect(patchBody({ ...form, events: ["order.placed", "order.paid"] }, endpoint)).toEqual({});
    expect(patchBody({ ...form, description: "", isActive: false }, endpoint)).toEqual({
      description: null,
      isActive: false,
    });
  });
});

describe("delivery log", () => {
  it("labels outcomes", () => {
    expect(deliveryOutcome(delivery({ ok: true, status: 200 }))).toBe("ok");
    expect(deliveryStatusLabel(delivery({ ok: false, status: 500, error: "HTTP 500" }))).toBe("HTTP 500");
    expect(deliveryStatusLabel(delivery({ ok: false, error: "fetch failed" }))).toBe("No response: fetch failed");
    expect(formatDuration(42)).toBe("42 ms");
    expect(formatDuration(1530)).toBe("1.5 s");
    expect(formatDuration(undefined)).toBe("—");
  });

  it("filters by outcome and event type", () => {
    const items = [
      delivery({ id: "1", ok: true, status: 200 }),
      delivery({ id: "2", ok: false, status: 500, eventType: "order.placed" }),
      delivery({ id: "3", ok: false, error: "timeout" }),
    ];
    expect(filterDeliveries(items, { outcome: "failed", eventType: "" }).map((d) => d.id)).toEqual(["2", "3"]);
    expect(filterDeliveries(items, { outcome: "ok", eventType: "" }).map((d) => d.id)).toEqual(["1"]);
    expect(filterDeliveries(items, { outcome: "all", eventType: "order.placed" }).map((d) => d.id)).toEqual(["2"]);
    expect(eventTypesIn(items)).toEqual(["order.paid", "order.placed"]);
  });

  it("bounds payload previews", () => {
    expect(previewJson({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(previewJson({ a: "x".repeat(50) }, 10)).toMatch(/more characters\)$/);
  });
});
