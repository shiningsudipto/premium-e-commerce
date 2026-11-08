import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WishlistsView } from "@/src/features/wishlist/wishlists-view";
import { currentMarket } from "@/src/lib/current-market";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("wishlists"), robots: { index: false } };
}

// The customer's wishlists. The lists are loaded and changed in the browser (RTK Query), like the
// bag; the account layout has already checked the shopper is signed in.
export default async function WishlistsPage() {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("account")]);
  return (
    <section aria-labelledby="wishlists-title" className="form-grid">
      <h2 className="h3" id="wishlists-title">
        {t("wishlists")}
      </h2>
      <WishlistsView market={market} />
    </section>
  );
}
