import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { loadBag } from "@/src/features/cart/actions";
import { CartPageView } from "@/src/features/cart/cart-page-view";
import { currentMarket } from "@/src/lib/current-market";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

// The bag page. The shell is static; the bag itself is per shopper and streams in.
export default async function CartPage() {
  const t = await getTranslations("cart");
  return (
    <div className="pt-container">
      <header className="page-head">
        <h1 className="h2">{t("title")}</h1>
      </header>
      <div className="stream-area">
        <Suspense fallback={<p className="muted">{t("loading")}</p>}>
          <CartContents />
        </Suspense>
      </div>
    </div>
  );
}

async function CartContents() {
  const [market, cart] = await Promise.all([currentMarket(), loadBag()]);
  return <CartPageView initial={cart} market={market} />;
}
