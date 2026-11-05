import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { href } from "../lib/links";
import type { MarketRef } from "../lib/market";
import type { StoreConfig, Theme } from "../lib/store-data";

// Header with slots: `announcement` above the bar, `nav` for the menu (Phase 1 menus) and
// `actions` for search, account and cart.
export async function SiteHeader({
  market,
  config,
  theme,
  announcement,
  nav,
  actions,
}: {
  market: MarketRef;
  config: StoreConfig;
  theme: Theme | null;
  announcement?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
}) {
  const t = await getTranslations("header");
  return (
    <header className="border-b border-border bg-background">
      {announcement}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href={href(market)} className="flex shrink-0 items-center gap-2 font-serif text-xl tracking-tight">
          {theme?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo URL comes from the media service at runtime
            <img src={theme.logoUrl} alt={config.storeName} className="h-8 w-auto" />
          ) : (
            config.storeName
          )}
        </Link>
        <nav aria-label={t("primaryNav")} className="hidden flex-1 md:block">
          {nav}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="hidden text-muted-foreground uppercase sm:inline" title={config.market.handle}>
            {t("market", { locale: market.locale, currency: config.market.currency })}
          </span>
          {actions}
        </div>
      </div>
    </header>
  );
}
