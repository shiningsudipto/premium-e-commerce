import { cn } from "@/lib/utils";
import Link from "next/link";
import type {
  craft as CraftContent,
  faq as FaqContent,
  giftSet as GiftSetContent,
  reviews as ReviewsContent,
  services as ServicesContent,
  story as StoryContent,
} from "../content/home";
import { Icon } from "../components/storefront/icon";
import { Media } from "../components/storefront/media";
import { ButtonLink, EmText, Eyebrow, LinkArrow, SectionHead, Stars } from "../components/storefront/primitives";
import { href } from "../lib/links";
import type { MarketRef } from "../lib/market";
import { formatMoney } from "../lib/money";

// Editorial blocks of the home page. They render content only (no per-request data), so they
// stay in the prerendered shell.

// Ad A · image_with_text: a split promo banner, two product shots joined by a "+".
export function PromoSplit({
  market,
  currency,
  content,
}: {
  market: MarketRef;
  currency: string;
  content: typeof GiftSetContent;
}) {
  const price = formatMoney(content.priceMinor, currency, market.locale);
  const was = formatMoney(content.compareAtMinor, currency, market.locale);
  const saving = formatMoney(content.compareAtMinor - content.priceMinor, currency, market.locale);
  return (
    <section
      className="section section--flush-top"
      id="gift-set"
      data-block="image_with_text:promo"
      aria-labelledby="gift-title"
    >
      <div className="pt-container">
        <div className="promo-split reveal">
          <div className="promo-split__media">
            {content.media.map((m) => (
              <Media key={m.alt} {...m} sizes="(min-width: 768px) 30vw, 50vw" />
            ))}
            <span className="promo-split__plus" aria-hidden="true">
              +
            </span>
          </div>
          <div className="promo-split__copy">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h2 className="h2" id="gift-title">
              <EmText value={content.title} />
            </h2>
            <p className="muted">{content.body}</p>
            <p className="promo-price">
              <span className="sr-only">
                Bundle price {price}, was {was} if bought separately.
              </span>
              <strong aria-hidden="true">{price}</strong>
              <s aria-hidden="true">{was}</s>
              <span className="save">Save {saving}</span>
            </p>
            <ul className="promo-list">
              {content.points.map((point) => (
                <li key={point}>
                  <Icon name="check" size="sm" />
                  {point}
                </li>
              ))}
            </ul>
            <ButtonLink href={href(market, content.cta.path)} variant="light" arrow className="self-start">
              {content.cta.label}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

// 4 · columns + image + rich_text: the craft story on tobacco, with an oversized "72 hrs" numeral
// behind the photos and three numbered points.
export function Craft({ market, content }: { market: MarketRef; content: typeof CraftContent }) {
  return (
    <section
      className="section craft on-dark"
      id="craft"
      data-block="columns+image+rich_text"
      aria-labelledby="craft-title"
    >
      <div className="pt-container craft__grid">
        <div className="craft__media">
          <span className="craft__numeral" aria-hidden="true">
            {content.numeral.value}
            <small>{content.numeral.unit}</small>
          </span>
          <div className="craft__main reveal">
            <Media {...content.media} sizes="(min-width: 1024px) 40vw, 82vw" />
          </div>
          <div className="craft__detail reveal">
            <Media {...content.detail} sizes="(min-width: 1024px) 20vw, 44vw" />
          </div>
        </div>
        <div className="craft__copy reveal">
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h2 className="h2" id="craft-title">
            <EmText value={content.title} />
          </h2>
          <p className="lede">{content.lede}</p>
          <ol className="craft__points">
            {content.points.map((point, i) => (
              <li key={point.title} className="craft__point">
                <span className="craft__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="h3">{point.title}</h3>
                  <p className="muted">{point.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <LinkArrow href={href(market, content.cta.path)} className="self-start">
            {content.cta.label}
          </LinkArrow>
        </div>
      </div>
    </section>
  );
}

const NUMBER_WORDS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

// Our story · story_cards: a snap carousel on phones and tablets; on desktop the section pins
// and the track slides with the page scroll (pure CSS scroll-driven animation, see story.css).
export function Story({ market, content }: { market: MarketRef; content: typeof StoryContent }) {
  const count = content.chapters.length;
  const countLabel = `${NUMBER_WORDS[count] ?? count} chapters`;
  return (
    <section
      className="section story"
      id="story"
      data-block="story_cards:scroll"
      aria-labelledby="story-title"
      // three cards fit on desktop; the scroll distance is set by how many start off-screen
      style={{ "--story-hidden": Math.max(count - 3, 1) } as React.CSSProperties}
    >
      <div className="story__pin">
        <div className="pt-container">
          <div className="story__head">
            <div className="section-head__text">
              <Eyebrow>{content.eyebrow}</Eyebrow>
              <h2 className="h2" id="story-title">
                <EmText value={content.title} />
              </h2>
            </div>
            <div className="story__meta">
              <span>{countLabel}</span>
              <span className="story__progress" aria-hidden="true">
                <span />
              </span>
              <span className="story-hint story-hint--swipe">Swipe to read on</span>
            </div>
          </div>
          {/* focusable so keyboard users can scroll the carousel */}
          <div
            className="story__viewport"
            tabIndex={0}
            role="region"
            aria-label={`${content.eyebrow}, ${countLabel.toLowerCase()}`}
          >
            <ol className="story__track">
              {content.chapters.map((chapter, i) => (
                <li key={chapter.title} className={cn("story-card", chapter.dark && "story-card--dark on-dark")}>
                  <div className="story-card__media">
                    <Media {...chapter.media} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 82vw" />
                    <span className="story-card__year">{chapter.year}</span>
                  </div>
                  <div className="story-card__body">
                    <span className="story-card__num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="h3">{chapter.title}</h3>
                    <p className="muted">{chapter.body}</p>
                    {chapter.link && <LinkArrow href={href(market, chapter.link.path)}>{chapter.link.label}</LinkArrow>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

// Ad B · promo_cards: two offers side by side from 768px; image beside text from 1280px.
export function PromoCards({ market, content }: { market: MarketRef; content: typeof ServicesContent }) {
  return (
    <section className="section" id="services" data-block="promo_cards" aria-labelledby="services-title">
      <div className="pt-container">
        <SectionHead id="services-title" eyebrow={content.eyebrow} title={content.title} />
        <div className="promo-cards">
          {content.cards.map((card) => (
            <Link
              key={card.title}
              className={cn("promo-card reveal", card.dark && "promo-card--dark")}
              href={href(market, card.cta.path)}
            >
              <div className="promo-card__media">
                <Media {...card.media} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 50vw, 100vw" />
              </div>
              <div className="promo-card__body">
                <span className="promo-card__tag">{card.tag}</span>
                <h3 className="h3">{card.title}</h3>
                <p className={card.dark ? "promo-card__text--dark" : "muted"}>{card.body}</p>
                <span className="promo-card__cta">
                  {card.cta.label} <Icon name="arrow" size="sm" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// 6 · testimonial_carousel: swipeable cards on phones, three columns from 1024px.
export function Testimonials({ content }: { content: typeof ReviewsContent }) {
  const average = content.score.average.toFixed(1);
  return (
    <section className="section" id="reviews" data-block="testimonial_carousel" aria-labelledby="reviews-title">
      <div className="pt-container">
        <div className="reviews__head reveal">
          <div className="section-head__text">
            <Eyebrow>{content.eyebrow}</Eyebrow>
            <h2 className="h2" id="reviews-title">
              <EmText value={content.title} />
            </h2>
          </div>
          <div className="score">
            <span className="score__num">{average}</span>
            <div className="score__meta">
              <Stars label={`Rated ${average} out of 5`} />
              <span className="muted score__count">from {content.score.count.toLocaleString("en")} reviews</span>
            </div>
          </div>
        </div>
        <ul className="carousel" tabIndex={0} role="region" aria-label="Customer reviews, scroll horizontally">
          {content.items.map((review) => (
            <li key={review.name} className="review">
              <Stars label={`Rated ${review.rating} out of 5`} size="sm" />
              <blockquote>“{review.quote}”</blockquote>
              <div className="review__by">
                <span>
                  <span className="review__name">{review.name}</span>
                  <span className="muted"> · {review.city}</span>
                </span>
                <span className="verified">
                  <Icon name="check" size="sm" />
                  Verified buyer
                </span>
                <span className="muted">Bought: {review.product}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="carousel-hint">Swipe or use arrow keys to see more reviews</p>
      </div>
    </section>
  );
}

// FAQ · collapsible_content: native <details>, so it works without JavaScript; the intro sticks
// beside the list from 1024px.
export function Faq({ market, content }: { market: MarketRef; content: typeof FaqContent }) {
  return (
    <section
      className="section section--flush-top"
      id="faq"
      data-block="collapsible_content:faq"
      aria-labelledby="faq-title"
    >
      <div className="pt-container faq__grid">
        <div className="faq__intro reveal">
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h2 className="h2" id="faq-title">
            <EmText value={content.title} />
          </h2>
          <p className="muted">{content.body}</p>
          <LinkArrow href={href(market, content.contact.path)} className="self-start">
            {content.contact.label}
          </LinkArrow>
        </div>
        <div className="faq__list reveal">
          {content.items.map((item, i) => (
            <details key={item.q} className="faq__item" open={i === 0}>
              <summary>
                {item.q}
                <span className="faq__toggle" aria-hidden="true">
                  <Icon name="plus" size="sm" />
                </span>
              </summary>
              <p className="faq__answer">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
