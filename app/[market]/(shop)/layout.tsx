import { Suspense } from "react";
import { market } from "next/root-params";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";
import { getStoreConfig, getTheme } from "@/src/lib/store-data";
import { AccountLink, AccountLinkFallback } from "@/src/components/account-link";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";

// Shop chrome. Header and footer are cached and prerendered; only the account link waits for
// the request, so the rest of the page never blocks on the session.
export default async function ShopLayout({ children }: LayoutProps<"/[market]">) {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const [config, theme] = await Promise.all([getStoreConfig(ref), getTheme()]);
  return (
    <>
      <SiteHeader
        market={ref}
        config={config}
        theme={theme}
        actions={
          <Suspense fallback={<AccountLinkFallback />}>
            <AccountLink market={ref} />
          </Suspense>
        }
      />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter config={config} />
    </>
  );
}
