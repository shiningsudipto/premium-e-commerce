import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { listAccountReturns } from "@/src/features/returns/data";
import { ReturnList } from "@/src/features/returns/return-list";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("returns");
  return { title: t("title"), robots: { index: false } };
}

// The customer's returns across all their orders, newest first. A new return is started from
// the order it belongs to.
export default async function ReturnsPage() {
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("returns")]);
  const { returns, truncated } = await listAccountReturns(ctx);

  return (
    <section aria-labelledby="returns-title" className="form-grid">
      <h2 className="h3" id="returns-title">
        {t("title")}
      </h2>
      {returns.length ? (
        <ReturnList returns={returns} market={ctx.market} orders />
      ) : (
        <div className="no-results" data-testid="returns-empty">
          <h3 className="h3">{t("none")}</h3>
          <p className="muted">{t("howTo")}</p>
          <Link className="btn btn--secondary" href={href(ctx.market, "/account/orders")}>
            {t("viewOrders")}
          </Link>
        </div>
      )}
      {returns.length > 0 && <p className="muted">{t("howTo")}</p>}
      {truncated && <p className="muted">{t("truncated")}</p>}
    </section>
  );
}
