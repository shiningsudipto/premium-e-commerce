"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CheckIcon, DownloadIcon, TableIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCan, useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminMarketsQuery,
  useGetV1AdminReportsCustomersQuery,
  useGetV1AdminReportsProductsQuery,
  useGetV1AdminReportsPromotionsQuery,
  useGetV1AdminReportsSalesQuery,
  useGetV1AdminReportsSearchQuery,
} from "../../store/api.generated";
import { saveTextFile } from "../data/download";
import { InlineBar, KpiTile, TimeSeriesChart, type ChartPoint } from "./charts";
import {
  PRESETS,
  autoInterval,
  customRangeError,
  fillPeriods,
  parseRangeParams,
  periodLabel,
  previousRange,
  resolveRange,
  toDateInput,
  type Interval,
  type Range,
  type RangeChoice,
} from "./dates";
import {
  customerName,
  customersCsv,
  productsCsv,
  promotionsCsv,
  reportFileName,
  salesCsv,
  searchCsv,
  type CustomersReport,
  type ProductRow,
  type PromotionRow,
  type SalesPoint,
  type SearchReport,
} from "./report-csv";
import { axisNumber, change, formatCount, moneyCompact } from "./scale";

// "Now" is read once in the browser after mount (never while prerendering) and refreshed
// when staff pick a preset, so "last 7 days" means up to today.
let nowSnapshot: number | null = null;
const nowListeners = new Set<() => void>();
const nowStore = {
  subscribe: (fn: () => void) => {
    nowListeners.add(fn);
    return () => nowListeners.delete(fn);
  },
  get: () => (nowSnapshot ??= Date.now()),
  server: () => null,
  refresh: () => {
    nowSnapshot = Date.now();
    nowListeners.forEach((fn) => fn());
  },
};
const useNow = () => useSyncExternalStore(nowStore.subscribe, nowStore.get, nowStore.server);

const INTERVALS: { value: Interval | "auto"; label: string }[] = [
  { value: "auto", label: "Automatic" },
  { value: "day", label: "By day" },
  { value: "week", label: "By week" },
  { value: "month", label: "By month" },
];

type Filters = {
  choice: RangeChoice;
  range: Range;
  interval: Interval;
  currency: string;
  iso: { from: string; to: string };
};

// Reports (spec §6.12): sales, products, promotions, search and customers for one date range
// and currency. Filters live in the URL (?range=30d or ?range=custom&from=&to=, ?interval=,
// ?currency=) so a view can be shared.
export function ReportsScreen() {
  const me = useMe();
  const allowed = useCan("analytics.read");
  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, best-selling products, promotion performance, what shoppers search for and who's buying. Cancelled and draft orders are left out."
      />
      {!me.data ? (
        <Skeleton className="h-96 w-full" />
      ) : !allowed ? (
        <Alert>
          <AlertDescription>Your role can&apos;t see store reports (analytics.read).</AlertDescription>
        </Alert>
      ) : (
        <ReportsBody />
      )}
    </>
  );
}

function useCurrencies() {
  const canSeeMarkets = useCan("settings.read");
  const markets = useGetV1AdminMarketsQuery({}, { skip: !canSeeMarkets });
  const list = markets.data?.filter((m) => m.isActive) ?? [];
  const currencies = [...new Set(list.map((m) => m.currency.toUpperCase()))];
  const fallback = (list.find((m) => m.isDefault) ?? list[0])?.currency.toUpperCase() ?? DEFAULT_CURRENCY;
  return {
    currencies: currencies.length ? currencies : [fallback],
    fallback,
    ready: !canSeeMarkets || !markets.isLoading,
  };
}

function ReportsBody() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useNow();
  const { currencies, fallback, ready } = useCurrencies();

  const choice = parseRangeParams(params);
  const requestedInterval = params.get("interval");
  const requestedCurrency = params.get("currency")?.toUpperCase();
  const currency = requestedCurrency && currencies.includes(requestedCurrency) ? requestedCurrency : fallback;

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  if (now === null || !ready) return <Skeleton className="h-96 w-full" />;
  const range = resolveRange(choice, new Date(now));
  const interval: Interval = INTERVALS.some((i) => i.value === requestedInterval && i.value !== "auto")
    ? (requestedInterval as Interval)
    : autoInterval(range.days);
  const filters: Filters = {
    choice,
    range,
    interval,
    currency,
    iso: { from: range.from.toISOString(), to: range.to.toISOString() },
  };

  return (
    <div className="space-y-8">
      <FilterBar
        choice={choice}
        range={range}
        intervalChoice={(INTERVALS.find((i) => i.value === requestedInterval)?.value ?? "auto") as Interval | "auto"}
        interval={interval}
        currency={currency}
        currencies={currencies}
        now={now}
        onPreset={(id) => {
          nowStore.refresh();
          update({ range: id, from: null, to: null });
        }}
        onCustom={(from, to) => update({ range: "custom", from, to })}
        onInterval={(v) => update({ interval: v === "auto" ? null : v })}
        onCurrency={(v) => update({ currency: v })}
      />
      <SalesSection filters={filters} />
      <ProductsSection filters={filters} />
      <PromotionsSection filters={filters} />
      <SearchSection filters={filters} />
      <CustomersSection filters={filters} />
    </div>
  );
}

function FilterBar({
  choice,
  range,
  intervalChoice,
  interval,
  currency,
  currencies,
  now,
  onPreset,
  onCustom,
  onInterval,
  onCurrency,
}: {
  choice: RangeChoice;
  range: Range;
  intervalChoice: Interval | "auto";
  interval: Interval;
  currency: string;
  currencies: string[];
  now: number;
  onPreset: (id: string) => void;
  onCustom: (from: string, to: string) => void;
  onInterval: (v: Interval | "auto") => void;
  onCurrency: (v: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(choice.preset === "custom");
  const [from, setFrom] = useState(choice.preset === "custom" ? choice.from : toDateInput(range.from));
  const [to, setTo] = useState(choice.preset === "custom" ? choice.to : toDateInput(range.to));
  const [touched, setTouched] = useState(false);
  const problem = customRangeError(from, to);
  const today = toDateInput(new Date(now));
  const intervalItems = INTERVALS.map((i) => ({
    value: i.value,
    label: i.value === "auto" ? `Automatic (${interval})` : i.label,
  }));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4" role="search" aria-label="Report filters">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-medium text-muted-foreground">Date range</legend>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => {
              const on = choice.preset === p.id && !customOpen;
              return (
                <Button
                  key={p.id}
                  size="sm"
                  variant={on ? "secondary" : "ghost"}
                  aria-pressed={on}
                  onClick={() => {
                    setCustomOpen(false);
                    onPreset(p.id);
                  }}
                >
                  {on && <CheckIcon aria-hidden className="stroke-3" />}
                  {p.label}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant={customOpen ? "secondary" : "ghost"}
              aria-pressed={customOpen}
              aria-expanded={customOpen}
              aria-controls="custom-range"
              onClick={() => setCustomOpen(true)}
            >
              {customOpen && <CheckIcon aria-hidden className="stroke-3" />}
              Custom
            </Button>
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <label htmlFor="report-interval" className="block text-xs font-medium text-muted-foreground">
            Group by
          </label>
          <Select
            items={intervalItems}
            value={intervalChoice}
            onValueChange={(v) => onInterval(v as Interval | "auto")}
          >
            <SelectTrigger id="report-interval" size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervalItems.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="report-currency" className="block text-xs font-medium text-muted-foreground">
            Currency
          </label>
          {currencies.length > 1 ? (
            <Select
              items={currencies.map((c) => ({ value: c, label: c }))}
              value={currency}
              onValueChange={(v) => v && onCurrency(String(v))}
            >
              <SelectTrigger id="report-currency" size="sm" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p id="report-currency" className="flex h-7 items-center text-sm">
              {currency}
            </p>
          )}
        </div>
      </div>

      {customOpen && (
        <form
          id="custom-range"
          className="flex flex-wrap items-end gap-3 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!problem) onCustom(from, to);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="range-from" className="block text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input
              id="range-from"
              type="date"
              className="h-8 w-40"
              max={today}
              value={from}
              aria-invalid={touched && problem ? true : undefined}
              aria-describedby={touched && problem ? "range-problem" : undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="range-to" className="block text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input
              id="range-to"
              type="date"
              className="h-8 w-40"
              value={to}
              aria-invalid={touched && problem ? true : undefined}
              aria-describedby={touched && problem ? "range-problem" : undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            Apply range
          </Button>
          {touched && problem && (
            <p id="range-problem" role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}
        </form>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {range.label.toLowerCase().startsWith("last") ? range.label.toLowerCase() : range.label}, grouped by{" "}
        {interval}, in {currency}.
      </p>
    </div>
  );
}

// ── shared pieces ──

function ReportCard({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-0.5">
          <h2 id={id} className="text-base font-medium">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function CsvButton({ onClick, label = "Download CSV" }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <DownloadIcon /> {label}
    </Button>
  );
}

function QueryError({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{errorMessage(error)}</AlertDescription>
    </Alert>
  );
}

function Head({ children, numeric }: { children: ReactNode; numeric?: boolean }) {
  return (
    <TableHead
      scope="col"
      className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", numeric && "text-right")}
    >
      {children}
    </TableHead>
  );
}

function Num({ children, className }: { children: ReactNode; className?: string }) {
  return <TableCell className={cn("text-right text-sm tabular-nums", className)}>{children}</TableCell>;
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

const rangeArgs = (f: Filters) => ({ from: f.iso.from, to: f.iso.to, currency: f.currency });

// ── sales ──

type Measure = "net" | "orders" | "aov";
const MEASURES: { id: Measure; label: string; value: (p: SalesPoint) => number; money: boolean }[] = [
  { id: "net", label: "Net sales", value: (p) => p.netMinor, money: true },
  { id: "orders", label: "Orders", value: (p) => p.orders, money: false },
  { id: "aov", label: "Average order value", value: (p) => p.averageOrderMinor, money: true },
];

const emptyPoint = (period: string): SalesPoint => ({
  period,
  orders: 0,
  grossMinor: 0,
  discountsMinor: 0,
  shippingMinor: 0,
  taxMinor: 0,
  netMinor: 0,
  refundsMinor: 0,
  averageOrderMinor: 0,
});

function SalesSection({ filters }: { filters: Filters }) {
  const { range, interval, currency } = filters;
  const prev = previousRange(range);
  const sales = useGetV1AdminReportsSalesQuery({ ...rangeArgs(filters), interval });
  const previous = useGetV1AdminReportsSalesQuery({
    from: prev.from.toISOString(),
    to: prev.to.toISOString(),
    currency,
    interval,
  });
  const [measure, setMeasure] = useState<Measure>("net");
  const [showTable, setShowTable] = useState(false);
  const money = (minor: number) => formatMoney(minor, currency);
  const t = sales.currentData?.totals;
  const p = previous.currentData?.totals;
  const comparison = `previous ${range.days} days`;
  const stale = sales.isFetching;

  const series = sales.data ? fillPeriods(sales.data.series, range, interval, emptyPoint) : [];
  const m = MEASURES.find((x) => x.id === measure)!;
  const points: ChartPoint[] = series.map((s) => ({
    key: s.period,
    label: periodLabel(s.period, interval),
    longLabel: periodLabel(s.period, interval, true),
    value: m.value(s),
  }));

  return (
    <>
      <section aria-labelledby="kpi-heading" className="space-y-3">
        <h2 id="kpi-heading" className="sr-only">
          Key figures
        </h2>
        {sales.error ? (
          <QueryError error={sales.error} />
        ) : !sales.data ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiTile
              label="Net sales"
              value={money(sales.data.totals.netMinor)}
              delta={t && previous.currentData ? change(t.netMinor, p?.netMinor) : undefined}
              comparison={comparison}
              stale={stale}
            />
            <KpiTile
              label="Orders"
              value={formatCount(sales.data.totals.orders)}
              delta={t && previous.currentData ? change(t.orders, p?.orders) : undefined}
              comparison={comparison}
              stale={stale}
            />
            <KpiTile
              label="Average order value"
              value={money(sales.data.totals.averageOrderMinor)}
              delta={t && previous.currentData ? change(t.averageOrderMinor, p?.averageOrderMinor) : undefined}
              comparison={comparison}
              stale={stale}
            />
            <KpiTile
              label="Discounts given"
              value={money(sales.data.totals.discountsMinor)}
              hint={`Gross sales ${money(sales.data.totals.grossMinor)}`}
              stale={stale}
            />
            <KpiTile
              label="Refunds"
              value={money(sales.data.totals.refundsMinor)}
              delta={t && previous.currentData ? change(t.refundsMinor, p?.refundsMinor) : undefined}
              upIsGood={false}
              comparison={comparison}
              stale={stale}
            />
          </dl>
        )}
      </section>

      <ReportCard
        id="sales-heading"
        title="Sales over time"
        description="Net sales is what customers paid: items after discounts, plus shipping and tax."
        actions={
          <>
            <Button size="sm" variant="ghost" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
              <TableIcon /> {showTable ? "Hide table" : "Show table"}
            </Button>
            <CsvButton
              onClick={() =>
                saveTextFile(reportFileName("sales", range.from, range.to), salesCsv(series, interval, currency))
              }
            />
          </>
        }
      >
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div role="group" aria-label="Measure" className="flex flex-wrap gap-1">
            {MEASURES.map((x) => (
              <Button
                key={x.id}
                size="sm"
                variant={x.id === measure ? "secondary" : "ghost"}
                aria-pressed={x.id === measure}
                onClick={() => setMeasure(x.id)}
              >
                {x.label}
              </Button>
            ))}
          </div>
          {sales.error ? (
            <QueryError error={sales.error} />
          ) : !sales.data ? (
            <Skeleton className="h-60 w-full" />
          ) : (
            <TimeSeriesChart
              title={`${m.label} ${interval === "day" ? "per day" : `per ${interval}`}`}
              points={points}
              stale={stale}
              formatValue={(v) => (m.money ? money(v) : formatCount(v))}
              formatTick={(v, max) => (m.money ? moneyCompact(v, currency, max) : axisNumber(v, max))}
            />
          )}
        </div>
        {showTable && sales.data && (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <caption className="sr-only">Sales per {interval}</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <Head>Period</Head>
                  <Head numeric>Orders</Head>
                  <Head numeric>Gross</Head>
                  <Head numeric>Discounts</Head>
                  <Head numeric>Shipping</Head>
                  <Head numeric>Tax</Head>
                  <Head numeric>Net</Head>
                  <Head numeric>Refunds</Head>
                  <Head numeric>Avg. order</Head>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((s) => (
                  <TableRow key={s.period}>
                    <TableCell className="text-sm whitespace-nowrap">{periodLabel(s.period, interval, true)}</TableCell>
                    <Num>{formatCount(s.orders)}</Num>
                    <Num>{money(s.grossMinor)}</Num>
                    <Num>{money(s.discountsMinor)}</Num>
                    <Num>{money(s.shippingMinor)}</Num>
                    <Num>{money(s.taxMinor)}</Num>
                    <Num className="font-medium">{money(s.netMinor)}</Num>
                    <Num>{money(s.refundsMinor)}</Num>
                    <Num>{money(s.averageOrderMinor)}</Num>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ReportCard>
    </>
  );
}

// ── products ──

const PRODUCT_LIMITS = [10, 25, 50];

function ProductsSection({ filters }: { filters: Filters }) {
  const { range, currency } = filters;
  const [limit, setLimit] = useState(10);
  const report = useGetV1AdminReportsProductsQuery({ ...rangeArgs(filters), limit });
  const rows: ProductRow[] = report.data ?? [];
  const max = Math.max(0, ...rows.map((r) => r.revenueMinor));
  const money = (minor: number | null) => formatMoney(minor, currency);

  return (
    <ReportCard
      id="products-heading"
      title="Top products"
      description="By revenue. Margin needs a cost on every order line; it's blank when one is missing."
      actions={
        <>
          <Select
            items={PRODUCT_LIMITS.map((n) => ({ value: String(n), label: `Top ${n}` }))}
            value={String(limit)}
            onValueChange={(v) => setLimit(Number(v) || 10)}
          >
            <SelectTrigger size="sm" aria-label="Number of products" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_LIMITS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Top {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CsvButton
            onClick={() =>
              saveTextFile(reportFileName("top-products", range.from, range.to), productsCsv(rows, currency))
            }
          />
        </>
      }
    >
      {report.error ? (
        <QueryError error={report.error} />
      ) : (
        <div
          className={cn("overflow-x-auto rounded-lg border bg-card", report.isFetching && report.data && "opacity-60")}
        >
          <Table>
            <caption className="sr-only">Top products by revenue</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <Head>#</Head>
                <Head>Product</Head>
                <Head numeric>Units</Head>
                <Head numeric>Revenue</Head>
                <TableHead className="w-40">
                  <span className="sr-only">Revenue bar</span>
                </TableHead>
                <Head numeric>Margin</Head>
                <Head numeric>Units refunded</Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!report.data && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {report.data && rows.length === 0 && <EmptyRow colSpan={7}>No sales in this period.</EmptyRow>}
              {rows.map((r, i) => (
                <TableRow key={r.productId}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell className="max-w-xs text-sm">
                    <Link href={`/admin/products/${r.productId}`} className="line-clamp-1 hover:underline">
                      {r.title}
                    </Link>
                  </TableCell>
                  <Num>{formatCount(r.units)}</Num>
                  <Num className="font-medium">{money(r.revenueMinor)}</Num>
                  <TableCell>
                    <InlineBar value={r.revenueMinor} max={max} />
                  </TableCell>
                  <Num>
                    {r.marginMinor === null ? <span className="text-muted-foreground">—</span> : money(r.marginMinor)}
                  </Num>
                  <Num>{formatCount(r.unitsRefunded)}</Num>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportCard>
  );
}

// ── promotions ──

function PromotionsSection({ filters }: { filters: Filters }) {
  const { range, currency } = filters;
  const report = useGetV1AdminReportsPromotionsQuery(rangeArgs(filters));
  const rows: PromotionRow[] = report.data ?? [];
  const max = Math.max(0, ...rows.map((r) => r.discountMinor));
  const money = (minor: number) => formatMoney(minor, currency);
  const totalDiscount = rows.reduce((s, r) => s + r.discountMinor, 0);

  return (
    <ReportCard
      id="promotions-heading"
      title="Promotions"
      description={
        rows.length
          ? `${rows.length} promotion${rows.length === 1 ? "" : "s"} used, costing ${money(totalDiscount)} in discounts.`
          : "Orders that used each promotion, what the discounts cost and the revenue those orders brought in."
      }
      actions={
        <CsvButton
          onClick={() =>
            saveTextFile(reportFileName("promotions", range.from, range.to), promotionsCsv(rows, currency))
          }
        />
      }
    >
      {report.error ? (
        <QueryError error={report.error} />
      ) : (
        <div
          className={cn("overflow-x-auto rounded-lg border bg-card", report.isFetching && report.data && "opacity-60")}
        >
          <Table>
            <caption className="sr-only">Promotion performance, by discount cost</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <Head>Promotion</Head>
                <Head numeric>Orders</Head>
                <Head numeric>Discount cost</Head>
                <TableHead className="w-40">
                  <span className="sr-only">Discount cost bar</span>
                </TableHead>
                <Head numeric>Order revenue</Head>
                <Head numeric>Avg. order</Head>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!report.data && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {report.data && rows.length === 0 && (
                <EmptyRow colSpan={6}>No promotions were used in this period.</EmptyRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.promotionId}>
                  <TableCell className="max-w-xs text-sm">
                    <span className="line-clamp-1">{r.name}</span>
                  </TableCell>
                  <Num>{formatCount(r.uses)}</Num>
                  <Num className="font-medium">{money(r.discountMinor)}</Num>
                  <TableCell>
                    <InlineBar value={r.discountMinor} max={max} />
                  </TableCell>
                  <Num>{money(r.revenueMinor)}</Num>
                  <Num>{money(r.averageOrderMinor)}</Num>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ReportCard>
  );
}

// ── search ──

function SearchSection({ filters }: { filters: Filters }) {
  const { range } = filters;
  const report = useGetV1AdminReportsSearchQuery({ from: filters.iso.from, to: filters.iso.to, limit: 20 });
  const data: SearchReport | undefined = report.data;
  const topMax = Math.max(0, ...(data?.topQueries.map((q) => q.searches) ?? []));
  const zeroMax = Math.max(0, ...(data?.zeroResultQueries.map((q) => q.searches) ?? []));
  const zeroTotal = data?.zeroResultQueries.reduce((s, q) => s + q.searches, 0) ?? 0;

  return (
    <ReportCard
      id="search-heading"
      title="Search"
      description={
        data?.available
          ? `${formatCount(data.totalSearches)} searches. Zero-result searches show what shoppers want but can't find.`
          : "What shoppers search for on the storefront, and which searches find nothing."
      }
      actions={
        data?.available ? (
          <CsvButton onClick={() => saveTextFile(reportFileName("search", range.from, range.to), searchCsv(data))} />
        ) : undefined
      }
    >
      {report.error ? (
        <QueryError error={report.error} />
      ) : !data ? (
        <Skeleton className="h-48 w-full" />
      ) : !data.available ? (
        <Alert>
          <AlertDescription>
            Search logs aren&apos;t available right now (the search log store isn&apos;t connected), so there&apos;s
            nothing to report.
          </AlertDescription>
        </Alert>
      ) : (
        <div className={cn("grid gap-4 lg:grid-cols-2", report.isFetching && "opacity-60")}>
          <SearchTable
            caption="Top searches"
            rows={data.topQueries.map((q) => ({
              query: q.query,
              searches: q.searches,
              extra: formatCount(q.averageResults),
            }))}
            extraHeader="Avg. results"
            max={topMax}
            empty="No searches in this period."
          />
          <SearchTable
            caption={`Searches with no results${zeroTotal ? ` (${formatCount(zeroTotal)} in the top ${data.zeroResultQueries.length})` : ""}`}
            rows={data.zeroResultQueries.map((q) => ({ query: q.query, searches: q.searches }))}
            max={zeroMax}
            empty="Every search found something."
          />
        </div>
      )}
    </ReportCard>
  );
}

function SearchTable({
  caption,
  rows,
  extraHeader,
  max,
  empty,
}: {
  caption: string;
  rows: { query: string; searches: number; extra?: string }[];
  extraHeader?: string;
  max: number;
  empty: string;
}) {
  const cols = extraHeader ? 4 : 3;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <caption className="px-3 pt-3 text-left text-sm font-medium">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <Head>Search</Head>
            <Head numeric>Searches</Head>
            <TableHead className="w-28">
              <span className="sr-only">Searches bar</span>
            </TableHead>
            {extraHeader && <Head numeric>{extraHeader}</Head>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow colSpan={cols}>{empty}</EmptyRow>}
          {rows.map((r) => (
            <TableRow key={r.query}>
              <TableCell className="max-w-48 font-mono text-xs">
                <span className="line-clamp-1">{r.query}</span>
              </TableCell>
              <Num>{formatCount(r.searches)}</Num>
              <TableCell>
                <InlineBar value={r.searches} max={max} />
              </TableCell>
              {extraHeader && <Num>{r.extra}</Num>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── customers ──

function CustomersSection({ filters }: { filters: Filters }) {
  const { range, interval, currency } = filters;
  const report = useGetV1AdminReportsCustomersQuery({ ...rangeArgs(filters), interval });
  const data: CustomersReport | undefined = report.data;
  const totals = (data?.series ?? []).reduce(
    (s, p) => ({
      newCustomers: s.newCustomers + p.newCustomers,
      returningOrders: s.returningOrders + p.returningOrders,
    }),
    { newCustomers: 0, returningOrders: 0 },
  );
  const [showSeries, setShowSeries] = useState(false);
  const csv = data ? customersCsv(data, interval, currency) : null;

  return (
    <ReportCard
      id="customers-heading"
      title="Customers"
      description="New customers placed their first order in this period; returning orders came from customers who had ordered before."
      actions={
        csv ? (
          <>
            <CsvButton
              label="Per-period CSV"
              onClick={() => saveTextFile(reportFileName("customers", range.from, range.to), csv.series)}
            />
            <CsvButton
              label="Top customers CSV"
              onClick={() => saveTextFile(reportFileName("top-customers", range.from, range.to), csv.top)}
            />
          </>
        ) : undefined
      }
    >
      {report.error ? (
        <QueryError error={report.error} />
      ) : !data ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className={cn("space-y-4", report.isFetching && "opacity-60")}>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile label="New customers" value={formatCount(totals.newCustomers)} />
            <KpiTile label="Orders from returning customers" value={formatCount(totals.returningOrders)} />
          </dl>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <caption className="px-3 pt-3 text-left text-sm font-medium">Top customers by spend</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <Head>Customer</Head>
                  <Head>Email</Head>
                  <Head numeric>Orders</Head>
                  <Head numeric>Spent</Head>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCustomers.length === 0 && (
                  <EmptyRow colSpan={4}>No orders from signed-in customers in this period.</EmptyRow>
                )}
                {data.topCustomers.map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell className="text-sm">
                      <Link href={`/admin/customers/${c.customerId}`} className="hover:underline">
                        {customerName(c)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email ?? "—"}</TableCell>
                    <Num>{formatCount(c.orders)}</Num>
                    <Num className="font-medium">{formatMoney(c.spentMinor, currency)}</Num>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button size="sm" variant="ghost" aria-expanded={showSeries} onClick={() => setShowSeries((s) => !s)}>
            <TableIcon /> {showSeries ? "Hide" : "Show"} new and returning per {interval}
          </Button>
          {showSeries && (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <caption className="sr-only">New and returning customers per {interval}</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <Head>Period</Head>
                    <Head numeric>New customers</Head>
                    <Head numeric>First orders</Head>
                    <Head numeric>Returning orders</Head>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.series.length === 0 && <EmptyRow colSpan={4}>No orders in this period.</EmptyRow>}
                  {data.series.map((p) => (
                    <TableRow key={p.period}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {periodLabel(p.period, interval, true)}
                      </TableCell>
                      <Num>{formatCount(p.newCustomers)}</Num>
                      <Num>{formatCount(p.firstOrders)}</Num>
                      <Num>{formatCount(p.returningOrders)}</Num>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </ReportCard>
  );
}
