"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  LinkIcon,
  PrinterIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notifyError, notifySaved } from "../../lib/notify";
import { guideToMarkdown, parseInline, type Guide, type GuideBlock } from "./guide-types";

// A guide as a console page: contents, sections, and ways to share it (link for staff, Markdown
// to paste or send, print / save as PDF for anyone).

export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.kind === "code")
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {part.text}
            </code>
          );
        if (part.kind === "bold") return <strong key={i}>{part.text}</strong>;
        if (part.kind === "link") {
          const external = /^https?:/.test(part.href);
          return (
            <a
              key={i}
              href={part.href}
              className="underline underline-offset-2"
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {part.text}
            </a>
          );
        }
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
}

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    notifySaved(done);
  } catch {
    notifyError({ data: { code: "COPY", message: "Couldn't copy. Select the text and copy it instead." } });
  }
}

function CodeBlock({ block }: { block: Extract<GuideBlock, { kind: "code" }> }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className="overflow-hidden rounded-lg border">
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{block.title ?? block.lang}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 print:hidden"
          aria-label={`Copy ${block.title ?? "code"}`}
          onClick={() => {
            void copyText(block.code, "Copied.");
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
        </Button>
      </figcaption>
      <pre className="overflow-x-auto bg-muted/30 p-3 text-xs leading-relaxed print:whitespace-pre-wrap">
        <code>{block.code}</code>
      </pre>
    </figure>
  );
}

function Block({ block }: { block: GuideBlock }): ReactNode {
  switch (block.kind) {
    case "p":
      return (
        <p className="leading-relaxed">
          <Inline text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="pt-2 text-base font-medium">
          <Inline text={block.text} />
        </h3>
      );
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className={`space-y-1.5 pl-5 leading-relaxed ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ListTag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {block.head.map((h, i) => (
                  <TableHead key={i} className="whitespace-nowrap">
                    <Inline text={h} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((row, r) => (
                <TableRow key={r}>
                  {row.map((cell, c) => (
                    <TableCell key={c} className="align-top whitespace-normal">
                      <Inline text={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    case "code":
      return <CodeBlock block={block} />;
    case "note":
      return (
        <Alert variant={block.tone === "warn" ? "destructive" : "default"}>
          {block.tone === "warn" ? <TriangleAlertIcon /> : <InfoIcon />}
          <AlertDescription className="leading-relaxed">
            <Inline text={block.text} />
          </AlertDescription>
        </Alert>
      );
  }
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function GuideView({ guide }: { guide: Guide }) {
  const markdown = () => guideToMarkdown(guide);
  return (
    <article className="mx-auto max-w-6xl" aria-labelledby="guide-title">
      <Link
        href={guide.screen.href}
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} mb-3 -ml-2 print:hidden`}
      >
        <ArrowLeftIcon /> Back to {guide.screen.label}
      </Link>

      <header className="mb-6 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <h1 id="guide-title" className="text-2xl font-medium tracking-tight">
            {guide.title}
          </h1>
          <p className="leading-relaxed text-muted-foreground">{guide.summary}</p>
          <p className="text-sm text-muted-foreground italic">{guide.audience}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden" aria-label="Share this guide" role="group">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyText(location.href, "Link copied. Staff can open it after signing in.")}
          >
            <LinkIcon /> Copy link
          </Button>
          <Button size="sm" variant="outline" onClick={() => void copyText(markdown(), "Guide copied as Markdown.")}>
            <CopyIcon /> Copy as Markdown
          </Button>
          <Button size="sm" variant="outline" onClick={() => download(`${guide.slug}-guide.md`, markdown())}>
            <DownloadIcon /> Download .md
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <PrinterIcon /> Print / PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Contents" className="lg:sticky lg:top-20 lg:self-start print:hidden">
          <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Contents</p>
          <ol className="space-y-1 text-sm">
            {guide.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-10 text-sm">
          {guide.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className="scroll-mt-20 break-inside-avoid-page space-y-4"
            >
              <h2 id={`${s.id}-title`} className="text-lg font-medium tracking-tight">
                {s.title}
              </h2>
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
