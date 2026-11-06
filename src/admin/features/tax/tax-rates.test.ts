import { describe, expect, it } from "vitest";
import { bpsToPercent, percentToBps } from "./tax-rates";

describe("tax rate percentages", () => {
  it("turns typed percentages into basis points", () => {
    expect(percentToBps("15")).toBe(1500);
    expect(percentToBps("7.25")).toBe(725);
    expect(percentToBps("12.5 %")).toBe(1250);
    expect(percentToBps("0")).toBe(0);
    expect(percentToBps("100")).toBe(10_000);
  });

  it("rejects what the API would refuse", () => {
    expect(percentToBps("")).toBeNaN();
    expect(percentToBps("abc")).toBeNaN();
    expect(percentToBps("-5")).toBeNaN();
    expect(percentToBps("1.234")).toBeNaN();
    expect(percentToBps("100.01")).toBeNaN();
  });

  it("shows basis points as percentages", () => {
    expect(bpsToPercent(1500)).toBe("15");
    expect(bpsToPercent(725)).toBe("7.25");
    expect(bpsToPercent(1250)).toBe("12.5");
    expect(percentToBps(bpsToPercent(333))).toBe(333);
  });
});
