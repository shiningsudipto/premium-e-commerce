"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import { ImageIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  useGetV1AdminCategoriesQuery,
  useGetV1AdminProductsQuery,
  type GetV1AdminProductsApiArg,
  type GetV1AdminProductsApiResponse,
} from "../../store/api.generated";
import { Can } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { useTableFilters, type FilterDef } from "../../components/data-table/use-table-filters";
import { formatDateTime } from "../../lib/format";
import { PUBLISH_LABEL, publishState, type PublishState } from "./product-form";

type ProductRow = GetV1AdminProductsApiResponse["items"][number];

const PAGE_SIZE = 25;

export const STATE_BADGE: Record<PublishState, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  scheduled: "secondary",
  draft: "outline",
  archived: "destructive",
};

const columns: ColumnDef<ProductRow>[] = [
  {
    header: "Product",
    cell: ({ row: { original: p } }) => (
      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 hover:underline">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
          <img src={p.image.url} alt={p.image.alt ?? ""} className="size-9 rounded-md border object-cover" />
        ) : (
          <span className="grid size-9 place-items-center rounded-md border bg-muted text-muted-foreground">
            <ImageIcon className="size-4" aria-hidden />
          </span>
        )}
        <span className="space-y-0.5">
          <span className="block font-medium">{p.title}</span>
          <span className="block font-mono text-[11px] text-muted-foreground">{p.handle}</span>
        </span>
      </Link>
    ),
  },
  {
    header: "Status",
    cell: ({ row: { original: p } }) => {
      const state = publishState(p);
      return (
        <Badge
          variant={STATE_BADGE[state]}
          title={state === "scheduled" ? `Goes live ${formatDateTime(p.publishAt)}` : undefined}
        >
          {PUBLISH_LABEL[state]}
        </Badge>
      );
    },
  },
  { header: "Vendor", cell: ({ row: { original: p } }) => <span className="text-xs">{p.vendor ?? "—"}</span> },
  {
    header: "Variants",
    cell: ({ row: { original: p } }) => <span className="text-xs tabular-nums">{p.variantCount}</span>,
  },
  {
    header: "Updated",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(p.updatedAt)}</span>
    ),
  },
];

// Product list (spec §6.2): search by title or SKU, filter by status, vendor and category.
export function ProductsScreen() {
  const categories = useGetV1AdminCategoriesQuery({});
  const filterDefs = useMemo<FilterDef[]>(
    () => [
      { key: "q", label: "Search", type: "text", placeholder: "Title or SKU" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ACTIVE", label: "Active" },
          { value: "DRAFT", label: "Draft" },
          { value: "ARCHIVED", label: "Archived" },
        ],
      },
      { key: "vendor", label: "Vendor", type: "text" },
      {
        key: "categoryId",
        label: "Category",
        type: "select",
        options: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
      },
    ],
    [categories.data],
  );
  const filters = useTableFilters(filterDefs);
  const pages = useCursorPages(filters.key);
  const products = useGetV1AdminProductsQuery({
    ...(filters.values as Partial<GetV1AdminProductsApiArg>),
    limit: PAGE_SIZE,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalog. Products start as drafts; publishing makes them visible on the storefront."
        actions={
          <Can permission="products.write">
            <Link href="/admin/products/new" className={buttonVariants({ size: "sm" })}>
              <PlusIcon /> New product
            </Link>
          </Can>
        }
      />
      <DataTable
        tableKey="products"
        columns={columns}
        data={products.data?.items}
        loading={products.isFetching}
        error={products.error}
        getRowId={(p) => p.id}
        filters={filterDefs}
        emptyMessage="No products match these filters."
        pagination={{
          page: pages.page,
          hasNext: !!products.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(products.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}
