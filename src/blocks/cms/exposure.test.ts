import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportExposure } from "./exposure";

const market = { segment: "en-bd", market: "bd", locale: "en" } as Parameters<typeof reportExposure>[1];
const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
const bodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init!.body)));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  fetchMock.mockClear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("experiment exposure beacon", () => {
  it("reports each experiment once per page view, batching what mounts together", () => {
    expect(reportExposure("visitor-123", market, "hero", "b", "/en-bd/pages/a")).toBe(true);
    expect(reportExposure("visitor-123", market, "hero", "b", "/en-bd/pages/a")).toBe(false);
    expect(reportExposure("visitor-123", market, "promo", "control", "/en-bd/pages/a")).toBe(true);
    vi.runAllTimers();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/v1\/store\/events$/);
    expect(bodies()[0]).toEqual({
      visitorId: "visitor-123",
      events: [{ type: "experiment_exposure", path: "/en-bd/pages/a", experiments: { hero: "b", promo: "control" } }],
    });

    // a boundary streaming in later on the same page doesn't report again
    expect(reportExposure("visitor-123", market, "hero", "b", "/en-bd/pages/a")).toBe(false);
    vi.runAllTimers();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("counts again on the next page view", () => {
    reportExposure("visitor-123", market, "hero", "b", "/en-bd/pages/x");
    vi.runAllTimers();
    reportExposure("visitor-123", market, "hero", "b", "/en-bd/pages/y");
    vi.runAllTimers();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[1]![1]!;
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "include" });
    expect((init.headers as Record<string, string>)["x-market"]).toBe("bd");
  });
});
