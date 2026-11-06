import Link from "next/link";
import { Fragment, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { drawerLinks } from "../../content/site";
import { getMenu } from "../../lib/catalog";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import type { StoreConfig } from "../../lib/store-data";
import { Logo } from "../storefront/primitives";
import { AccountButton, AccountButtonFallback, BagButton, BagButtonFallback } from "./header-actions";
import { HeaderBar } from "./header-bar";
import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "../../features/search/search-dialog";

export function marketLabel(market: MarketRef, config: StoreConfig) {
  const symbol =
    new Intl.NumberFormat(market.locale, {
      style: "currency",
      currency: config.market.currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";
  return `${market.locale.toUpperCase()} · ${symbol} ${config.market.currency}`;
}

export function AnnouncementBar({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <p className="announce">
      {messages.map((m, i) => (
        <Fragment key={m}>
          {i > 0 && <span aria-hidden="true">·</span>}
          {m}
        </Fragment>
      ))}
    </p>
  );
}

// Header (design §header): drawer button and logo, the "main" menu from the admin, and search,
// account and bag. Navigation is cached with the menu; account and bag stream per request.
export async function SiteHeader({ market, config }: { market: MarketRef; config: StoreConfig }) {
  const [menu, t] = await Promise.all([getMenu(market, "main"), getTranslations("header")]);
  const footerLinks = drawerLinks.map((l) => ({ label: l.label, href: href(market, l.path) }));

  return (
    <HeaderBar>
      <div className="pt-container site-header__inner">
        <div className="site-header__start">
          <MobileMenu
            storeName={config.storeName}
            links={menu}
            footerLinks={footerLinks}
            marketLabel={marketLabel(market, config)}
            labels={{ open: t("openMenu"), close: t("closeMenu"), menu: t("menu"), nav: t("mobileNav") }}
          />
          <Logo name={config.storeName} href={href(market)} />
        </div>
        <nav className="nav" aria-label={t("primaryNav")}>
          {menu.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <SearchDialog market={market} label={t("search")} />
          <Suspense fallback={<AccountButtonFallback market={market} label={t("signIn")} />}>
            <AccountButton market={market} />
          </Suspense>
          <Suspense fallback={<BagButtonFallback market={market} />}>
            <BagButton market={market} />
          </Suspense>
        </div>
      </div>
    </HeaderBar>
  );
}
