"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminCustomersIdQuery,
  useGetV1AdminOrdersQuery,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { AddressBlock } from "../orders/address-block";
import { ORDER_STATUS_LABELS, orderStatusVariant } from "../orders/order-actions";
import { customerName } from "./customers-screen";

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

// Customer profile (spec §6.6), read-only: contact details, addresses, order stats and the
// latest orders.
export function CustomerDetailScreen({ id }: { id: string }) {
  const customer = useGetV1AdminCustomersIdQuery({ id });
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const canReadOrders = useCan("orders.read");
  const orders = useGetV1AdminOrdersQuery({ customerId: id, limit: 10 }, { skip: !canReadOrders });

  if (customer.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(customer.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!customer.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  const c = customer.data;
  // stats are summed in the store's currency; recent orders tell which one
  const currency = orders.data?.items[0]?.currency ?? DEFAULT_CURRENCY;
  const group = groups.data?.find((g) => g.id === c.groupId);

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Customers
      </Link>
      <PageHeader
        title={customerName(c) || c.email || c.phone || "Unnamed customer"}
        description={`Customer since ${formatDateTime(c.createdAt)}`}
      />

      {(c.anonymizedAt || c.deletionRequestedAt || c.archivedAt) && (
        <Alert className="mb-4">
          <AlertDescription>
            {c.anonymizedAt
              ? `Personal data was anonymized on ${formatDateTime(c.anonymizedAt)}.`
              : c.deletionRequestedAt
                ? `The customer asked for their account to be deleted on ${formatDateTime(c.deletionRequestedAt)}.`
                : `Archived on ${formatDateTime(c.archivedAt)}.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Orders" value={c.stats.orderCount} />
        <Stat label="Lifetime value" value={formatMoney(c.stats.lifetimeValueMinor, currency)} />
        <Stat label="Average order" value={formatMoney(c.stats.averageOrderMinor, currency)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium">Recent orders</h2>
            {canReadOrders && (
              <Link
                href={`/admin/orders?customerId=${encodeURIComponent(c.id)}`}
                className="text-xs underline-offset-4 hover:underline"
              >
                View all orders
              </Link>
            )}
          </div>
          {!canReadOrders ? (
            <p className="text-sm text-muted-foreground">Your role can&apos;t see orders.</p>
          ) : orders.error ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage(orders.error)}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Order</TableHead>
                    <TableHead>Placed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.isLoading && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  )}
                  {orders.data?.items.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {orders.data?.items.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                        >
                          {o.displayNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(o.placedAt ?? o.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={orderStatusVariant(o.status)}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatMoney(o.totalMinor, o.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="space-y-2 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">Contact</h2>
            <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-1 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate">{c.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{c.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Account</dt>
              <dd>{c.hasAccount ? "Registered" : "Guest"}</dd>
              <dt className="text-muted-foreground">Marketing</dt>
              <dd>{c.acceptsMarketing ? "Subscribed" : "Not subscribed"}</dd>
              <dt className="text-muted-foreground">Group</dt>
              <dd>{group?.name ?? (c.groupId ? c.groupId : "—")}</dd>
              {c.roles.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Roles</dt>
                  <dd>{c.roles.join(", ")}</dd>
                </>
              )}
            </dl>
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {c.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">Addresses</h2>
            {c.addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses.</p>}
            {c.addresses.map((a) => (
              <div key={a.id} className="space-y-1 border-t pt-3 first-of-type:border-t-0 first-of-type:pt-0">
                <div className="flex flex-wrap gap-1">
                  {a.label && <span className="text-xs font-medium">{a.label}</span>}
                  {a.isDefaultShipping && <Badge variant="secondary">Default shipping</Badge>}
                  {a.isDefaultBilling && <Badge variant="secondary">Default billing</Badge>}
                </div>
                <AddressBlock address={{ ...a, country: String(a.country) }} />
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
