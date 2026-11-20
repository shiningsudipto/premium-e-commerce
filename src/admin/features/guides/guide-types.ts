// Admin guides (Webhooks, API keys, Workflows): written once as structured content, shown as a
// page in the console and exported as Markdown for sharing outside it.
//
// Inline text supports `code`, **bold** and [links](https://…), the same subset in both outputs.

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; lang: string; code: string; title?: string }
  | { kind: "note"; tone: "info" | "warn"; text: string };

export type GuideSection = { id: string; title: string; blocks: GuideBlock[] };

export type Guide = {
  slug: "webhooks" | "api-keys" | "workflows";
  title: string;
  summary: string;
  // who it's written for, shown under the title
  audience: string;
  // the console screen the guide belongs to
  screen: { href: string; label: string };
  sections: GuideSection[];
};

// Values that differ per installation, filled in when the guide is built.
export type GuideContext = { apiUrl: string; adminUrl: string };

const escapeCell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function blockToMarkdown(block: GuideBlock): string {
  switch (block.kind) {
    case "p":
      return block.text;
    case "h3":
      return `### ${block.text}`;
    case "list":
      return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : "-"} ${item}`).join("\n");
    case "table":
      return [
        `| ${block.head.map(escapeCell).join(" | ")} |`,
        `| ${block.head.map(() => "---").join(" | ")} |`,
        ...block.rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
      ].join("\n");
    case "code":
      return `${block.title ? `**${block.title}**\n\n` : ""}\`\`\`${block.lang}\n${block.code}\n\`\`\``;
    case "note":
      return `> **${block.tone === "warn" ? "Important" : "Note"}:** ${block.text}`;
  }
}

export function guideToMarkdown(guide: Guide): string {
  const toc = guide.sections.map((s, i) => `${i + 1}. [${s.title}](#${s.id})`).join("\n");
  const body = guide.sections.map((s) => [`## ${s.title}`, ...s.blocks.map(blockToMarkdown)].join("\n\n")).join("\n\n");
  return `# ${guide.title}\n\n${guide.summary}\n\n_${guide.audience}_\n\n## Contents\n\n${toc}\n\n${body}\n`;
}

// Splits inline text into plain, code, bold and link parts for rendering.
export type InlinePart =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ kind: "code", text: m[1] });
    else if (m[2] !== undefined) parts.push({ kind: "bold", text: m[2] });
    else parts.push({ kind: "link", text: m[3]!, href: m[4]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
