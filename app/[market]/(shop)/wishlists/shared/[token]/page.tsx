import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, unwrap } from "@/src/api/errors";
import { serverApi } from "@/src/api/server";
import { ProductCard } from "@/src/blocks/product-shelf/product-card";
import { currentMarket } from "@/src/lib/current-market";

// The list is read per request: it disappears as soon as sharing is turned off. A link that no
// longer works shows the not-found page (under the shop's streaming loading state the status is
// already sent, so it is 200; the page is noindex either way).

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wishlist");
  // a private link: keep it out of search engines
  return { title: t("sharedTitle"), robots: { index: false, follow: false } };
}

// A wishlist someone shared: read-only product cards, without the owner's details.
export default async function SharedWishlistPage({ params }: PageProps<"/[market]/wishlists/shared/[token]">) {
  const [market, t, { token }] = await Promise.all([currentMarket(), getTranslations("wishlist"), params]);
  const list = await unwrap(
    serverApi({ market }).GET("/v1/store/wishlists/shared/{token}", { params: { path: { token } } }),
  ).catch((err: unknown) => {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  });
  return (
    <div className="pt-container">
      <header className="page-head">
        <p className="eyebrow">{t("sharedEyebrow")}</p>
        <h1 className="h2">{list.name}</h1>
      </header>
      {list.items.length === 0 ? (
        <p className="muted">{t("listEmpty")}</p>
      ) : (
        <ul className="product-grid" aria-label={list.name}>
          {list.items.map((item, i) =>
            item.product ? <ProductCard key={item.productId} product={item.product} market={market} index={i} /> : null,
          )}
        </ul>
      )}
    </div>
  );
}
