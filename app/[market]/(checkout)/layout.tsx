import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/src/components/storefront/icon";
import { Logo } from "@/src/components/storefront/primitives";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";
import { getStoreConfig } from "@/src/lib/store-data";

// Checkout chrome: just the logo, a way back to the bag and a reassurance. No menus or
// footer links to lead shoppers away mid-purchase.
export default async function CheckoutLayout({ children }: LayoutProps<"/[market]">) {
  const market = await currentMarket();
  const [config, t] = await Promise.all([getStoreConfig(market), getTranslations("checkout")]);
  return (
    <div className="checkout-shell">
      <header className="checkout-head">
        <div className="pt-container checkout-head__inner">
          <Logo name={config.storeName} href={href(market)} />
          <span className="checkout-head__secure">
            <Icon name="shield" size="sm" />
            {t("secure")}
          </span>
          <Link className="link-btn" href={href(market, "/cart")}>
            {t("backToBag")}
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}
