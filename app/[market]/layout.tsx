import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { market } from "next/root-params";
import { env } from "@/src/lib/env";
import { FlagsProvider } from "@/src/lib/flags-client";
import { allSegments, parseMarketSegment } from "@/src/lib/market";
import { getMarketFlags, getMarkets, getStoreConfig, getTheme } from "@/src/lib/store-data";
import { googleFontsUrl, inlineCss, webFontFamilies } from "@/src/lib/theme";
import "../globals.css";

// Root layout for every storefront page. proxy.ts guarantees a valid /{locale}-{market}/ prefix.

async function currentMarket() {
  return parseMarketSegment(await market()) ?? parseMarketSegment(env.DEFAULT_MARKET)!;
}

export async function generateStaticParams() {
  try {
    const segments = allSegments(await getMarkets());
    if (segments.length) return segments.map((segment) => ({ market: segment }));
  } catch {
    // API unreachable at build time: prerender the default market, others render on first visit
  }
  return [{ market: env.DEFAULT_MARKET }];
}

export async function generateMetadata(): Promise<Metadata> {
  const ref = await currentMarket();
  const [config, theme] = await Promise.all([getStoreConfig(ref), getTheme()]);
  return {
    metadataBase: new URL(env.SITE_URL),
    title: { default: config.storeName, template: `%s · ${config.storeName}` },
    icons: theme?.faviconUrl ? [{ url: theme.faviconUrl }] : undefined,
    openGraph: { siteName: config.storeName, images: theme?.socialImageUrl ? [theme.socialImageUrl] : undefined },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[market]">) {
  const ref = await currentMarket();
  const [theme, flags, t] = await Promise.all([getTheme(), getMarketFlags(ref), getTranslations("common")]);
  const fonts = theme
    ? googleFontsUrl(webFontFamilies(theme.tokens.typography.fontBody, theme.tokens.typography.fontHeading))
    : null;

  return (
    <html lang={ref.locale} data-market={ref.market}>
      <head>
        {fonts && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fonts} />
          </>
        )}
        {theme && <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: inlineCss(theme.css) }} />}
        {theme?.customCss && (
          <style id="theme-custom" dangerouslySetInnerHTML={{ __html: inlineCss(theme.customCss) }} />
        )}
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <FlagsProvider flags={flags}>{children}</FlagsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
