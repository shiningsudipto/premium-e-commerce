// Rich text ↔ plain text for the translations editor. Descriptions and the page builder's rich
// text props are either a plain string (paragraphs split on blank lines) or a ProseMirror-style
// JSON document; the storefront's <RichText> renders both. Translators edit plain text, and what
// they type is saved as a plain string, which <RichText> shows as one <p> per paragraph.

type RichNode = { type?: unknown; text?: unknown; content?: unknown };

// Nodes that start a new paragraph of their own in the plain text.
const BLOCK_NODES = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock"]);

const isNode = (v: unknown): v is RichNode => !!v && typeof v === "object" && !Array.isArray(v);

// The words of a rich text value, one paragraph per block, separated by blank lines.
export function richTextToPlain(value: unknown): string {
  if (typeof value === "string") return normalize(value);
  if (!isNode(value)) return "";
  const paragraphs: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) paragraphs.push(current.replace(/[ \t]+/g, " ").trim());
    current = "";
  };
  const walk = (node: RichNode) => {
    const type = typeof node.type === "string" ? node.type : "";
    if (type === "text") {
      current += typeof node.text === "string" ? node.text : "";
      return;
    }
    if (type === "hardBreak") {
      current += "\n";
      return;
    }
    if (type === "horizontalRule") {
      flush();
      return;
    }
    const block = BLOCK_NODES.has(type);
    if (block) flush();
    const children = Array.isArray(node.content) ? node.content : [];
    for (const child of children) if (isNode(child)) walk(child);
    // a bare text node outside any block still reads as text
    if (block) flush();
  };
  walk(value);
  flush();
  return paragraphs.join("\n\n");
}

// Line endings unified, spaces at the ends of lines removed, at most one blank line in a row.
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// What a translator typed, as a value the storefront renders: a plain string, or undefined
// when it's blank (the English text shows instead).
export function plainToRichText(text: string): string | undefined {
  const value = normalize(text);
  return value ? value : undefined;
}

export function isBlankRichText(value: unknown): boolean {
  return richTextToPlain(value) === "";
}
