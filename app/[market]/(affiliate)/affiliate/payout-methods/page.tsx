import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { PayoutMethodActions, PayoutMethodForm } from "@/src/features/affiliate/payout-forms";
import { MAX_PAYOUT_METHODS } from "@/src/features/affiliate/payout-method-input";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.payoutMethods"), robots: { index: false } };
}

// Where payouts are sent: bKash / Nagad / Rocket / Upay wallets or a bank account. The API only
// ever returns the masked number; full details are stored encrypted (spec §7.6).
export default async function AffiliatePayoutMethodsPage() {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("affiliate")]);
  const methods = await unwrap(serverApi(ctx).GET("/v1/affiliate/payout-methods"));
  const date = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "medium" });

  return (
    <>
      <section aria-labelledby="affiliate-methods-title">
        <h2 className="h3" id="affiliate-methods-title">
          {t("methods.title")}
        </h2>
        <p className="muted">{t("methods.intro")}</p>
        {methods.length ? (
          <ul className="affiliate-methods" data-testid="payout-methods">
            {methods.map((m) => {
              const name = `${m.label} ${m.masked}`;
              return (
                <li key={m.id} className="affiliate-method">
                  <div className="affiliate-method__head">
                    <p className="affiliate-method__name">
                      <strong>{m.label}</strong> <span className="affiliate-code">{m.masked}</span>
                    </p>
                    {m.isDefault && <span className="status status--done">{t("methods.default")}</span>}
                  </div>
                  <p className="muted affiliate-method__meta">
                    {t(`methods.types.${m.type}.label`)} ·{" "}
                    {t("methods.addedOn", { date: date.format(new Date(m.createdAt)) })}
                  </p>
                  <PayoutMethodActions method={m} name={name} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="notice">{t("methods.empty")}</p>
        )}
      </section>

      <section className="box" aria-labelledby="affiliate-method-add-title">
        <h2 className="h3" id="affiliate-method-add-title">
          {t("methods.addTitle")}
        </h2>
        {methods.length >= MAX_PAYOUT_METHODS ? (
          <p className="muted">{t("methods.limit", { max: MAX_PAYOUT_METHODS })}</p>
        ) : (
          <PayoutMethodForm hasMethods={methods.length > 0} />
        )}
      </section>
    </>
  );
}
