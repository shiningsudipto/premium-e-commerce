import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RecoverBag } from "@/src/features/cart/recover-bag";
import { currentMarket } from "@/src/lib/current-market";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart.recover");
  return { title: t("title"), robots: { index: false } };
}

// Where the abandoned-cart email links (/cart/recover?token=…): reopens the bag, then shows it.
export default async function RecoverBagPage() {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("cart.recover")]);
  return (
    <div className="pt-container">
      <Suspense fallback={<p className="muted">{t("working")}</p>}>
        <RecoverBag market={market} />
      </Suspense>
    </div>
  );
}
