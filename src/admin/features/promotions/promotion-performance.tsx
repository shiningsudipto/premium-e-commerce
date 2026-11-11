"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "../../store/api-errors";
import { useGetV1AdminPromotionsIdPerformanceQuery } from "../../store/api.generated";
import { formatMoney } from "../../lib/money";
import { Section } from "../products/section";

const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const dayEnd = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : undefined);

// Performance report (spec §8.3): uses, revenue, discount cost and order value against the store.
export function PromotionPerformance({ promotionId, currency }: { promotionId: string; currency: string }) {
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [range, setRange] = useState({ from: "", to: "" });
  const from = dayStart(range.from);
  const to = dayEnd(range.to);
  const report = useGetV1AdminPromotionsIdPerformanceQuery({
    id: promotionId,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const money = (n: number) => formatMoney(n, currency);
  const r = report.data;
  const lift = r && r.storeAverageOrderMinor ? (r.averageOrderMinor / r.storeAverageOrderMinor - 1) * 100 : null;

  return (
    <Section
      title="Performance"
      description="Orders that used this promotion (cancelled orders excluded). Amounts are totals across currencies, shown in the store currency."
    >
      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRange(draft);
        }}
      >
        <Field className="w-auto">
          <FieldLabel htmlFor="perf-from">From</FieldLabel>
          <Input
            id="perf-from"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </Field>
        <Field className="w-auto">
          <FieldLabel htmlFor="perf-to">To</FieldLabel>
          <Input
            id="perf-to"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </Field>
        <Button type="submit" size="sm" variant="secondary">
          Apply
        </Button>
        {(range.from || range.to) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft({ from: "", to: "" });
              setRange({ from: "", to: "" });
            }}
          >
            All time
          </Button>
        )}
      </form>
      {report.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(report.error)}</AlertDescription>
        </Alert>
      ) : !r ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Uses (orders)", String(r.uses)],
            ["Revenue", money(r.revenueMinor)],
            ["Discount cost", money(r.discountMinor)],
            [
              "Average order",
              `${money(r.averageOrderMinor)}${lift !== null && r.uses ? ` (${lift >= 0 ? "+" : ""}${lift.toFixed(1)}% vs store)` : ""}`,
            ],
            ["Store average order", money(r.storeAverageOrderMinor)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-lg font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {r && r.revenueMinor > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Discounts were {((r.discountMinor / r.revenueMinor) * 100).toFixed(1)}% of the revenue from these orders.
        </p>
      )}
    </Section>
  );
}
