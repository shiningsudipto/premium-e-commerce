"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { ArrowRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminRedirectsIdMutation,
  useGetV1AdminRedirectsQuery,
  usePostV1AdminRedirectsMutation,
  type GetV1AdminRedirectsApiResponse,
} from "../../store/api.generated";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";

type Redirect = GetV1AdminRedirectsApiResponse["items"][number];

const FILTERS: FilterDef[] = [{ key: "q", label: "Search", type: "text", placeholder: "Path contains…" }];
const PAGE_SIZE = 50;

// URL redirects (spec §9.5): the storefront proxy caches the active map and refreshes it when
// one changes. Handle changes on products and categories add their own redirects.
export function RedirectsScreen() {
  const filters = useTableFilters(FILTERS);
  const pages = useCursorPages(filters.key);
  const redirects = useGetV1AdminRedirectsQuery({
    ...filters.values,
    limit: PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  const [deleteRedirect] = useDeleteV1AdminRedirectsIdMutation();

  const columns: ColumnDef<Redirect>[] = [
    {
      header: "From → to",
      cell: ({ row: { original: r } }) => (
        <div className="flex max-w-xl flex-wrap items-center gap-1.5 font-mono text-xs whitespace-normal">
          <span className="break-all">{r.fromPath}</span>
          <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" aria-label="to" />
          <span className="break-all">{r.toPath}</span>
        </div>
      ),
    },
    {
      header: "Type",
      cell: ({ row: { original: r } }) => (
        <Badge variant="outline" className="font-mono">
          {r.statusCode}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: r } }) =>
        r.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Off</Badge>,
    },
    {
      header: "Updated",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(r.updatedAt)}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: r } }) => (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={`Delete redirect from ${r.fromPath}`}>
              <Trash2Icon />
            </Button>
          }
          title="Delete this redirect?"
          description={`${r.fromPath} will answer 404 again unless a page lives there.`}
          confirmLabel="Delete redirect"
          destructive
          onConfirm={() =>
            deleteRedirect({ id: r.id })
              .unwrap()
              .then(() => notifySaved("Redirect deleted"), notifyError)
          }
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Redirects"
        description="Send old URLs to new ones. Saving a path that already redirects replaces it, and chains are collapsed so shoppers take one hop."
        actions={<NewRedirectDialog />}
      />
      <DataTable
        tableKey="redirects"
        columns={columns}
        data={redirects.data?.items}
        loading={redirects.isFetching}
        error={redirects.error}
        getRowId={(r) => r.id}
        filters={FILTERS}
        emptyMessage="No redirects match."
        pagination={{
          page: pages.page,
          hasNext: !!redirects.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(redirects.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}

function NewRedirectDialog() {
  const [open, setOpen] = useState(false);
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createRedirect, create] = usePostV1AdminRedirectsMutation();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setErrors({});
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon /> New redirect
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const fromPath = String(form.get("fromPath")).trim();
            if (!fromPath.startsWith("/")) {
              setErrors({ fromPath: ["Start with / (a path on this store)"] });
              return;
            }
            createRedirect({ body: { fromPath, toPath: String(form.get("toPath")).trim(), statusCode, isActive } })
              .unwrap()
              .then(
                (saved) => {
                  notifySaved(`${saved.fromPath} now redirects to ${saved.toPath}`);
                  setOpen(false);
                },
                (error) => {
                  setErrors(fieldErrors(error));
                  notifyError(error);
                },
              );
          }}
        >
          <DialogHeader>
            <DialogTitle>New redirect</DialogTitle>
            <DialogDescription>
              If the old path already redirects, this replaces it. Redirects pointing at the old path are updated too.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={errors.fromPath ? true : undefined}>
              <FieldLabel htmlFor="redirect-from">From path</FieldLabel>
              <Input id="redirect-from" name="fromPath" required placeholder="/old-page" className="font-mono" />
              <FieldError>{errors.fromPath?.[0]}</FieldError>
            </Field>
            <Field data-invalid={errors.toPath ? true : undefined}>
              <FieldLabel htmlFor="redirect-to">To</FieldLabel>
              <Input id="redirect-to" name="toPath" required placeholder="/new-page" className="font-mono" />
              <FieldDescription>A path on this store or a full URL.</FieldDescription>
              <FieldError>{errors.toPath?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="redirect-status">Type</FieldLabel>
              <Select value={String(statusCode)} onValueChange={(v) => setStatusCode(v === "302" ? 302 : 301)}>
                <SelectTrigger id="redirect-status" className="w-full sm:w-72">
                  <SelectValue>{statusCode === 301 ? "301 · permanent" : "302 · temporary"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 · permanent</SelectItem>
                  <SelectItem value="302">302 · temporary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <Switch id="redirect-active" checked={isActive} onCheckedChange={setIsActive} />
              <FieldLabel htmlFor="redirect-active">Active</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={create.isLoading}>
              Save redirect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
