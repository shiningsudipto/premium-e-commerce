import Link from "next/link";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { brandBlurb, brandTagline, footerColumns, paymentMarks, socials } from "../../content/site";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import type { StoreConfig } from "../../lib/store-data";
import { marketLabel } from "../header/site-header";
import { Icon } from "../storefront/icon";
import { Logo } from "../storefront/primitives";

// The year is cached for a day so the footer stays part of the prerendered shell.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter({ market, config }: { market: MarketRef; config: StoreConfig }) {
  const [t, year] = await Promise.all([getTranslations("footer"), currentYear()]);
  const locale = marketLabel(market, config);
  return (
    <footer className="footer on-dark" data-block="footer">
      <div className="pt-container">
        <div className="footer__top">
          <div className="footer__brand">
            <Logo
              name={config.storeName}
              href={href(market)}
              onDark
              label={t("backToTop", { store: config.storeName })}
            />
            <p className="muted">{brandBlurb}</p>
          </div>
          <div className="footer__cols">
            {footerColumns.map((col) => {
              const id = `f-${col.title.toLowerCase()}`;
              return (
                <nav key={col.title} className="footer__col" aria-labelledby={id}>
                  <h2 id={id}>{col.title}</h2>
                  <ul>
                    {col.links.map((link) => (
                      <li key={link.path}>
                        <Link href={href(market, link.path)}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              );
            })}
          </div>
        </div>
        <div className="footer__bottom">
          <ul className="pay-marks" aria-label={t("paymentMethods")}>
            {paymentMarks.map((m) => (
              <li key={m} className="pay-mark">
                {m}
              </li>
            ))}
          </ul>
          <ul className="socials" aria-label={t("social")}>
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.url} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                  <Icon name={s.icon} size="sm" />
                </a>
              </li>
            ))}
          </ul>
          {/* the market switcher arrives with multi-market support; for now this shows the current one */}
          <p className="locale">
            <span className="sr-only">{t("marketLabel", { market: locale })}</span>
            <Icon name="globe" size="sm" />
            <span aria-hidden="true">{locale}</span>
          </p>
          <p>{t("rights", { year, store: config.storeName, tagline: brandTagline })}</p>
        </div>
      </div>
    </footer>
  );
}
