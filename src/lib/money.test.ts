import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("writes prices the way the design does", () => {
    expect(formatMoney(1890000, "BDT")).toBe("৳ 18,900");
    expect(formatMoney(1890050, "BDT")).toBe("৳ 18,900.50");
    expect(formatMoney(95000, "BDT")).toBe("৳ 950");
    expect(formatMoney(1234, "USD")).toBe("$ 12.34");
    expect(formatMoney(1200, "JPY")).toBe("¥ 1,200");
  });

  it("keeps Latin digits for prices in Bangla, with the Bangla symbol and grouping", () => {
    expect(formatMoney(1890000, "BDT", "bn")).toBe("৳ 18,900");
    expect(formatMoney(1890050, "BDT", "bn")).toBe("৳ 18,900.50");
    expect(formatMoney(18900000, "BDT", "bn")).toBe("৳ 1,89,000");
    expect(formatMoney(95000, "BDT", "bn")).not.toMatch(/[০-৯]/);
  });
});
