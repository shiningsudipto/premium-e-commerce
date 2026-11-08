import { describe, expect, it } from "vitest";
import { readBalance, readEarnings, readPayouts, readStats, statusTone } from "./readers";

describe("affiliate dashboard readers", () => {
  it("reads stats and fills gaps with zeros", () => {
    expect(
      readStats({
        clicks: 40,
        conversions: 2,
        conversionRate: 0.05,
        salesMinor: 500000,
        earnings: { PENDING: 5000, APPROVED: "x" },
        subIds: [{ subId: null, clicks: 30, conversions: 1 }, { subId: "ig" }],
      }),
    ).toEqual({
      clicks: 40,
      conversions: 2,
      conversionRate: 0.05,
      salesMinor: 500000,
      earnings: { PENDING: 5000, APPROVED: 0 },
      subIds: [
        { subId: null, clicks: 30, conversions: 1 },
        { subId: "ig", clicks: 0, conversions: 0 },
      ],
    });
    expect(readStats(null)).toMatchObject({ clicks: 0, subIds: [], earnings: {} });
  });

  it("reads the balance", () => {
    expect(readBalance({ currency: "BDT", payableMinor: 1200 })).toEqual({
      currency: "BDT",
      pendingMinor: 0,
      payableMinor: 1200,
      inPayoutMinor: 0,
      paidMinor: 0,
      reversedMinor: 0,
    });
  });

  it("reads ledger and payout pages, skipping rows without an id", () => {
    const earnings = readEarnings({
      items: [{ id: "e1", kind: "COMMISSION", status: "PENDING", amountMinor: 500, currency: "BDT" }, { kind: "X" }],
      nextCursor: "e1",
    });
    expect(earnings.items).toHaveLength(1);
    expect(earnings.items[0]).toMatchObject({ id: "e1", amountMinor: 500, reason: null });
    expect(earnings.nextCursor).toBe("e1");
    expect(readPayouts({ items: [{ id: "p1", status: "PAID", amountMinor: 900 }], nextCursor: null })).toEqual({
      items: [
        {
          id: "p1",
          status: "PAID",
          amountMinor: 900,
          currency: null,
          method: null,
          providerRef: null,
          paidAt: null,
          createdAt: null,
        },
      ],
      nextCursor: null,
    });
    expect(readPayouts(undefined)).toEqual({ items: [], nextCursor: null });
  });

  it("maps statuses to tones", () => {
    expect(statusTone("PAID")).toBe("done");
    expect(statusTone("DRAFT")).toBe("warn");
    expect(statusTone("REVERSED")).toBe("stop");
    expect(statusTone("SOMETHING")).toBeNull();
  });
});
