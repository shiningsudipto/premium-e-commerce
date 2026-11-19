import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { PayoutRequestForm } from "@/src/features/affiliate/payout-forms";
import { cursorOf, NextPage, Stat, StatusPill } from "@/src/features/affiliate/ui";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.payouts"), robots: { index: false } };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const OPEN = new Set(["DRAFT", "APPROVED", "PROCESSING"]);

// Payout requests and history. With the "on request" schedule the affiliate asks for a payout of
// the approved cash balance; otherwise the store batches payouts weekly or monthly (spec §7.6).
export default async function AffiliatePayoutsPage({ searchParams }: Props) {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t, params] = await Promise.all([requestContext(), getTranslations("affiliate"), searchParams]);
  const cursor = cursorOf(params);
  const api = serverApi(ctx);
  const [page, balance, methods, config] = await Promise.all([
    unwrap(api.GET("/v1/affiliate/payouts", { params: { query: { limit: 25, ...(cursor ? { cursor } : {}) } } })),
    unwrap(api.GET("/v1/affiliate/balance")),
    unwrap(api.GET("/v1/affiliate/payout-methods")),
    getStoreConfig(ctx.market),
  ]);
  const currency = balance.currency ?? config.market.currency;
  const money = (minor: number, cur = currency) => formatMoney(minor, cur || currency, ctx.market.locale);
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });
  const label = (group: string, value: string) => (t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value);
  const method = methods.find((m) => m.isDefault) ?? methods[0];
  const methodsHref = href(ctx.market, "/affiliate/payout-methods");
  const open = page.items.find((p) => OPEN.has(p.status));
  const inProgress = balance.inPayoutMinor > 0 || !!open;
  const payable = Math.max(0, balance.payableMinor);
  const belowMinimum = payable <= 0 || payable < balance.payoutMinMinor;

  return (
    <>
      <section className="box affiliate-request" aria-labelledby="affiliate-request-title">
        <h2 className="h3" id="affiliate-request-title">
          {t("request.title")}
        </h2>
        <dl className="affiliate-stats">
          <Stat label={t("request.payable")} value={money(payable)} />
          <Stat
            label={t("request.minimum")}
            value={balance.payoutMinMinor > 0 ? money(balance.payoutMinMinor) : t("request.noMinimum")}
          />
          <Stat
            label={t("request.paidTo")}
            value={method ? `${method.label} ${method.masked}` : t("request.noMethod")}
            note={method ? label("payoutMethod", method.type) : undefined}
          />
        </dl>
        <p className="muted">
          <Link href={methodsHref}>{method ? t("request.manageMethods") : t("request.addMethod")}</Link>
        </p>
        {balance.payoutSchedule !== "on_request" ? (
          <p data-testid="payout-schedule">{t(`request.schedule.${balance.payoutSchedule}`)}</p>
        ) : inProgress ? (
          <p className="affiliate-notice" data-testid="payout-in-progress">
            {t("request.inProgress", { amount: money(open?.amountMinor ?? balance.inPayoutMinor, open?.currency) })}
          </p>
        ) : (
          <>
            {!method && <p className="muted">{t("request.needMethod")}</p>}
            {method && belowMinimum && (
              <p className="muted">
                {payable > 0
                  ? t("request.belowMinimum", { amount: money(balance.payoutMinMinor - payable) })
                  : t("request.nothingPayable")}
              </p>
            )}
            <PayoutRequestForm amount={money(payable)} />
          </>
        )}
      </section>

      <section aria-labelledby="affiliate-payouts-title">
        <h2 className="h3" id="affiliate-payouts-title">
          {t("payouts.title")}
        </h2>
        <p className="muted">{t("payouts.intro")}</p>
        {page.items.length ? (
          <div className="affiliate-table-wrap">
            <table className="orders-table" data-testid="affiliate-payouts">
              <thead>
                <tr>
                  <th scope="col">{t("payouts.date")}</th>
                  <th scope="col">{t("payouts.status")}</th>
                  <th scope="col">{t("payouts.amount")}</th>
                  <th scope="col">{t("payouts.method")}</th>
                  <th scope="col">{t("payouts.reference")}</th>
                  <th scope="col">{t("payouts.paidAt")}</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((p) => (
                  <tr key={p.id}>
                    <td>{date.format(new Date(p.createdAt))}</td>
                    <td>
                      <StatusPill status={p.status} label={label("payoutStatus", p.status)} />
                    </td>
                    <td>{money(p.amountMinor, p.currency)}</td>
                    <td>{p.method ? label("payoutMethod", p.method) : "—"}</td>
                    <td>{p.providerRef ?? "—"}</td>
                    <td>{p.paidAt ? date.format(new Date(p.paidAt)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{cursor ? t("payouts.noMore") : t("payouts.empty")}</p>
        )}
        <NextPage base={href(ctx.market, "/affiliate/payouts")} cursor={page.nextCursor} label={t("older")} />
      </section>
    </>
  );
}
