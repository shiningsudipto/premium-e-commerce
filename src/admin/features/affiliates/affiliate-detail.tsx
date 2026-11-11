"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsQuery,
  useGetV1AdminAffiliatesConfigTiersQuery,
  useGetV1AdminAffiliatesIdEarningsQuery,
  useGetV1AdminAffiliatesIdPayoutsQuery,
  useGetV1AdminAffiliatesIdQuery,
  usePatchV1AdminAffiliatesIdMutation,
  usePatchV1AdminAffiliatesLinksIdMutation,
  usePostV1AdminAffiliatesPayoutsIdApproveMutation,
  usePostV1AdminAffiliatesPayoutsIdCancelMutation,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { Can, useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime, shortId } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { AdjustmentDialog, MarkPayoutPaidDialog, PreparePayoutDialog, StatusActionDialog } from "./affiliate-dialogs";
import {
  AFFILIATE_STATUS_LABELS,
  affiliateStatusVariant,
  customerLabel,
  EARNING_KIND_LABELS,
  EARNING_STATUS_LABELS,
  fieldLabel,
  fieldValue,
  LINK_STATUS_LABELS,
  linkActions,
  payoutActions,
  payoutMethodLabel,
  PAYOUT_STATUS_LABELS,
  payoutStatusVariant,
  REWARD_TYPE_LABELS,
  statusActions,
  type Affiliate,
  type AffiliateLink,
  type Earning,
  type Payout,
} from "./affiliate-logic";

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-card p-4" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// ── Profile settings: tier and notes ─────────────────────────────────────────

function TierCard({ affiliate, canManage }: { affiliate: Affiliate; canManage: boolean }) {
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});
  const [update, state] = usePatchV1AdminAffiliatesIdMutation();
  const [tierId, setTierId] = useState(affiliate.tierId ?? "none");
  const current = affiliate.tierId ?? "none";
  const label = (id: string) =>
    id === "none" ? "No tier" : (tiers.data?.find((t) => t.id === id)?.name ?? affiliate.tier?.name ?? id);

  return (
    <Card title="Tier">
      {affiliate.tier && (
        <p className="text-xs text-muted-foreground">
          Earns {REWARD_TYPE_LABELS[affiliate.tier.rewardType].toLowerCase()}
          {affiliate.tier.autoApprove ? "; applications on this tier are approved automatically" : ""}.
        </p>
      )}
      {canManage ? (
        <div className="flex items-end gap-2">
          <Field className="flex-1">
            <FieldLabel htmlFor="affiliate-tier">Tier</FieldLabel>
            <Select value={tierId} onValueChange={(v) => setTierId(v ?? "none")}>
              <SelectTrigger id="affiliate-tier" className="w-full">
                <SelectValue>{label(tierId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tier</SelectItem>
                {tiers.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button
            size="sm"
            disabled={tierId === current || state.isLoading}
            onClick={() =>
              update({
                id: affiliate.id,
                body: { version: affiliate.version, tierId: tierId === "none" ? null : tierId },
              })
                .unwrap()
                .then(() => notifySaved(`Tier changed to ${label(tierId)}`), notifyError)
            }
          >
            Change
          </Button>
        </div>
      ) : (
        <p className="text-sm">{label(current)}</p>
      )}
    </Card>
  );
}

function NotesCard({ affiliate, canManage }: { affiliate: Affiliate; canManage: boolean }) {
  const [update, state] = usePatchV1AdminAffiliatesIdMutation();
  const [notes, setNotes] = useState(affiliate.notes ?? "");
  const changed = notes !== (affiliate.notes ?? "");
  if (!canManage)
    return (
      <Card title="Notes">
        <p className="text-sm whitespace-pre-wrap">{affiliate.notes || "No notes."}</p>
      </Card>
    );
  return (
    <Card title="Notes">
      <Field>
        <FieldLabel htmlFor="affiliate-notes" className="sr-only">
          Internal notes
        </FieldLabel>
        <Textarea
          id="affiliate-notes"
          value={notes}
          maxLength={5000}
          rows={4}
          onChange={(e) => setNotes(e.target.value)}
        />
        <FieldDescription>Only staff see these.</FieldDescription>
      </Field>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!changed || state.isLoading}
          onClick={() =>
            update({ id: affiliate.id, body: { version: affiliate.version, notes: notes.trim() ? notes : null } })
              .unwrap()
              .then(() => notifySaved("Notes saved"), notifyError)
          }
        >
          Save notes
        </Button>
      </div>
    </Card>
  );
}

function PayoutMethodsCard({ affiliateId }: { affiliateId: string }) {
  const methods = useGetV1AdminAffiliateProgramAffiliatesIdPayoutMethodsQuery({ id: affiliateId });
  return (
    <Card title="Payout methods">
      {methods.error ? (
        <p className="text-xs text-destructive">{errorMessage(methods.error)}</p>
      ) : methods.isLoading ? (
        <Skeleton className="h-5 w-full" />
      ) : !methods.data?.length ? (
        <p className="text-sm text-muted-foreground">None added yet. Payouts are recorded by hand.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {methods.data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2">
              <span>{m.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{m.masked}</span>
              <span className="text-xs text-muted-foreground">({payoutMethodLabel(m.type)})</span>
              {m.isDefault && <Badge variant="secondary">Default</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Referral codes ───────────────────────────────────────────────────────────

function LinkActions({ link }: { link: AffiliateLink }) {
  const [setStatus] = usePatchV1AdminAffiliatesLinksIdMutation();
  return (
    <div className="flex justify-end gap-2">
      {linkActions(link.status).map((to) => (
        <ConfirmDialog
          key={to}
          trigger={
            <Button size="xs" variant={to === "ACTIVE" ? "default" : "outline"}>
              {to === "ACTIVE" ? (link.status === "PENDING_APPROVAL" ? "Approve" : "Enable") : "Disable"}
            </Button>
          }
          title={to === "ACTIVE" ? `Activate code ${link.code}?` : `Disable code ${link.code}?`}
          description={
            to === "ACTIVE"
              ? "Referrals with this code are credited to the affiliate."
              : "Links with this code stop crediting the affiliate. You can enable it again later."
          }
          confirmLabel={to === "ACTIVE" ? "Activate" : "Disable"}
          destructive={to === "DISABLED"}
          onConfirm={() =>
            setStatus({ id: link.id, body: { status: to } })
              .unwrap()
              .then(() => notifySaved(`Code ${link.code} ${to === "ACTIVE" ? "activated" : "disabled"}`), notifyError)
          }
        />
      ))}
    </div>
  );
}

function LinksTable({ links, canManage }: { links: AffiliateLink[]; canManage: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Landing page</TableHead>
            <TableHead>Status</TableHead>
            {canManage && (
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                No codes yet. A default code is created on approval.
              </TableCell>
            </TableRow>
          )}
          {links.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-mono text-xs font-medium">
                {l.code}
                {l.isDefault && (
                  <Badge variant="outline" className="ml-2">
                    Default
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs">{l.label ?? "—"}</TableCell>
              <TableCell className="text-xs">{l.targetPath ?? "Home page"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    l.status === "ACTIVE" ? "default" : l.status === "PENDING_APPROVAL" ? "secondary" : "outline"
                  }
                >
                  {LINK_STATUS_LABELS[l.status]}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  <LinkActions link={l} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Earnings ledger ──────────────────────────────────────────────────────────

const earningColumns: ColumnDef<Earning>[] = [
  {
    header: "Date",
    cell: ({ row: { original: e } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(e.createdAt)}</span>
    ),
  },
  {
    header: "Type",
    cell: ({ row: { original: e } }) => (
      <span className="text-xs">
        {EARNING_KIND_LABELS[e.kind]}
        {e.rewardType !== "CASH" && (
          <span className="text-muted-foreground"> · {REWARD_TYPE_LABELS[e.rewardType]}</span>
        )}
      </span>
    ),
  },
  {
    header: "Status",
    cell: ({ row: { original: e } }) => (
      <Badge variant={e.status === "REVERSED" ? "outline" : e.status === "PENDING" ? "secondary" : "default"}>
        {EARNING_STATUS_LABELS[e.status]}
        {e.status === "APPROVED" && e.payoutId ? " · in payout" : ""}
      </Badge>
    ),
  },
  {
    header: "Amount",
    cell: ({ row: { original: e } }) => (
      <span className={`text-xs tabular-nums ${e.amountMinor < 0 ? "text-destructive" : ""}`}>
        {formatMoney(e.amountMinor, e.currency)}
      </span>
    ),
  },
  {
    header: "Details",
    cell: ({ row: { original: e } }) => (
      <div className="max-w-sm text-xs">
        {e.orderId && (
          <Link
            href={`/admin/orders/${e.orderId}`}
            className="font-mono underline-offset-4 hover:underline"
            title={e.orderId}
          >
            Order {shortId(e.orderId)}
          </Link>
        )}
        {e.reason && <p className="text-muted-foreground">{e.reason}</p>}
        {e.status === "PENDING" && (
          <p className="text-muted-foreground">
            {e.approvableAt ? `Hold ends ${formatDateTime(e.approvableAt)}` : "Hold starts when the order is delivered"}
          </p>
        )}
      </div>
    ),
  },
];

function EarningsLedger({ affiliate }: { affiliate: Affiliate }) {
  const pages = useCursorPages();
  const earnings = useGetV1AdminAffiliatesIdEarningsQuery({
    id: affiliate.id,
    limit: 25,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  return (
    <Section
      title="Earnings ledger"
      description="Commission, adjustments and reversals; balances are computed from these entries."
      actions={
        <Can permission="affiliates.earnings.adjust">
          <AdjustmentDialog affiliateId={affiliate.id} currency={affiliate.balances.currency ?? DEFAULT_CURRENCY} />
        </Can>
      }
    >
      <DataTable
        tableKey="affiliate-earnings"
        columns={earningColumns}
        data={earnings.data?.items}
        loading={earnings.isFetching}
        error={earnings.error}
        getRowId={(e) => e.id}
        emptyMessage="No earnings yet."
        pagination={{
          page: pages.page,
          hasNext: !!earnings.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(earnings.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </Section>
  );
}

// ── Payouts ──────────────────────────────────────────────────────────────────

function PayoutRowActions({ payout }: { payout: Payout }) {
  const canApprove = useCan("affiliates.payouts.approve");
  const canPrepare = useCan("affiliates.payouts.prepare");
  const [approve] = usePostV1AdminAffiliatesPayoutsIdApproveMutation();
  const [cancel] = usePostV1AdminAffiliatesPayoutsIdCancelMutation();
  const amount = formatMoney(payout.amountMinor, payout.currency);
  const actions = payoutActions(payout.status, (p) =>
    p === "affiliates.payouts.approve" ? canApprove : p === "affiliates.payouts.prepare" ? canPrepare : false,
  );
  if (!actions.length) return null;
  return (
    <div className="flex justify-end gap-2">
      {actions.includes("approve") && (
        <ConfirmDialog
          trigger={<Button size="xs">Approve</Button>}
          title={`Approve the ${amount} payout?`}
          description="Once approved, send the money and record the payment reference."
          confirmLabel="Approve payout"
          onConfirm={() =>
            approve({ id: payout.id })
              .unwrap()
              .then(() => notifySaved("Payout approved"), notifyError)
          }
        />
      )}
      {actions.includes("markPaid") && <MarkPayoutPaidDialog payout={payout} />}
      {actions.includes("cancel") && (
        <ConfirmDialog
          trigger={
            <Button size="xs" variant="outline">
              Cancel
            </Button>
          }
          title={`Cancel the ${amount} payout?`}
          description="Its earnings go back to the approved balance and can be paid out later."
          confirmLabel="Cancel payout"
          destructive
          onConfirm={() =>
            cancel({ id: payout.id })
              .unwrap()
              .then(() => notifySaved("Payout cancelled"), notifyError)
          }
        />
      )}
    </div>
  );
}

const payoutColumns: ColumnDef<Payout>[] = [
  {
    header: "Date",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs whitespace-nowrap">{formatDateTime(p.createdAt)}</span>
    ),
  },
  {
    header: "Amount",
    cell: ({ row: { original: p } }) => (
      <span className="text-xs font-medium tabular-nums">{formatMoney(p.amountMinor, p.currency)}</span>
    ),
  },
  {
    header: "Status",
    cell: ({ row: { original: p } }) => (
      <Badge variant={payoutStatusVariant(p.status)}>{PAYOUT_STATUS_LABELS[p.status]}</Badge>
    ),
  },
  {
    header: "Method",
    cell: ({ row: { original: p } }) => <span className="text-xs">{payoutMethodLabel(p.method)}</span>,
  },
  {
    header: "Reference",
    cell: ({ row: { original: p } }) => (
      <div className="text-xs">
        <span className="font-mono">{p.providerRef ?? "—"}</span>
        {p.paidAt && <p className="text-muted-foreground">Paid {formatDateTime(p.paidAt)}</p>}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row: { original: p } }) => <PayoutRowActions payout={p} />,
  },
];

function Payouts({ affiliate }: { affiliate: Affiliate }) {
  const pages = useCursorPages();
  const payouts = useGetV1AdminAffiliatesIdPayoutsQuery({
    id: affiliate.id,
    limit: 10,
    ...(pages.cursor ? { cursor: pages.cursor } : {}),
  });
  const currency = affiliate.balances.currency ?? DEFAULT_CURRENCY;
  return (
    <Section
      title="Payouts"
      description="Manual payouts: prepare from the approved cash balance, an Owner approves, then record the payment."
      actions={
        <Can permission="affiliates.payouts.prepare">
          <PreparePayoutDialog
            affiliateId={affiliate.id}
            payableMinor={affiliate.balances.payableMinor}
            currency={currency}
          />
        </Can>
      }
    >
      <DataTable
        tableKey="affiliate-payouts"
        columns={payoutColumns}
        data={payouts.data?.items}
        loading={payouts.isFetching}
        error={payouts.error}
        getRowId={(p) => p.id}
        emptyMessage="No payouts yet."
        pagination={{
          page: pages.page,
          hasNext: !!payouts.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(payouts.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </Section>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

// Affiliate profile (spec §7.8): status decisions, tier, notes, codes, stats, earnings and payouts.
export function AffiliateDetailScreen({ id }: { id: string }) {
  const affiliate = useGetV1AdminAffiliatesIdQuery({ id });
  const canManage = useCan("affiliates.manage");

  if (affiliate.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(affiliate.error)}</AlertDescription>
      </Alert>
    );
  }
  if (!affiliate.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  const a = affiliate.data;
  const name = customerLabel(a.customer);
  const currency = a.balances.currency ?? DEFAULT_CURRENCY;
  const application = Object.entries(a.application);

  return (
    <>
      <Link
        href={a.status === "PENDING" ? "/admin/affiliates" : "/admin/affiliates?tab=affiliates"}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Affiliates
      </Link>
      <PageHeader
        title={name}
        description={`${a.status === "PENDING" ? "Applied" : "Affiliate since"} ${formatDateTime(a.createdAt)}`}
        actions={
          canManage &&
          statusActions(a.status).map((action) => (
            <StatusActionDialog key={action.key} affiliateId={a.id} name={name} action={action} />
          ))
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={affiliateStatusVariant(a.status)}>{AFFILIATE_STATUS_LABELS[a.status]}</Badge>
        {a.tier && <Badge variant="outline">{a.tier.name}</Badge>}
        <span className="font-mono text-xs text-muted-foreground" title="Affiliate ID (used in commission rules)">
          {a.id}
        </span>
      </div>

      {a.decisionReason && a.status !== "PENDING" && (
        <Alert className="mb-4">
          <AlertDescription>
            {AFFILIATE_STATUS_LABELS[a.status]}
            {a.decidedAt ? ` on ${formatDateTime(a.decidedAt)}` : ""}: {a.decisionReason}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clicks (30 days)" value={a.stats.clicks.toLocaleString("en")} />
        <Stat
          label="Orders (30 days)"
          value={a.stats.conversions.toLocaleString("en")}
          hint={`${(a.stats.conversionRate * 100).toFixed(1)}% conversion`}
        />
        <Stat label="Sales (30 days)" value={formatMoney(a.stats.salesMinor, currency)} />
        <Stat label="Paid out" value={formatMoney(a.balances.paidMinor, currency)} />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={formatMoney(a.balances.pendingMinor, currency)} hint="In the hold period" />
        <Stat
          label="Payable"
          value={formatMoney(a.balances.payableMinor, currency)}
          hint="Approved cash not in a payout"
        />
        <Stat
          label="In payouts"
          value={formatMoney(a.balances.inPayoutMinor, currency)}
          hint="Prepared or approved, not paid"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-8">
          <Section title="Referral codes" description="Vanity codes requested by the affiliate wait for approval.">
            <LinksTable links={a.links} canManage={canManage} />
          </Section>
          <EarningsLedger affiliate={a} />
          <Payouts affiliate={a} />
        </div>

        <aside className="space-y-4">
          <Card title="Customer">
            <p className="text-sm font-medium">{name}</p>
            {a.customer.email && <p className="text-xs break-all text-muted-foreground">{a.customer.email}</p>}
            <Link href={`/admin/customers/${a.customer.id}`} className="text-xs underline-offset-4 hover:underline">
              Open customer profile
            </Link>
            <p className="text-xs text-muted-foreground">
              Terms {a.termsVersion ? `version ${a.termsVersion}` : "not accepted"}
              {a.termsAcceptedAt ? `, accepted ${formatDateTime(a.termsAcceptedAt)}` : ""}
            </p>
          </Card>
          <Card title="Application">
            {application.length ? (
              <dl className="space-y-2 text-sm">
                {application.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">{fieldLabel(key)}</dt>
                    <dd className="break-words">{fieldValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No answers.</p>
            )}
          </Card>
          <TierCard key={`tier-${a.version}`} affiliate={a} canManage={canManage} />
          <NotesCard key={`notes-${a.version}`} affiliate={a} canManage={canManage} />
          <PayoutMethodsCard affiliateId={a.id} />
        </aside>
      </div>
    </>
  );
}
