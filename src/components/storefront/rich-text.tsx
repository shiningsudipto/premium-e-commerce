import Link from "next/link";
import type { ReactNode } from "react";

// Renders the page builder's rich text: a plain string (paragraphs split on blank lines) or a
// ProseMirror-style JSON document. Only known node types become elements and nothing is
// injected as HTML, so merchant content can't run script. Links are limited to safe schemes.

type Mark = { type: string; attrs?: { href?: unknown } };
export type RichNode = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: RichNode[];
};

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function applyMarks(text: ReactNode, marks: Mark[] = [], key: string): ReactNode {
  return marks.reduce<ReactNode>((node, mark, i) => {
    const k = `${key}-${i}`;
    if (mark.type === "bold" || mark.type === "strong") return <strong key={k}>{node}</strong>;
    if (mark.type === "italic" || mark.type === "em") return <em key={k}>{node}</em>;
    if (mark.type === "underline") return <u key={k}>{node}</u>;
    if (mark.type === "link" && typeof mark.attrs?.href === "string" && SAFE_HREF.test(mark.attrs.href)) {
      const href = mark.attrs.href;
      return href.startsWith("/") ? (
        <Link key={k} href={href}>
          {node}
        </Link>
      ) : (
        <a key={k} href={href} rel="noopener noreferrer">
          {node}
        </a>
      );
    }
    return node;
  }, text);
}

function renderNode(node: RichNode, key: string): ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`));
  switch (node.type) {
    case "text":
      return applyMarks(node.text ?? "", node.marks, key);
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading": {
      const level = Number(node.attrs?.level);
      // headings inside content start at h2: the page title is the h1
      return level >= 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>;
    }
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} className="rule" />;
    case "doc":
      return children;
    default:
      // unknown nodes keep their text but lose their formatting
      return children ?? null;
  }
}

export function isEmptyRichText(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  const node = value as RichNode;
  return !node.content?.length;
}

// The words only, for meta descriptions and structured data, cut at a word boundary.
export function plainText(value: unknown, max = 160): string {
  const walk = (node: RichNode): string =>
    node.text ?? (node.content ?? []).map(walk).join(node.type === "doc" ? " " : node.type === "paragraph" ? "" : " ");
  const text = (typeof value === "string" ? value : value && typeof value === "object" ? walk(value as RichNode) : "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

export function RichText({ value, className = "prose" }: { value: unknown; className?: string }) {
  if (isEmptyRichText(value)) return null;
  if (typeof value === "string") {
    return (
      <div className={className}>
        {value
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
    );
  }
  return <div className={className}>{renderNode(value as RichNode, "rt")}</div>;
}
