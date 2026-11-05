import { cn } from "@/lib/utils";
import { auditEntries, formatValue, type DiffEntry } from "./diff";

const KIND_STYLE: Record<DiffEntry["kind"], string> = {
  added: "border-l-success",
  removed: "border-l-destructive",
  changed: "border-l-warning",
};

// Field-by-field view of what an audited change did: old value struck through, new value after it.
export function AuditDiff({
  event,
  className,
}: {
  event: { changes?: unknown; before?: unknown; after?: unknown };
  className?: string;
}) {
  const entries = auditEntries(event);
  if (!entries.length) return <p className="text-sm text-muted-foreground">No field changes recorded.</p>;
  return (
    <dl className={cn("divide-y rounded-md border bg-card text-sm", className)}>
      {entries.map((entry) => (
        <div
          key={entry.path}
          className={cn("grid gap-1 border-l-2 px-3 py-2 sm:grid-cols-[14rem_1fr]", KIND_STYLE[entry.kind])}
        >
          <dt className="font-mono text-xs break-all text-muted-foreground">
            {entry.path}
            <span className="sr-only"> {entry.kind}</span>
          </dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-2 font-mono text-xs">
            {entry.kind !== "added" && (
              <del className="break-all text-destructive/80 decoration-destructive/40">{formatValue(entry.before)}</del>
            )}
            {entry.kind === "changed" && <span aria-hidden>→</span>}
            {entry.kind !== "removed" && (
              <ins className="break-all text-foreground no-underline">{formatValue(entry.after)}</ins>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
