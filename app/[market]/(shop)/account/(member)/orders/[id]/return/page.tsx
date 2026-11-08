import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { getOrderReturns } from "@/src/features/returns/data";
import { ReturnForm } from "@/src/features/returns/return-form";
import { canHaveReturns, returnableQuantities, type Resolution } from "@/src/features/returns/returns";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("returns");
  return { title: t("requestTitle"), robots: { index: false } };
}

// Request a return for one order: the lines that can still go back, a reason each, and the
// resolution. The API applies the return window and final-sale rules when it's sent.
export default async function RequestReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, ctx, t] = await Promise.all([params, requestContext(), getTranslations("returns")]);
  const api = serverApi(ctx);
  const order = await unwrap(api.GET("/v1/store/orders/{id}", { params: { path: { id } } })).catch((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  });
  if (!order) notFound();
  const returns = canHaveReturns(order.status) ? await getOrderReturns(ctx, id) : [];
  const returnable = returnableQuantities(order.lines, returns);
  const lines = order.lines.map((l) => ({
    id: l.id,
    title: l.title,
    variantTitle: l.variantTitle,
    ordered: l.quantity,
    returnable: returnable[l.id] ?? 0,
  }));
  const anyReturnable = lines.some((l) => l.returnable > 0);
  // an exchange re-sends the same variant, so every returnable line needs one
  const exchangeable = order.lines.every((l) => !returnable[l.id] || l.variantId);
  const resolutions: Resolution[] = ["REFUND", "STORE_CREDIT", ...(exchangeable ? (["EXCHANGE"] as const) : [])];
  const orderHref = href(ctx.market, `/account/orders/${order.id}`);

  return (
    <section aria-labelledby="return-title" className="form-grid">
      <p>
        <Link className="link-btn" href={orderHref}>
          ← {t("backToOrder", { number: order.number })}
        </Link>
      </p>
      <header>
        <h2 id="return-title" className="h3">
          {t("requestTitle")}
        </h2>
        <p className="muted">{t("requestIntro", { number: order.number })}</p>
      </header>
      {!canHaveReturns(order.status) ? (
        <p className="notice" role="status" data-testid="return-ineligible">
          {t("notShippedYet")}
        </p>
      ) : !anyReturnable ? (
        <p className="notice" role="status" data-testid="return-ineligible">
          {t("nothingLeft")}
        </p>
      ) : (
        <ReturnForm orderId={order.id} lines={lines} resolutions={resolutions} />
      )}
    </section>
  );
}
