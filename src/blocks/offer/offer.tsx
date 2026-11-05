import type { offer as OfferContent } from "../../content/home";
import { ButtonLink, EmText, Eyebrow } from "../../components/storefront/primitives";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { CopyCode, OfferTimer } from "./offer-timer";

// 7 · countdown: a limited offer with a live timer and a copyable code, framed by a stitched border.
export function Offer({ market, content }: { market: MarketRef; content: typeof OfferContent }) {
  return (
    <section className="section section--flush-top" id="offer" data-block="countdown" aria-labelledby="offer-title">
      <div className="pt-container">
        <div className="offer reveal">
          <div className="offer__copy">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h2 className="h2 offer__title" id="offer-title">
              <EmText value={content.title} />
            </h2>
            <p className="muted">{content.body}</p>
          </div>
          <OfferTimer endsAt={content.endsAt} endedLabel="This offer has ended." />
          <div className="offer__actions">
            <CopyCode code={content.code} />
            <ButtonLink href={href(market, content.cta.path)} arrow>
              {content.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
