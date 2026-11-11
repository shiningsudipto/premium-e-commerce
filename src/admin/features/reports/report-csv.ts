import type {
  GetV1AdminReportsCustomersApiResponse,
  GetV1AdminReportsProductsApiResponse,
  GetV1AdminReportsPromotionsApiResponse,
  GetV1AdminReportsSalesApiResponse,
  GetV1AdminReportsSearchApiResponse,
} from "../../store/api.generated";
import { currencyDigits } from "../../lib/money";
import { tableToCsv } from "../data/csv";
import { periodLabel, toDateInput, type Interval } from "./dates";

export type SalesReport = GetV1AdminReportsSalesApiResponse;
export type SalesPoint = SalesReport["series"][number];
export type ProductRow = GetV1AdminReportsProductsApiResponse[number];
export type PromotionRow = GetV1AdminReportsPromotionsApiResponse[number];
export type SearchReport = GetV1AdminReportsSearchApiResponse;
export type CustomersReport = GetV1AdminReportsCustomersApiResponse;

// Money in report files is a plain decimal in major units ("1850.00"), so spreadsheets can sum it.
export function majorUnits(minor: number | null | undefined, currency: string): string {
  if (minor === null || minor === undefined) return "";
  const digits = currencyDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}

export function salesCsv(series: SalesPoint[], interval: Interval, currency: string): string {
  const m = (pick: (p: SalesPoint) => number) => (p: SalesPoint) => majorUnits(pick(p), currency);
  return tableToCsv(
    [
      { header: "period_start", value: (p: SalesPoint) => p.period.slice(0, 10) },
      { header: "period", value: (p) => periodLabel(p.period, interval, true) },
      { header: "orders", value: (p) => p.orders },
      { header: `gross_${currency}`, value: m((p) => p.grossMinor) },
      { header: `discounts_${currency}`, value: m((p) => p.discountsMinor) },
      { header: `shipping_${currency}`, value: m((p) => p.shippingMinor) },
      { header: `tax_${currency}`, value: m((p) => p.taxMinor) },
      { header: `net_${currency}`, value: m((p) => p.netMinor) },
      { header: `refunds_${currency}`, value: m((p) => p.refundsMinor) },
      { header: `average_order_${currency}`, value: m((p) => p.averageOrderMinor) },
    ],
    series,
  );
}

export function productsCsv(rows: ProductRow[], currency: string): string {
  return tableToCsv(
    [
      { header: "product_id", value: (r: ProductRow) => r.productId },
      { header: "title", value: (r) => r.title },
      { header: "units", value: (r) => r.units },
      { header: `revenue_${currency}`, value: (r) => majorUnits(r.revenueMinor, currency) },
      { header: `margin_${currency}`, value: (r) => majorUnits(r.marginMinor, currency) },
      { header: "units_refunded", value: (r) => r.unitsRefunded },
    ],
    rows,
  );
}

export function promotionsCsv(rows: PromotionRow[], currency: string): string {
  return tableToCsv(
    [
      { header: "promotion_id", value: (r: PromotionRow) => r.promotionId },
      { header: "name", value: (r) => r.name },
      { header: "orders", value: (r) => r.uses },
      { header: `discount_${currency}`, value: (r) => majorUnits(r.discountMinor, currency) },
      { header: `revenue_${currency}`, value: (r) => majorUnits(r.revenueMinor, currency) },
      { header: `average_order_${currency}`, value: (r) => majorUnits(r.averageOrderMinor, currency) },
    ],
    rows,
  );
}

export function searchCsv(report: SearchReport): string {
  type Row = { query: string; searches: number; averageResults: number | null };
  const rows: Row[] = [
    ...report.topQueries,
    ...report.zeroResultQueries
      .filter((z) => !report.topQueries.some((t) => t.query === z.query))
      .map((z) => ({ ...z, averageResults: 0 })),
  ];
  const zero = new Set(report.zeroResultQueries.map((z) => z.query));
  return tableToCsv(
    [
      { header: "query", value: (r: Row) => r.query },
      { header: "searches", value: (r) => r.searches },
      { header: "average_results", value: (r) => r.averageResults },
      {
        header: "zero_result_searches",
        value: (r) => report.zeroResultQueries.find((z) => z.query === r.query)?.searches ?? 0,
      },
      { header: "had_zero_results", value: (r) => (zero.has(r.query) ? "yes" : "no") },
    ],
    rows,
  );
}

type TopCustomer = CustomersReport["topCustomers"][number];
export const customerName = (c: TopCustomer) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Customer";

export function customersCsv(
  report: CustomersReport,
  interval: Interval,
  currency: string,
): { series: string; top: string } {
  type Point = CustomersReport["series"][number];
  return {
    series: tableToCsv(
      [
        { header: "period_start", value: (p: Point) => p.period.slice(0, 10) },
        { header: "period", value: (p) => periodLabel(p.period, interval, true) },
        { header: "new_customers", value: (p) => p.newCustomers },
        { header: "first_orders", value: (p) => p.firstOrders },
        { header: "returning_orders", value: (p) => p.returningOrders },
      ],
      report.series,
    ),
    top: tableToCsv(
      [
        { header: "customer_id", value: (c: TopCustomer) => c.customerId },
        { header: "name", value: (c) => customerName(c) },
        { header: "email", value: (c) => c.email ?? "" },
        { header: "orders", value: (c) => c.orders },
        { header: `spent_${currency}`, value: (c) => majorUnits(c.spentMinor, currency) },
      ],
      report.topCustomers,
    ),
  };
}

// "sales-2026-10-10-to-2026-11-08.csv"
export const reportFileName = (name: string, from: Date, to: Date) =>
  `${name}-${toDateInput(from)}-to-${toDateInput(to)}.csv`;
