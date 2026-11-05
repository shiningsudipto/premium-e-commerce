import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { market } from "next/root-params";
import { env } from "@/src/lib/env";
import { FlagsProvider } from "@/src/lib/flags-client";
import { allSegments, parseMarketSegment } from "@/src/lib/market";
import { getMarketFlags, getMarkets, getStoreConfig, getTheme } from "@/src/lib/store-data";
import { fontStackCss, googleFontsUrl, inlineCss, webFontFamilies } from "@/src/lib/theme";
import "../globals.css";

// The design's typefaces, self-hosted by next/font (no layout shift, no third-party request).
// Fraunces is variable in weight and optical size, with italics for the emphasized phrases.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

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
    <html lang={ref.locale} data-market={ref.market} className={`${fraunces.variable} ${figtree.variable}`}>
      <head>
        {fonts && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fonts} />
          </>
        )}
        {theme && (
          <style
            id="theme-tokens"
            dangerouslySetInnerHTML={{
              __html: inlineCss(
                theme.css + fontStackCss(theme.tokens.typography.fontBody, theme.tokens.typography.fontHeading),
              ),
            }}
          />
        )}
        {theme?.customCss && (
          <style id="theme-custom" dangerouslySetInnerHTML={{ __html: inlineCss(theme.customCss) }} />
        )}
      </head>
      <body className="pt flex min-h-dvh flex-col">
        <a className="skip-link" href="#main">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <FlagsProvider flags={flags}>{children}</FlagsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
