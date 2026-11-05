import { market } from "next/root-params";
import { announcement } from "@/src/content/home";
import { SiteFooter } from "@/src/components/footer/site-footer";
import { AnnouncementBar, SiteHeader } from "@/src/components/header/site-header";
import { env } from "@/src/lib/env";
import { parseMarketSegment } from "@/src/lib/market";
import { getStoreConfig } from "@/src/lib/store-data";

// Shop chrome: announcement, header and footer. Everything here is cached and prerendered;
// only the account and bag buttons in the header wait for the request.
export default async function ShopLayout({ children }: LayoutProps<"/[market]">) {
  const ref = parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
  const config = await getStoreConfig(ref);
  return (
    <>
      <AnnouncementBar messages={announcement} />
      <SiteHeader market={ref} config={config} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter market={ref} config={config} />
    </>
  );
}
