import { describe, expect, it } from "vitest";
import { readApplication } from "./application";

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("affiliate application form", () => {
  it("builds the application object with typed values", () => {
    const { errors, application } = readApplication(
      form({ website: "instagram.com/anna", audience_size: "12,500", promotion_methods: " Reels " }),
    );
    expect(errors).toEqual({});
    expect(application).toEqual({
      website: "https://instagram.com/anna",
      audience_size: 12500,
      promotion_methods: "Reels",
    });
  });

  it("leaves out empty optional fields", () => {
    expect(readApplication(form({ website: "https://anna.example" })).application).toEqual({
      website: "https://anna.example/",
    });
  });

  it("reports missing and malformed values and keeps what was typed", () => {
    const { errors, values } = readApplication(form({ audience_size: "lots", website: "" }));
    expect(errors).toEqual({ website: "required", audience_size: "invalid" });
    expect(values.audience_size).toBe("lots");
    expect(readApplication(form({ website: "javascript://x" })).errors.website).toBe("invalid");
    expect(readApplication(form({ website: "localhost" })).errors.website).toBe("invalid");
    expect(readApplication(form({ website: "a.b", promotion_methods: "x".repeat(2001) })).errors).toEqual({
      promotion_methods: "tooLong",
    });
  });
});
