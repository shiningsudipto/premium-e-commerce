import Link from "next/link";
import type { collections as CollectionsContent } from "../content/home";
import { Icon } from "../components/storefront/icon";
import { Media } from "../components/storefront/media";
import { LinkArrow, SectionHead } from "../components/storefront/primitives";
import { href } from "../lib/links";
import type { MarketRef } from "../lib/market";

// 2 · collection_list: a swipeable row on phones; from 768px a 4-column grid where the first
// tile spans two rows and the second spans two columns.
export function CollectionList({ market, content }: { market: MarketRef; content: typeof CollectionsContent }) {
  return (
    <section
      className="section section--tight-top"
      id="collections"
      data-block="collection_list"
      aria-labelledby="collections-title"
    >
      <div className="pt-container">
        <SectionHead
          id="collections-title"
          eyebrow={content.eyebrow}
          title={content.title}
          action={<LinkArrow href={href(market, content.viewAll.path)}>{content.viewAll.label}</LinkArrow>}
        />
        <ul className="collections__grid">
          {content.tiles.map((tile, i) => (
            <li key={tile.path} className="tile reveal">
              <Link className="tile__link" href={href(market, tile.path)}>
                <Media
                  art={tile.art}
                  tone={tile.tone}
                  alt={tile.alt}
                  sizes={i === 0 ? "(min-width: 768px) 50vw, 78vw" : "(min-width: 768px) 25vw, 78vw"}
                />
                <span className="tile__label">
                  <span className="tile__text">
                    <span className="tile__name">{tile.name}</span>
                    <span className="tile__count">{tile.count}</span>
                  </span>
                  <span className="tile__arrow" aria-hidden="true">
                    <Icon name="arrow" size="sm" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
