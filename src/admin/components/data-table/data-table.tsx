"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Fragment, useState, type ReactNode } from "react";
import { BookmarkIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "../../store/api-errors";
import { useSavedViews, useTableFilters, type FilterDef } from "./use-table-filters";

export type BulkAction<T> = {
  label: string;
  destructive?: boolean;
  run: (rows: T[]) => Promise<unknown> | void;
};

export type DataTableProps<T> = {
  // names the table's saved views
  tableKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types differ per column
  columns: ColumnDef<T, any>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  filters?: FilterDef[];
  pagination?: { page: number; hasNext: boolean; hasPrevious: boolean; onNext: () => void; onPrevious: () => void };
  bulkActions?: BulkAction<T>[];
  // a detail panel under the row, opened with the row's toggle
  renderExpanded?: (row: T) => ReactNode;
  emptyMessage?: string;
  toolbar?: ReactNode;
};

// Generic admin list (plan B-Phase 0): server data, filters in the URL, saved views, cursor
// pagination, row selection with bulk actions and optional expandable rows.
export function DataTable<T>({
  tableKey,
  columns,
  data,
  getRowId,
  loading,
  error,
  filters = [],
  pagination,
  bulkActions = [],
  renderExpanded,
  emptyMessage = "Nothing here yet.",
  toolbar,
}: DataTableProps<T>) {
  const [selectionState, setSelectionState] = useState<{ data: T[] | undefined; rows: RowSelectionState }>({
    data,
    rows: {},
  });
  // a new page or new filters clear the selection
  const selection = selectionState.data === data ? selectionState.rows : {};
  const setSelection = (next: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) =>
    setSelectionState({ data, rows: typeof next === "function" ? next(selection) : next });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const selectable = bulkActions.length > 0;

  const table = useReactTable({
    data: data ?? [],
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    state: { rowSelection: selection },
    onRowSelectionChange: setSelection,
    enableRowSelection: selectable,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const colSpan = columns.length + (selectable ? 1 : 0) + (renderExpanded ? 1 : 0);

  async function runBulk(action: BulkAction<T>) {
    setRunning(true);
    try {
      await action.run(selected);
      setSelection({});
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      {(filters.length > 0 || toolbar) && (
        <div className="flex flex-wrap items-end gap-2">
          {filters.length > 0 && <Filters tableKey={tableKey} filters={filters} />}
          {toolbar && <div className="ml-auto flex gap-2">{toolbar}</div>}
        </div>
      )}

      {selectable && selected.length > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex items-center gap-3 rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm"
        >
          <span className="font-medium">{selected.length} selected</span>
          {bulkActions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.destructive ? "destructive" : "outline"}
              disabled={running}
              onClick={() => runBulk(action)}
            >
              {action.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelection({})}>
            Clear
          </Button>
        </div>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all on this page"
                      checked={table.getIsAllPageRowsSelected()}
                      indeterminate={table.getIsSomePageRowsSelected()}
                      onCheckedChange={(on) => table.toggleAllPageRowsSelected(!!on)}
                    />
                  </TableHead>
                )}
                {renderExpanded && <TableHead className="w-10" aria-label="Details" />}
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading && !data
              ? Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={colSpan}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}
            {!loading && table.getRowModel().rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => {
              const open = expanded === row.id;
              return (
                <Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          aria-label="Select row"
                          checked={row.getIsSelected()}
                          onCheckedChange={(on) => row.toggleSelected(!!on)}
                        />
                      </TableCell>
                    )}
                    {renderExpanded && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-expanded={open}
                          aria-label={open ? "Hide details" : "Show details"}
                          onClick={() => setExpanded(open ? null : row.id)}
                        >
                          {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </Button>
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {open && renderExpanded && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={colSpan} className="p-4 whitespace-normal">
                        {renderExpanded(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && (pagination.hasNext || pagination.hasPrevious) && (
        <nav aria-label="Pagination" className="flex items-center justify-end gap-2 text-sm">
          <span className="mr-2 text-muted-foreground">Page {pagination.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevious || loading}
            onClick={pagination.onPrevious}
          >
            <ChevronLeftIcon /> Previous
          </Button>
          <Button variant="outline" size="sm" disabled={!pagination.hasNext || loading} onClick={pagination.onNext}>
            Next <ChevronRightIcon />
          </Button>
        </nav>
      )}
    </div>
  );
}

function Filters({ tableKey, filters }: { tableKey: string; filters: FilterDef[] }) {
  const { values, setValues, key } = useTableFilters(filters);
  // remounting on URL changes (back button, applying a view) puts the inputs back in step
  return <FilterForm key={key} tableKey={tableKey} filters={filters} values={values} setValues={setValues} />;
}

function FilterForm({
  tableKey,
  filters,
  values,
  setValues,
}: {
  tableKey: string;
  filters: FilterDef[];
  values: Record<string, string>;
  setValues: (next: Record<string, string | undefined>) => void;
}) {
  const { views, save, remove } = useSavedViews(tableKey);
  const [draft, setDraft] = useState(values);
  const active = Object.keys(values).length > 0;

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setValues(draft);
      }}
    >
      {filters.map((f) =>
        f.type === "text" ? (
          <Input
            key={f.key}
            aria-label={f.label}
            placeholder={f.placeholder ?? f.label}
            className="h-8 w-44"
            value={draft[f.key] ?? ""}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
          />
        ) : (
          <Select
            key={f.key}
            value={values[f.key] ?? ""}
            onValueChange={(v) =>
              setValues({ ...draft, [f.key]: v === "__all" ? undefined : (v ?? undefined) } as Record<string, string>)
            }
          >
            <SelectTrigger aria-label={f.label} className="h-8 w-44">
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      )}
      <Button type="submit" size="sm" variant="secondary">
        Apply
      </Button>
      {active && (
        <Button type="button" size="sm" variant="ghost" onClick={() => setValues({})}>
          <XIcon /> Clear
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" size="sm" variant="outline">
              <BookmarkIcon /> Views
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Saved views</DropdownMenuLabel>
            {views.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">None yet</p>}
            {views.map((v) => (
              <DropdownMenuItem key={v.name} onClick={() => setValues(v.values)} className="justify-between">
                <span className="truncate">{v.name}</span>
                <button
                  type="button"
                  aria-label={`Delete view ${v.name}`}
                  className="opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v.name);
                  }}
                >
                  <XIcon className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!active}
            onClick={() => {
              const name = window.prompt("Name this view");
              if (name?.trim()) save(name.trim(), values);
            }}
          >
            Save current filters…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}
