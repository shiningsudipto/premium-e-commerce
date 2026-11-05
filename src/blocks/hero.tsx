import type { hero as HeroContent } from "../content/home";
import { Icon } from "../components/storefront/icon";
import { Media } from "../components/storefront/media";
import { ButtonLink, EmText, Eyebrow } from "../components/storefront/primitives";
import { href } from "../lib/links";
import type { MarketRef } from "../lib/market";

// 1 · hero: full-bleed image with an inset detail shot, copy overlapping its edge on tablet and up,
// stacked under the image on phones. The text rises in on load (staggered by --d).
export function Hero({ market, content }: { market: MarketRef; content: typeof HeroContent }) {
  return (
    <section className="hero" data-block="hero" aria-labelledby="hero-title">
      <div className="pt-container hero__grid">
        <div className="hero__media reveal-img" style={{ "--d": 1 } as React.CSSProperties}>
          <Media {...content.media} priority sizes="(min-width: 768px) 66vw, 100vw" />
          <div className="hero__inset">
            <Media {...content.inset} sizes="(min-width: 768px) 20vw, 1px" />
          </div>
        </div>
        <div className="hero__copy">
          <Eyebrow className="rise">{content.eyebrow}</Eyebrow>
          <h1 className="display rise" id="hero-title" style={{ "--d": 1 } as React.CSSProperties}>
            <EmText value={content.title} />
          </h1>
          <p className="lede rise" style={{ "--d": 2 } as React.CSSProperties}>
            {content.lede}
          </p>
          <div className="hero__ctas rise" style={{ "--d": 3 } as React.CSSProperties}>
            <ButtonLink href={href(market, content.primary.path)} arrow>
              {content.primary.label}
            </ButtonLink>
            <ButtonLink href={href(market, content.secondary.path)} variant="secondary">
              {content.secondary.label}
            </ButtonLink>
          </div>
          <ul className="hero__trust rise" style={{ "--d": 4 } as React.CSSProperties}>
            {content.trust.map((item) => (
              <li key={item.label}>
                <Icon name={item.icon} size="sm" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
