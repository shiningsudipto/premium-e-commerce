import { describe, expect, it } from "vitest";
import { isBlankRichText, plainToRichText, richTextToPlain } from "./rich-text";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Made by hand" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Full-grain " },
        { type: "text", text: "leather", marks: [{ type: "bold" }] },
        { type: "text", text: "." },
        { type: "hardBreak" },
        { type: "text", text: "Second line" },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Two" }] }] },
      ],
    },
    { type: "paragraph", content: [] },
  ],
};

describe("richTextToPlain", () => {
  it("keeps plain strings, tidying line endings and blank lines", () => {
    expect(richTextToPlain("One\r\n\r\n\r\n\r\nTwo  \nthree")).toBe("One\n\nTwo\nthree");
  });

  it("turns a document into paragraphs separated by blank lines", () => {
    expect(richTextToPlain(doc)).toBe("Made by hand\n\nFull-grain leather.\nSecond line\n\nOne\n\nTwo");
  });

  it("reads nothing from empty or unknown values", () => {
    expect(richTextToPlain(null)).toBe("");
    expect(richTextToPlain(undefined)).toBe("");
    expect(richTextToPlain(42)).toBe("");
    expect(richTextToPlain({ type: "doc", content: [] })).toBe("");
    expect(isBlankRichText({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isBlankRichText("  ")).toBe(true);
    expect(isBlankRichText(doc)).toBe(false);
  });
});

describe("plainToRichText", () => {
  it("saves typed text as a string the storefront splits on blank lines", () => {
    const value = plainToRichText("  প্রথম অনুচ্ছেদ।\r\n\r\n\r\nদ্বিতীয় অনুচ্ছেদ।  ");
    expect(value).toBe("প্রথম অনুচ্ছেদ।\n\nদ্বিতীয় অনুচ্ছেদ।");
    // the same split the storefront's <RichText> makes
    expect(value!.split(/\n{2,}/)).toEqual(["প্রথম অনুচ্ছেদ।", "দ্বিতীয় অনুচ্ছেদ।"]);
  });

  it("leaves blank text out, so the English shows", () => {
    expect(plainToRichText(" \n\n ")).toBeUndefined();
  });

  it("round-trips through plain text", () => {
    const plain = richTextToPlain(doc);
    expect(richTextToPlain(plainToRichText(plain))).toBe(plain);
  });
});
