import { describe, expect, it } from "vitest";
import { emptyValue, fieldKind, fromLocalDateTime, toLocalDateTime, validate, type JsonSchema } from "./schema";

// The additions for page-builder block schemas: lists of objects and date-time strings.

const slides: JsonSchema = {
  type: "array",
  minItems: 1,
  maxItems: 2,
  items: {
    type: "object",
    properties: { mediaId: { type: "string" }, heading: { type: "string", maxLength: 5 } },
    required: ["mediaId"],
  },
};

describe("lists of objects", () => {
  it("get their own control", () => {
    expect(fieldKind(slides)).toMatchObject({ kind: "object-list", item: { required: ["mediaId"] } });
    // objects without known properties still fall back to JSON
    expect(fieldKind({ type: "array", items: { type: "object" } })).toEqual({ kind: "json" });
  });

  it("validate each item by path", () => {
    expect(validate(slides, [{ heading: "too long" }])).toEqual({
      "0.mediaId": "Required",
      "0.heading": "At most 5 characters",
    });
    expect(validate(slides, [], "slides")).toEqual({ slides: "At least 1 items" });
  });

  it("start new items with their required fields", () => {
    expect(emptyValue(slides.items!)).toEqual({ mediaId: "" });
  });
});

describe("date-time strings", () => {
  const schema: JsonSchema = { type: "string", format: "date-time" };

  it("get a date and time control and are checked", () => {
    expect(fieldKind(schema)).toEqual({ kind: "datetime" });
    expect(validate(schema, "2030-01-01T10:00:00.000Z")).toEqual({});
    expect(validate(schema, "soon")).toEqual({ "": "Enter a date and time" });
  });

  it("round-trip through the local input format", () => {
    const iso = "2030-06-15T08:30:00.000Z";
    expect(fromLocalDateTime(toLocalDateTime(iso))).toBe(iso);
    expect(toLocalDateTime(undefined)).toBe("");
    expect(toLocalDateTime("nope")).toBe("");
    expect(fromLocalDateTime("")).toBeUndefined();
  });
});
