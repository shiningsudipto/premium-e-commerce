import Link from "next/link";
import type { letters as LettersContent } from "../../content/home";
import { ButtonLink, EmText, Eyebrow } from "../../components/storefront/primitives";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { NewsletterForm } from "./newsletter-form";

// 8 · newsletter + columns: the workshop letter beside the affiliate programme card.
export function Letters({
  market,
  storeName,
  content,
}: {
  market: MarketRef;
  storeName: string;
  content: typeof LettersContent;
}) {
  const { newsletter, partner } = content;
  return (
    <section
      className="section section--flush-top"
      id="letters"
      data-block="newsletter+columns"
      aria-labelledby="letter-title"
    >
      <div className="pt-container">
        <hr className="rule letters__rule" />
        <div className="letters">
          <div className="newsletter reveal">
            <Eyebrow>{newsletter.eyebrow}</Eyebrow>
            <h2 className="h2" id="letter-title">
              <EmText value={newsletter.title} />
            </h2>
            <p className="muted newsletter__body">{newsletter.body}</p>
            <NewsletterForm
              consent={
                <>
                  By subscribing you agree to receive emails from {storeName}. Unsubscribe any time. See our{" "}
                  <Link href={href(market, newsletter.privacy.path)}>{newsletter.privacy.label}</Link>.
                </>
              }
            />
          </div>
          <aside className="partner on-dark reveal" aria-labelledby="partner-title">
            <Eyebrow>{partner.eyebrow}</Eyebrow>
            <h2 className="h2 partner__title" id="partner-title">
              <EmText value={partner.title} />
            </h2>
            <p className="muted">{partner.body}</p>
            <ButtonLink href={href(market, partner.cta.path)} variant="light" arrow className="self-start">
              {partner.cta.label}
            </ButtonLink>
          </aside>
        </div>
      </div>
    </section>
  );
}
