import { describe, expect, it } from "vitest";
import { apiKeysGuide } from "./api-keys-guide";
import { blockToMarkdown, guideToMarkdown, parseInline, type GuideBlock } from "./guide-types";
import { webhooksGuide } from "./webhooks-guide";
import { workflowsGuide } from "./workflows-guide";

const ctx = { apiUrl: "https://api.shop.test", adminUrl: "https://shop.test" };
const guides = [webhooksGuide(ctx), apiKeysGuide(ctx), workflowsGuide(ctx)];

describe("parseInline", () => {
  it("splits code, bold and links out of plain text", () => {
    expect(parseInline("Use `sk_…` and **never** share [docs](https://x.test).")).toEqual([
      { kind: "text", text: "Use " },
      { kind: "code", text: "sk_…" },
      { kind: "text", text: " and " },
      { kind: "bold", text: "never" },
      { kind: "text", text: " share " },
      { kind: "link", text: "docs", href: "https://x.test" },
      { kind: "text", text: "." },
    ]);
  });
  it("leaves plain text alone", () => {
    expect(parseInline("plain")).toEqual([{ kind: "text", text: "plain" }]);
  });
});

describe("blockToMarkdown", () => {
  it("writes tables with escaped pipes", () => {
    const table: GuideBlock = { kind: "table", head: ["A", "B"], rows: [["1 | 2", "3"]] };
    const escapedPipe = String.raw`\|`;
    expect(blockToMarkdown(table)).toBe(`| A | B |\n| --- | --- |\n| 1 ${escapedPipe} 2 | 3 |`);
  });
  it("numbers ordered lists and fences code", () => {
    expect(blockToMarkdown({ kind: "list", ordered: true, items: ["a", "b"] })).toBe("1. a\n2. b");
    expect(blockToMarkdown({ kind: "code", lang: "bash", code: "ls" })).toBe("```bash\nls\n```");
  });
});

describe.each(guides.map((g) => [g.slug, g] as const))("%s guide", (_slug, guide) => {
  it("has unique section ids and a contents entry for each", () => {
    const ids = guide.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const md = guideToMarkdown(guide);
    for (const s of guide.sections) {
      expect(md).toContain(`(#${s.id})`);
      expect(md).toContain(`## ${s.title}`);
    }
  });

  it("has balanced inline formatting and even table rows", () => {
    for (const s of guide.sections) {
      for (const b of s.blocks) {
        const texts =
          b.kind === "p" || b.kind === "h3" || b.kind === "note"
            ? [b.text]
            : b.kind === "list"
              ? b.items
              : b.kind === "table"
                ? [...b.head, ...b.rows.flat()]
                : [];
        for (const t of texts) expect((t.match(/`/g) ?? []).length % 2, `${s.id}: ${t}`).toBe(0);
        if (b.kind === "table") for (const row of b.rows) expect(row.length, `${s.id}: ${row[0]}`).toBe(b.head.length);
      }
    }
  });

  it("quotes this installation's addresses", () => {
    const md = guideToMarkdown(guide);
    expect(md).toContain("https://shop.test/admin/");
    if (guide.slug === "api-keys") expect(md).toContain("https://api.shop.test/v1/admin/orders");
  });
});
