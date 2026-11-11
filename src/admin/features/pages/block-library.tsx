"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BlockDef } from "./block-tree";

const GROUPS: { key: BlockDef["group"]; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "layout", label: "Layout" },
  { key: "commerce", label: "Commerce" },
  { key: "marketing", label: "Marketing" },
  { key: "advanced", label: "Advanced" },
];

// The block library: every block the staff member may add, grouped. Blocks that need a
// permission they lack (custom HTML) aren't offered.
export function BlockLibraryDialog({
  open,
  onOpenChange,
  defs,
  intoContainer,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defs: BlockDef[];
  intoContainer: boolean;
  onPick: (def: BlockDef) => void;
}) {
  // container blocks aren't nested in each other
  const available = defs.filter((d) => !(intoContainer && d.container));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a block</DialogTitle>
          <DialogDescription>
            {intoContainer
              ? "The block becomes a new column of the container."
              : "The block is added at the end of the page. Drag it or use the arrows to move it."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto">
          {GROUPS.map((g) => {
            const items = available.filter((d) => d.group === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} aria-labelledby={`block-group-${g.key}`}>
                <h3 id={`block-group-${g.key}`} className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                  {g.label}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {items.map((d) => (
                    <li key={d.type}>
                      <button
                        type="button"
                        className="w-full rounded-md border p-3 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onPick(d)}
                      >
                        <span className="block font-medium">{d.label}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {d.type}
                          {d.container ? " · holds columns" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
