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
});
