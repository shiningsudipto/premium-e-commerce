import { market } from "next/root-params";
import { announcement } from "@/src/content/home";
import { SiteFooter } from "@/src/components/footer/site-footer";
import { AnnouncementBar, SiteHeader } from "@/src/components/header/site-header";
import { BagProvider } from "@/src/features/cart/bag-provider";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";
import { getStoreConfig } from "@/src/lib/store-data";

// Affiliate dashboard chrome: the shop's header and footer, so affiliates stay in the store.
// Cached and prerendered like the shop's; the dashboard itself waits for the request.
export default async function AffiliateChromeLayout({ children }: LayoutProps<"/[market]">) {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const config = await getStoreConfig(ref);
  return (
    <BagProvider market={ref}>
      <AnnouncementBar messages={announcement} />
      <SiteHeader market={ref} config={config} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter market={ref} config={config} />
    </BagProvider>
  );
}
