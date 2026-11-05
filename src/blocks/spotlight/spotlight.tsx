import { getTranslations } from "next-intl/server";
import type { spotlight as SpotlightContent } from "../../content/home";
import { artFor } from "../../components/storefront/art";
import { Icon } from "../../components/storefront/icon";
import { Eyebrow, Stars } from "../../components/storefront/primitives";
import { colourValues, getProduct } from "../../lib/catalog";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { SpotlightBuy, type SpotlightVariant } from "./spotlight-buy";

// 5 · product_grid (single): one featured product with its gallery, specs, colours and "Add to
// bag". The product comes from the catalog (cached, revalidated with product:handle:…); the
// section is left out when the product doesn't exist or isn't for sale in this market.
export async function Spotlight({ market, content }: { market: MarketRef; content: typeof SpotlightContent }) {
  const [product, t] = await Promise.all([getProduct(market, content.productHandle), getTranslations("product")]);
  if (!product) return null;

  const colourOption = product.options.find((o) => /^colou?r$/i.test(o.name))?.name;
  const variants: SpotlightVariant[] = product.variants.map((v) => ({
    id: v.id,
    colour: colourOption ? (v.optionValues[colourOption] ?? null) : null,
    price: v.price ? formatMoney(v.price.amountMinor, v.price.currency, market.locale) : null,
    available: v.availableForSale,
    lowStock: v.stock === "low_stock",
  }));
  const priced = product.variants.filter((v) => v.price);
  if (!priced.length) return null;
  const minMinor = Math.min(...priced.map((v) => v.price!.amountMinor));
  const currency = priced[0]!.price!.currency;
  const fromPrice = formatMoney(minMinor, currency, market.locale);
  const samePrice = priced.every((v) => v.price!.amountMinor === minMinor);

  const art = artFor(product.title, ...product.tags);
  const media = product.media.filter((m) => m.mimeType.startsWith("image/"));
  const shots = [
    { image: media[0] ?? null, art, caption: "Front", label: "front view" },
    { image: media[1] ?? null, art, flip: true, caption: "Side", label: "side view" },
    { image: media[2] ?? null, art: "stitch" as const, caption: "Detail", label: "stitching detail" },
  ];
  const colours = colourValues(product);
  const initialColour = variants.find((v) => v.available)?.colour ?? colours[0] ?? null;

  return (
    <section className="section spotlight" id="spotlight" data-block="product_grid:single" aria-labelledby="spot-title">
      <div className="pt-container spot__grid">
        <SpotlightBuy
          title={product.title}
          variants={variants}
          initialColour={initialColour}
          shots={shots}
          labels={{ colour: t("colour"), add: t("addToBag"), soldOut: t("soldOut"), lowStock: t("lowStock") }}
          after={
            <p className="ship-note">
              <Icon name="truck" />
              <span>
                <strong>{content.shipNote.strong}</strong> {content.shipNote.text}
              </span>
            </p>
          }
        >
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h2 className="h2" id="spot-title">
            {product.title}
          </h2>
          <div className="spot__row">
            <p className="spot__price">{samePrice ? fromPrice : t("from", { price: fromPrice })}</p>
            {product.rating.count > 0 && product.rating.average !== null && (
              <p className="rating-inline">
                <Stars size="sm" />
                {t("rating", { average: product.rating.average.toFixed(1), count: product.rating.count })}
              </p>
            )}
          </div>
          <p>{content.blurb}</p>
          <dl className="specs">
            {content.specs.map(([term, value]) => (
              <div key={term} className="specs__row">
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </SpotlightBuy>
      </div>
    </section>
  );
}
