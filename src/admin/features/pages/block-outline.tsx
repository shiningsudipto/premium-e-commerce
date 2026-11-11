"use client";

import { useState, type DragEvent } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CircleAlertIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { blockSummary, hasRoom, MAX_CHILDREN, settingsSummary, type Block, type BlockDef } from "./block-tree";

// The page's block tree as an outline: select a block to edit it, drag the handle to reorder
// (also into and out of container blocks such as Columns), or use the arrow buttons and the
// actions menu from the keyboard.

export type OutlineActions = {
  select: (id: string) => void;
  moveBy: (id: string, delta: -1 | 1) => void;
  moveTo: (id: string, parentId: string | null, index: number) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  add: (parentId: string | null) => void;
};

type Props = {
  tree: Block[];
  defs: Map<string, BlockDef>;
  selectedId: string | null;
  errorIds: Set<string>;
  readOnly: boolean;
  actions: OutlineActions;
};

export function BlockOutline(props: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const { tree, actions } = props;
  const drop = (parentId: string | null, index: number) => {
    if (dragging) actions.moveTo(dragging, parentId, index);
    setDragging(null);
  };
  if (tree.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        No blocks yet. Add one from the block library.
      </p>
    );
  }
  return <BlockList {...props} list={tree} parentId={null} dragging={dragging} setDragging={setDragging} drop={drop} />;
}

type ListProps = Props & {
  list: Block[];
  parentId: string | null;
  dragging: string | null;
  setDragging: (id: string | null) => void;
  drop: (parentId: string | null, index: number) => void;
};

function BlockList(props: ListProps) {
  const { list, parentId, dragging, drop } = props;
  return (
    <ol
      className={cn("space-y-2", parentId && "mt-2 border-l pl-3")}
      aria-label={parentId ? "Blocks in this container" : "Page blocks"}
    >
      {list.map((block, i) => (
        <BlockRow key={block.id} {...props} block={block} index={i} />
      ))}
      {dragging && (
        <li
          aria-hidden
          className="rounded-md border border-dashed py-1.5 text-center text-xs text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            drop(parentId, list.length);
          }}
        >
          Drop here to place last{parentId ? " in this container" : ""}
        </li>
      )}
    </ol>
  );
}

function BlockRow(props: ListProps & { block: Block; index: number }) {
  const { block, index, list, parentId, tree, defs, selectedId, errorIds, readOnly, actions, setDragging, drop } =
    props;
  const [over, setOver] = useState(false);
  const id = block.id!;
  const def = defs.get(block.type);
  const label = def?.label ?? block.type;
  const summary = blockSummary(block);
  const flags = settingsSummary(block.settings);
  const selected = selectedId === id;
  const invalid = errorIds.has(id);
  const otherContainers = tree.filter(
    (b) => b.id !== id && b.id !== parentId && defs.get(b.type)?.container && hasRoom(tree, b.id!),
  );
  const canNest = !def?.container;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    // dropping on a block places the dragged one before it
    drop(parentId, index);
  };

  return (
    <li>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-selected={selected ? true : undefined}
        data-invalid={invalid ? true : undefined}
        className={cn(
          "flex items-center gap-1 rounded-md border bg-background p-1.5 data-[invalid=true]:border-destructive data-[selected=true]:border-primary data-[selected=true]:bg-accent/60",
          over && "border-t-2 border-t-primary",
        )}
      >
        {!readOnly && (
          <span
            draggable
            title="Drag to move"
            className="shrink-0 cursor-grab px-0.5 text-muted-foreground active:cursor-grabbing"
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", label);
              setDragging(id);
            }}
            onDragEnd={() => setDragging(null)}
          >
            <GripVerticalIcon className="size-4" aria-hidden />
          </span>
        )}
        <button
          type="button"
          className="min-w-0 grow rounded-sm px-1 py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-current={selected ? "true" : undefined}
          onClick={() => actions.select(id)}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {invalid && <CircleAlertIcon className="size-3.5 shrink-0 text-destructive" aria-label="Has errors" />}
            {label}
          </span>
          {(summary || flags.length > 0) && (
            <span className="block truncate text-xs text-muted-foreground">
              {[summary, ...flags].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>
        {!readOnly && (
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Move ${label} up`}
              disabled={index === 0}
              onClick={() => actions.moveBy(id, -1)}
            >
              <ArrowUpIcon />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Move ${label} down`}
              disabled={index === list.length - 1}
              onClick={() => actions.moveBy(id, 1)}
            >
              <ArrowDownIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Actions for ${label}`}>
                    <MoreHorizontalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => actions.duplicate(id)} disabled={!hasRoom(tree, parentId)}>
                  Duplicate
                </DropdownMenuItem>
                {parentId !== null && (
                  <DropdownMenuItem
                    disabled={!hasRoom(tree, null)}
                    onClick={() => actions.moveTo(id, null, tree.findIndex((b) => b.id === parentId) + 1)}
                  >
                    Move out of the container
                  </DropdownMenuItem>
                )}
                {canNest &&
                  otherContainers.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => actions.moveTo(id, c.id!, c.children?.length ?? 0)}>
                      Move into {defs.get(c.type)?.label ?? c.type} {tree.indexOf(c) + 1}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => actions.remove(id)}>
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {def?.container && (
        <div className="ml-4">
          {(block.children ?? []).length > 0 ? (
            <BlockList {...props} list={block.children!} parentId={id} />
          ) : (
            <EmptyContainer {...props} containerId={id} />
          )}
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 text-muted-foreground"
              disabled={(block.children?.length ?? 0) >= MAX_CHILDREN}
              onClick={() => actions.add(id)}
            >
              <PlusIcon /> Add block to {label.toLowerCase()}
              <span className="sr-only">(each block is one column, up to {MAX_CHILDREN})</span>
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyContainer({ containerId, dragging, drop }: ListProps & { containerId: string }) {
  return (
    <p
      className="mt-2 rounded-md border border-dashed px-2 py-2 text-xs text-muted-foreground"
      onDragOver={(e) => {
        if (dragging) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        drop(containerId, 0);
      }}
    >
      Empty. Each block added here is one column (up to {MAX_CHILDREN}).
    </p>
  );
}
