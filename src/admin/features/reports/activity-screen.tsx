"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  DownloadIcon,
  ImageIcon,
  InfoIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminCategoriesQuery,
  useGetV1AdminCollectionsQuery,
  useGetV1AdminReportsProductActivityProductIdCustomersQuery,
  useGetV1AdminReportsProductActivityQuery,
} from "../../store/api.generated";
import { saveTextFile } from "../data/download";
import {
  activityCsv,
  activityParamChanges,
  LIMITS,
  parseActivityParams,
  percent,
  SIGNAL_INFO,
  SIGNAL_ORDER,
  SORTS,
  type ActivityFilters,
  type ActivityItem,
  type ActivitySort,
  type Signal,
} from "./activity-logic";
import { customRangeError, parseRangeParams, PRESETS, resolveRange, toDateInput } from "./dates";

// Product activity (admin → Sales → Product activity): which products shoppers look at and add
// to the bag, next to what actually sells, with hints on what to do. Data comes from the
// storefront while tracking is on (Settings → Analytics → Product activity enabled).

// "now" only exists in the browser (the server snapshot is null), so prerendering never reads a clock
let nowValue: number | null = null;
const useNow = () =>
  useSyncExternalStore(
    () => () => {},
    () => (nowValue ??= Date.now()),
    () => null,
  );

const ALL = "__all";
const nf = new Intl.NumberFormat("en-US");

export function ProductActivityScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useNow();
  const filters = parseActivityParams(params);
  const choice = parseRangeParams(params);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const setFilters = (f: Partial<ActivityFilters>) => update(activityParamChanges(f));

  if (now === null) return <Skeleton className="h-96 w-full" />;
  const range = resolveRange(choice, new Date(now));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product activity"
        description="Which products shoppers look at and add to their bag, next to what actually sells, so you can see what's popular and what needs attention."
      />
      <Report
        filters={filters}
        range={range}
        choiceId={choice.preset}
        setFilters={setFilters}
        onPreset={(id) => {
          nowValue = Date.now();
          update({ range: id, from: null, to: null });
        }}
        onCustom={(from, to) => update({ range: "custom", from, to })}
      />
    </div>
  );
}

function Report({
  filters,
  range,
  choiceId,
  setFilters,
  onPreset,
  onCustom,
}: {
  filters: ActivityFilters;
  range: ReturnType<typeof resolveRange>;
  choiceId: string;
  setFilters: (f: Partial<ActivityFilters>) => void;
  onPreset: (id: string) => void;
  onCustom: (from: string, to: string) => void;
}) {
  const report = useGetV1AdminReportsProductActivityQuery({
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.collectionId ? { collectionId: filters.collectionId } : {}),
    ...(filters.signal ? { signal: filters.signal } : {}),
    minViews: filters.minViews,
    sort: filters.sort,
    limit: filters.limit,
  });
  const data = report.data;
  const anyFilter = !!(filters.q || filters.categoryId || filters.collectionId || filters.signal || filters.minViews);

  return (
    <>
      {data && !data.enabled && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Product activity tracking is off</AlertTitle>
          <AlertDescription>
            <p>
              Turn on <strong>Product activity enabled</strong> in Settings → Analytics to start recording product views
              and adds to the bag. Data recorded earlier still shows below.
            </p>
            <Link href="/admin/settings" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-2")}>
              <SettingsIcon /> Open Settings
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {data && !data.available && (
        <Alert variant="destructive">
          <AlertTitle>Activity data isn&apos;t available</AlertTitle>
          <AlertDescription>
            The API can&apos;t reach MongoDB, where product views and adds are stored.
          </AlertDescription>
        </Alert>
      )}

      <Filters
        filters={filters}
        range={range}
        choiceId={choiceId}
        setFilters={setFilters}
        onPreset={onPreset}
        onCustom={onCustom}
        onCsv={
          data?.items.length
            ? () =>
                saveTextFile(
                  `product-activity-${toDateInput(range.from)}-${toDateInput(range.to)}.csv`,
                  activityCsv(data.items),
                )
            : undefined
        }
      />

      {report.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(report.error)}</AlertDescription>
        </Alert>
      )}

      <Totals data={data} loading={report.isLoading} />

      <section aria-labelledby="activity-table" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="activity-table" className="text-base font-medium">
            Products{" "}
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                ·{" "}
                {data.items.length < data.matched
                  ? `top ${data.items.length} of ${nf.format(data.matched)}`
                  : nf.format(data.matched)}{" "}
                with activity · {range.label}
              </span>
            )}
          </h2>
          {report.isFetching && !report.isLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
        </div>
        <ActivityTable
          range={{ from: range.from.toISOString(), to: range.to.toISOString() }}
          items={data?.items}
          loading={report.isLoading}
          sort={filters.sort}
          onSort={(sort) => setFilters({ sort })}
          emptyText={anyFilter ? "No products match these filters." : "No product activity in this period yet."}
        />
      </section>

      <Legend />
    </>
  );
}

function Filters({
  filters,
  range,
  choiceId,
  setFilters,
  onPreset,
  onCustom,
  onCsv,
}: {
  filters: ActivityFilters;
  range: ReturnType<typeof resolveRange>;
  choiceId: string;
  setFilters: (f: Partial<ActivityFilters>) => void;
  onPreset: (id: string) => void;
  onCustom: (from: string, to: string) => void;
  onCsv?: () => void;
}) {
  const categories = useGetV1AdminCategoriesQuery({});
  const collections = useGetV1AdminCollectionsQuery({});
  const [query, setQuery] = useState(filters.q);
  const [custom, setCustom] = useState({ from: toDateInput(range.from), to: toDateInput(range.to) });
  const customError = customRangeError(custom.from, custom.to);

  const search = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ q: query });
  };

  return (
    <section aria-label="Filters" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={choiceId === p.id ? "secondary" : "ghost"}
              aria-pressed={choiceId === p.id}
              onClick={() => onPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!customError) onCustom(custom.from, custom.to);
          }}
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              className="h-8 w-36"
              value={custom.from}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              className="h-8 w-36"
              value={custom.to}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            variant={choiceId === "custom" ? "secondary" : "outline"}
            disabled={!!customError}
            title={customError ?? undefined}
          >
            Apply dates
          </Button>
        </form>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={onCsv} disabled={!onCsv}>
            <DownloadIcon /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <form onSubmit={search} className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <SearchIcon
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search products"
            placeholder="Search product name or handle, press Enter"
            className="h-8 pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => query !== filters.q && setFilters({ q: query })}
          />
        </form>
        <FilterSelect
          label="Category"
          allLabel="All categories"
          value={filters.categoryId}
          options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          onChange={(categoryId) => setFilters({ categoryId })}
        />
        <FilterSelect
          label="Collection"
          allLabel="All collections"
          value={filters.collectionId}
          options={(collections.data ?? []).map((c) => ({ value: c.id, label: c.title }))}
          onChange={(collectionId) => setFilters({ collectionId })}
        />
        <FilterSelect
          label="Hint"
          allLabel="All hints"
          value={filters.signal}
          options={SIGNAL_ORDER.map((s) => ({ value: s, label: SIGNAL_INFO[s].label }))}
          onChange={(signal) => setFilters({ signal: signal as Signal | null })}
        />
        <Select value={filters.sort} onValueChange={(v) => setFilters({ sort: v as ActivitySort })}>
          <SelectTrigger size="sm" aria-label="Sort by" className="w-full">
            <SelectValue>{SORTS.find((s) => s.value === filters.sort)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          At least
          <Input
            type="number"
            min={0}
            className="h-8 w-20"
            aria-label="Minimum views"
            defaultValue={filters.minViews || ""}
            key={filters.minViews}
            onBlur={(e) => setFilters({ minViews: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          views
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          Show
          <Select value={String(filters.limit)} onValueChange={(v) => setFilters({ limit: Number(v) })}>
            <SelectTrigger size="sm" aria-label="How many products" className="w-20">
              <SelectValue>{filters.limit}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((l) => (
                <SelectItem key={l} value={String(l)}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          products
        </label>
        {(filters.q || filters.categoryId || filters.collectionId || filters.signal || filters.minViews > 0) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setFilters({ q: "", categoryId: null, collectionId: null, signal: null, minViews: 0 });
            }}
          >
            <XIcon /> Clear filters
          </Button>
        )}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : (v as string))}>
      <SelectTrigger size="sm" aria-label={label} className="w-full">
        <SelectValue>{current ? `${label}: ${current.label}` : `${allLabel}`}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Totals({
  data,
  loading,
}: {
  data: ReturnType<typeof useGetV1AdminReportsProductActivityQuery>["data"];
  loading: boolean;
}) {
  const tiles = [
    { label: "Product views", value: data ? nf.format(data.totals.views) : null, hint: "Product pages opened" },
    {
      label: "Unique viewers",
      value: data ? nf.format(data.totals.viewers) : null,
      hint: "Different visitors who viewed a product",
    },
    {
      label: "Adds to bag",
      value: data ? nf.format(data.totals.adds) : null,
      hint: "Times a product was added to a bag",
    },
    {
      label: "Add rate",
      value: data ? percent(data.totals.addRate) : null,
      hint: "Share of viewers who added something",
    },
    {
      label: "Units sold",
      value: data ? nf.format(data.totals.unitsSold) : null,
      hint: "From orders placed in this period",
    },
  ];
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t.label}</p>
          {loading || t.value === null ? (
            <Skeleton className="mt-2 h-7 w-16" />
          ) : (
            <p className="mt-1 text-2xl font-medium tabular-nums">{t.value}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">{t.hint}</p>
        </div>
      ))}
    </section>
  );
}

const SIGNAL_CLASS = {
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
} as const;

function SignalBadge({ signal }: { signal: Signal }) {
  const info = SIGNAL_INFO[signal];
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", SIGNAL_CLASS[info.tone])}
      title={`${info.meaning} ${info.action}`}
    >
      {info.label}
    </Badge>
  );
}

const COLUMNS: { key: ActivitySort | null; label: string; title: string }[] = [
  { key: "views", label: "Views", title: "Product page views" },
  { key: "viewers", label: "Viewers", title: "Different visitors who viewed it" },
  { key: "adds", label: "Adds", title: "Times added to a bag" },
  { key: "addRate", label: "Add rate", title: "Share of viewers who added it" },
  { key: "unitsSold", label: "Sold", title: "Units ordered in this period" },
  { key: null, label: "Signed in", title: "Signed-in shoppers who viewed or added it; click to see who" },
  { key: null, label: "In stock", title: "Sellable units across all locations" },
];

function ActivityTable({
  range,
  items,
  loading,
  sort,
  onSort,
  emptyText,
}: {
  range: { from: string; to: string };
  items: ActivityItem[] | undefined;
  loading: boolean;
  sort: ActivitySort;
  onSort: (sort: ActivitySort) => void;
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            {COLUMNS.map((c) => (
              <TableHead
                key={c.label}
                className="text-right whitespace-nowrap"
                aria-sort={c.key && c.key === sort ? "descending" : undefined}
                title={c.title}
              >
                {c.key ? (
                  <button
                    type="button"
                    onClick={() => onSort(c.key!)}
                    className={cn("hover:text-foreground", c.key === sort && "font-semibold text-foreground")}
                  >
                    {c.label}
                    {c.key === sort ? " ↓" : ""}
                  </button>
                ) : (
                  c.label
                )}
              </TableHead>
            ))}
            <TableHead>Hints</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={9}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {!loading && !items?.length && (
            <TableRow>
              <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {items?.map((i) => (
            <TableRow key={i.productId}>
              <TableCell>
                <Link
                  href={`/admin/products/${i.productId}`}
                  className="flex min-w-56 items-center gap-3 hover:underline"
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
                      <img src={i.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {i.handle}
                      {i.status !== "ACTIVE" && ` · ${i.status.toLowerCase()}`}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">{nf.format(i.views)}</TableCell>
              <TableCell className="text-right tabular-nums">{nf.format(i.viewers)}</TableCell>
              <TableCell className="text-right tabular-nums">{nf.format(i.adds)}</TableCell>
              <TableCell className="text-right tabular-nums">{percent(i.addRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{nf.format(i.unitsSold)}</TableCell>
              <TableCell className="text-right tabular-nums">
                <ShoppersCell item={i} range={range} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {i.available === null ? "–" : nf.format(i.available)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {SIGNAL_ORDER.filter((s) => i.signals.includes(s)).map((s) => (
                    <SignalBadge key={s} signal={s} />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Legend() {
  return (
    <section aria-labelledby="activity-legend" className="space-y-3 rounded-lg border bg-card p-4 text-sm">
      <h2 id="activity-legend" className="font-medium">
        What the hints mean, and what to do
      </h2>
      <dl className="grid gap-3 md:grid-cols-2">
        {SIGNAL_ORDER.map((s) => (
          <div key={s} className="space-y-1">
            <dt>
              <SignalBadge signal={s} />
            </dt>
            <dd className="text-muted-foreground">{SIGNAL_INFO[s].meaning}</dd>
            <dd>
              <span className="font-medium">Next step: </span>
              {SIGNAL_INFO[s].action}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Views and adds come from the storefront while tracking is on. Guests are counted by an anonymous visitor ID; for
        signed-in shoppers the account is recorded too, so you can see who they are (needs the customers.read
        permission). Units sold come from orders placed in the same period. Small numbers are noisy: hints only appear
        once enough visitors have seen or added a product.
      </p>
    </section>
  );
}

// Signed-in shoppers for one product: the count, and on click a popover with who they are
// (name, email, phone), what they did and when. Contact details need customers.read.
function ShoppersCell({ item, range }: { item: ActivityItem; range: { from: string; to: string } }) {
  const canSeeCustomers = useCan("customers.read");
  const [open, setOpen] = useState(false);
  if (item.customers === 0) return <span className="text-muted-foreground">–</span>;
  if (!canSeeCustomers) {
    return (
      <span title="Your role needs the customers.read permission to see who they are">{nf.format(item.customers)}</span>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 tabular-nums"
            aria-label={`${item.customers} signed-in shoppers for ${item.title}: show details`}
          >
            <UsersIcon className="size-3.5" aria-hidden /> {nf.format(item.customers)}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <PopoverHeader className="border-b p-3">
          <PopoverTitle className="text-sm">Signed-in shoppers</PopoverTitle>
          <PopoverDescription className="text-xs">
            Who viewed or added <strong>{item.title}</strong> in this period. Guests aren&apos;t listed.
          </PopoverDescription>
        </PopoverHeader>
        {open && <ShoppersList productId={item.productId} range={range} />}
      </PopoverContent>
    </Popover>
  );
}

function ShoppersList({ productId, range }: { productId: string; range: { from: string; to: string } }) {
  const list = useGetV1AdminReportsProductActivityProductIdCustomersQuery({
    productId,
    from: range.from,
    to: range.to,
  });
  if (list.isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (list.error) return <p className="p-3 text-sm text-destructive">{errorMessage(list.error)}</p>;
  const items = list.data?.items ?? [];
  if (!items.length) return <p className="p-3 text-sm text-muted-foreground">No signed-in shoppers in this period.</p>;
  return (
    <ul className="max-h-80 divide-y overflow-y-auto text-sm">
      {items.map((c) => (
        <li key={c.customerId} className="space-y-1 p-3">
          <div className="flex items-baseline justify-between gap-2">
            {c.deleted ? (
              <span className="text-muted-foreground italic">Deleted customer</span>
            ) : (
              <Link href={`/admin/customers/${c.customerId}`} className="truncate font-medium hover:underline">
                {c.name ?? c.email ?? "Customer"}
              </Link>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(c.lastAt)}</span>
          </div>
          {!c.deleted && (
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <MailIcon className="size-3" aria-hidden /> {c.email}
                </a>
              )}
              {c.phone && (
                <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-foreground">
                  <PhoneIcon className="size-3" aria-hidden /> {c.phone}
                </a>
              )}
            </div>
          )}
          <p className="text-xs">
            {c.views > 0 && <>Viewed {c.views}×</>}
            {c.views > 0 && c.adds > 0 && " · "}
            {c.adds > 0 && (
              <span className="font-medium">
                Added {c.addedUnits} to bag{c.adds > 1 ? ` (${c.adds} times)` : ""}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
