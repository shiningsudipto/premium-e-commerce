import { Fragment, Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { siteContent } from "../../content";
import { languageName, marketLanguages } from "../../i18n/languages";
import { getMenu } from "../../lib/catalog";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import type { StoreConfig } from "../../lib/store-data";
import { Logo } from "../storefront/primitives";
import { AccountButton, AccountButtonFallback, BagButton, BagButtonFallback } from "./header-actions";
import { HeaderBar } from "./header-bar";
import { DesktopNavItem } from "./nav-menu";
import { LanguageSwitcher } from "./language-switcher";
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
  return `${languageName(market.locale)} · ${symbol} ${config.market.currency}`;
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
  const [adminMenu, t] = await Promise.all([getMenu(market, "main"), getTranslations("header")]);
  // "Products" (the whole catalog) always leads the menu; skipped if the admin menu already has it
  const productsHref = href(market, "/products");
  const menu = adminMenu.some((link) => link.href === productsHref)
    ? adminMenu
    : [{ label: t("products"), href: productsHref, children: [] }, ...adminMenu];
  const footerLinks = siteContent(market.locale).drawerLinks.map((l) => ({
    label: l.label,
    href: href(market, l.path),
  }));

  return (
    <HeaderBar>
      <div className="pt-container site-header__inner">
        <div className="site-header__start">
          <MobileMenu
            storeName={config.storeName}
            links={menu.map((link) => ({ ...link, submenuLabel: t("submenu", { label: link.label }) }))}
            footerLinks={footerLinks}
            marketLabel={marketLabel(market, config)}
            labels={{ open: t("openMenu"), close: t("closeMenu"), menu: t("menu"), nav: t("mobileNav") }}
          />
          <Logo name={config.storeName} href={href(market)} />
        </div>
        <nav className="nav" aria-label={t("primaryNav")}>
          {menu.map((link, i) => (
            // two items may point to the same page, so the position is part of the key
            <DesktopNavItem key={`${i}-${link.href}`} link={link} submenuLabel={t("submenu", { label: link.label })} />
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher
            locale={market.locale}
            market={market.market}
            languages={marketLanguages(config.market.locales)}
            placement="header"
          />
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
