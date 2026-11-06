import { describe, expect, it } from "vitest";
import { formatAddress, isAddress, readAddress, readEmail } from "./address";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("checkout address", () => {
  it("reads a complete address, trimming and nulling empty optionals", () => {
    const { address, errors } = readAddress(
      form({
        "shipping.firstName": " Ayesha ",
        "shipping.lastName": "Rahman",
        "shipping.line1": "12 Road 4",
        "shipping.city": "Dhaka",
        "shipping.postalCode": "1205",
        "shipping.country": "bd",
        "shipping.phone": "+880 1711 000000",
      }),
      "shipping",
    );
    expect(errors).toEqual({});
    expect(address).toMatchObject({
      firstName: "Ayesha",
      country: "BD",
      line2: null,
      company: null,
      postalCode: "1205",
    });
  });

  it("reports missing and malformed fields by name", () => {
    const { errors } = readAddress(form({ "s.country": "Bangladesh", "s.phone": "call me" }), "s");
    expect(errors).toMatchObject({
      "s.firstName": "required",
      "s.line1": "required",
      "s.city": "required",
      "s.country": "invalid",
      "s.phone": "invalid",
    });
  });

  it("checks the email", () => {
    expect(readEmail(form({ email: " A@Example.com " }))).toEqual({ email: "a@example.com" });
    expect(readEmail(form({ email: "nope" })).error).toBe("invalid");
    expect(readEmail(form({})).error).toBe("required");
  });

  it("formats and recognises addresses", () => {
    const a = { firstName: "A", lastName: "R", line1: "12 Road 4", city: "Dhaka", postalCode: "1205", country: "BD" };
    expect(formatAddress(a)).toBe("A R, 12 Road 4, Dhaka 1205, BD");
    expect(isAddress(a)).toBe(true);
    expect(isAddress({ city: "x" })).toBe(false);
    expect(formatAddress(null)).toBe("");
  });
});
