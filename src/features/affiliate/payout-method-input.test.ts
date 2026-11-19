import { describe, expect, it } from "vitest";
import { normalizeAccountNumber, normalizeBdMobile, readPayoutLabel, readPayoutMethod } from "./payout-method-input";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("Bangladesh payout method input", () => {
  it("normalizes Bangladeshi mobile wallet numbers", () => {
    expect(normalizeBdMobile("01712345678")).toBe("01712345678");
    expect(normalizeBdMobile("+880 1712-345678")).toBe("01712345678");
    expect(normalizeBdMobile("8801912345678")).toBe("01912345678");
    expect(normalizeBdMobile("0171234567")).toBeNull(); // 10 digits
    expect(normalizeBdMobile("01212345678")).toBeNull(); // no 012 operator
    expect(normalizeBdMobile("abc")).toBeNull();
  });

  it("normalizes bank account numbers", () => {
    expect(normalizeAccountNumber("1234 5678 9012")).toBe("123456789012");
    expect(normalizeAccountNumber("12345")).toBeNull();
    expect(normalizeAccountNumber("12A456789")).toBeNull();
  });

  it("builds a wallet body with the provider as its label", () => {
    const { body, errors } = readPayoutMethod(
      form({
        type: "mobile_wallet",
        provider: "Nagad",
        walletNumber: "+8801812345678",
        accountName: " Rahim ",
        isDefault: "on",
      }),
    );
    expect(errors).toEqual({});
    expect(body).toEqual({
      type: "mobile_wallet",
      label: "Nagad",
      details: { accountName: "Rahim", walletNumber: "01812345678" },
      isDefault: true,
    });
  });

  it("builds a bank body with optional branch and routing number", () => {
    const { body } = readPayoutMethod(
      form({
        type: "bank",
        bankName: "City Bank",
        accountNumber: "1234-5678-90",
        routingNumber: "225 261 732",
        accountName: "Karim",
      }),
    );
    expect(body).toEqual({
      type: "bank",
      label: "City Bank",
      details: { accountName: "Karim", accountNumber: "1234567890", bankName: "City Bank", routingNumber: "225261732" },
      isDefault: false,
    });
  });

  it("reports field errors and keeps what was typed", () => {
    const wallet = readPayoutMethod(form({ type: "mobile_wallet", provider: "PayPal", walletNumber: "123" }));
    expect(wallet.body).toBeUndefined();
    expect(wallet.errors).toEqual({
      accountName: "required",
      provider: "required",
      walletNumber: "walletNumberInvalid",
    });
    expect(wallet.values.walletNumber).toBe("123");

    const bank = readPayoutMethod(form({ type: "bank", accountName: "K", accountNumber: "x", routingNumber: "12" }));
    expect(bank.errors).toEqual({
      bankName: "required",
      accountNumber: "accountNumberInvalid",
      routingNumber: "routingNumberInvalid",
    });
  });

  it("reads the edit form's label per type", () => {
    expect(readPayoutLabel(form({ type: "mobile_wallet", provider: "Rocket" }))).toEqual({ label: "Rocket" });
    expect(readPayoutLabel(form({ type: "mobile_wallet", provider: "Other" }))).toEqual({ error: "required" });
    expect(readPayoutLabel(form({ type: "bank", bankName: " BRAC Bank " }))).toEqual({ label: "BRAC Bank" });
    expect(readPayoutLabel(form({ type: "bank", bankName: "" }))).toEqual({ error: "required" });
  });
});
