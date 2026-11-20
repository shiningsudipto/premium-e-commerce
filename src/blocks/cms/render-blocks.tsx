import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ProductCard, ProductGridSkeleton } from "../product-shelf/product-card";
import { NewsletterForm } from "../letters/newsletter-form";
import { artFor } from "../../components/storefront/art";
import { Icon } from "../../components/storefront/icon";
import { Media, type MediaImage } from "../../components/storefront/media";
import { RichText } from "../../components/storefront/rich-text";
import { Stars } from "../../components/storefront/primitives";
import { RecentlyViewed } from "../../features/recommendations/recently-viewed";
import { getCollection, getTrendingProducts, listProducts, type ProductSummary } from "../../lib/catalog";
import type { MarketRef } from "../../lib/market";
import { href as marketHref } from "../../lib/links";
import { experimentOf, matchesAudience, matchesExperiment, personalAudience, type CmsBlock } from "./blocks";
import { ExperimentExposure } from "./exposure";
import { Carousel, Countdown, Tabs } from "./interactive";
import { videoSource } from "./video";
import { currentAssignments, currentVisitor } from "./visitor";

// Page-builder blocks (spec §9.1) for CMS pages: every type in the API's block registry has a
// renderer here; a type this storefront doesn't know yet renders nothing, so the admin can ship
// new blocks first. References (image IDs, global sections, hand-picked products) arrive already
// resolved with the page, so the page renders from one cached fetch.

export type PageRefs = {
  media: Record<string, MediaImage>;
  sections: Record<string, CmsBlock[]>;
  products: Record<string, ProductSummary>;
};

type Labels = Awaited<ReturnType<typeof labelsFor>>;
type Ctx = { market: MarketRef; refs: PageRefs; labels: Labels; depth: number };
type Renderer = (props: Record<string, unknown>, ctx: Ctx, children: CmsBlock[]) => ReactNode;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
// site paths in blocks are written without the market ("/collections/sale")
const link = (value: unknown, ctx: Ctx) => {
  const h = str(value);
  if (!h || !SAFE_HREF.test(h)) return undefined;
  return h.startsWith("/") ? marketHref(ctx.market, h) : h;
};
const mediaOf = (id: unknown, ctx: Ctx, alt?: unknown): MediaImage | null => {
  const m = str(id) ? ctx.refs.media[id as string] : undefined;
  return m ? { ...m, alt: str(alt) ?? m.alt } : null;
};
const items = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

const RENDERERS: Record<string, Renderer> = {
  hero: (p, ctx) => {
    const align = p.align === "left" || p.align === "right" ? p.align : "center";
    const cta = link(p.ctaHref, ctx);
    const image = mediaOf(p.imageMediaId, ctx);
    return (
      <section
        className={`block-hero${align !== "left" ? ` block-hero--${align}` : ""}${image ? "block-hero--image" : ""}`}
      >
        {image && (
          <div className="block-hero__media">
            <Media
              image={image}
              art={artFor(str(p.heading) ?? "")}
              alt=""
              decorative
              sizes="100vw"
              priority={ctx.depth === 0}
            />
          </div>
        )}
        <div className="block-hero__body">
          <h2 className="h2">{str(p.heading)}</h2>
          {str(p.subheading) && <p className="lede">{str(p.subheading)}</p>}
          {cta && str(p.ctaLabel) && (
            <Link className="btn btn--primary" href={cta}>
              {str(p.ctaLabel)}
            </Link>
          )}
        </div>
      </section>
    );
  },

  rich_text: (p) => <RichText value={p.document} />,

  // A text section from a list of elements: eyebrow, heading (*accent* words, line breaks), text,
  // quote, details rows and buttons, optionally on a tinted or light card.
  content_stack: (p, ctx) => {
    const elements = Array.isArray(p.elements) ? (p.elements as StackElement[]) : [];
    const bg =
      p.background === "tinted" || p.background === "light" ? ` cms-stack--card cms-stack--${p.background}` : "";
    return (
      <div className={`cms-stack${bg}${p.align === "center" ? "cms-stack--center" : ""}`}>
        {elements.map((el, i) => (
          <StackPart key={i} el={el} ctx={ctx} />
        ))}
      </div>
    );
  },

  // label, heading (with an italic accent line), paragraphs and a button: e.g. the text half of a
  // "text + image" layout
  heading_text: (p, ctx) => {
    const cta = link(p.ctaHref, ctx);
    const label = str(p.ctaLabel);
    const paragraphs = (str(p.body) ?? "")
      .split(/\n\s*\n/)
      .map((t) => t.trim())
      .filter(Boolean);
    const style =
      p.ctaStyle === "secondary" ? "btn btn--secondary" : p.ctaStyle === "link" ? "cms-text__link" : "btn btn--primary";
    return (
      <div className={`cms-text${p.align === "center" ? "cms-text--center" : ""}`}>
        {str(p.eyebrow) && <p className="eyebrow">{str(p.eyebrow)}</p>}
        <h2 className={p.size === "medium" ? "h2" : "display"}>
          {str(p.heading)}
          {str(p.headingAccent) && (
            <>
              <br />
              <em>{str(p.headingAccent)}</em>
            </>
          )}
        </h2>
        {paragraphs.map((t, i) => (
          <p key={i} className="cms-text__body">
            {t}
          </p>
        ))}
        {cta && label && (
          <Link className={style} href={cta}>
            {label} <Icon name="arrow" size="sm" />
          </Link>
        )}
      </div>
    );
  },

  image: (p, ctx) => {
    const image = mediaOf(p.mediaId, ctx, p.alt) ?? (str(p.url) ? { url: str(p.url)!, alt: str(p.alt) ?? null } : null);
    if (!image) {
      // no image chosen yet: the design's line-art placeholder in the chosen shape, so a new
      // layout looks finished until a photo is added (blocks with neither shape nor caption stay empty)
      if (!p.shape || p.shape === "original") return null;
      const shapeRatio = { portrait: "4 / 5", square: "1 / 1", landscape: "16 / 9" }[String(p.shape)] ?? "4 / 5";
      return (
        <figure className="cms-figure">
          <div className="cms-image" style={{ aspectRatio: shapeRatio }}>
            <Media
              art={artFor(str(p.alt) ?? "", str(p.caption) ?? "")}
              tone="warm"
              alt={str(p.alt) ?? ""}
              caption={str(p.caption)}
              decorative={!str(p.alt)}
            />
          </div>
        </figure>
      );
    }
    const target = link(p.href, ctx);
    const shape = { portrait: "4 / 5", square: "1 / 1", landscape: "16 / 9" }[String(p.shape)];
    const ratio = shape ?? (image.width && image.height ? `${image.width} / ${image.height}` : "4 / 3");
    const caption = str(p.caption);
    const overlay = p.captionStyle === "overlay" && caption;
    const img = (
      <div className="cms-image" style={{ aspectRatio: ratio }}>
        <Media image={image} art="tote" alt={image.alt ?? ""} sizes="(min-width: 1024px) 50vw, 100vw" />
        {overlay && <span className="cms-image__caption">{caption}</span>}
      </div>
    );
    return (
      <figure className="cms-figure">
        {target ? <Link href={target}>{img}</Link> : img}
        {caption && !overlay && <figcaption className="muted">{caption}</figcaption>}
      </figure>
    );
  },

  video: (p, ctx) => {
    const source = videoSource(p.url, { autoplay: p.autoplay === true, loop: p.loop === true });
    if (!source) return null;
    if (source.kind === "embed") {
      return (
        <div className="cms-video">
          <iframe
            src={source.src}
            title={ctx.labels.video}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    const poster = mediaOf(p.posterMediaId, ctx);
    return (
      <div className="cms-video">
        <video
          src={source.src}
          poster={poster?.url}
          controls
          playsInline
          preload="metadata"
          // autoplay is only allowed muted
          autoPlay={p.autoplay === true}
          muted={p.autoplay === true}
          loop={p.loop === true}
        />
      </div>
    );
  },

  carousel: (p, ctx) => {
    const slides = items(p.slides).flatMap((s, i) => {
      const image = mediaOf(s.mediaId, ctx, s.heading);
      if (!image) return [];
      const heading = str(s.heading);
      const target = link(s.href, ctx);
      const content = (
        <div className="cms-carousel__card">
          <div className="cms-carousel__media">
            <Media image={image} art="tote" alt={heading ?? image.alt ?? ""} sizes="(min-width: 1024px) 60vw, 90vw" />
          </div>
          {heading && <p className="cms-carousel__caption">{heading}</p>}
        </div>
      );
      return [
        {
          key: `${i}-${s.mediaId}`,
          label: heading ?? image.alt ?? `${i + 1}`,
          content: target ? <Link href={target}>{content}</Link> : content,
        },
      ];
    });
    if (!slides.length) return null;
    const seconds = typeof p.autoplaySeconds === "number" ? Math.min(30, Math.max(0, p.autoplaySeconds)) : 0;
    return <Carousel slides={slides} autoplaySeconds={seconds} labels={ctx.labels.carousel} />;
  },

  product_grid: (p, ctx) => {
    const limit = typeof p.limit === "number" ? Math.min(48, Math.max(1, p.limit)) : 8;
    const title = str(p.title) && (
      <h2 className="h3" style={{ marginBottom: "var(--space-5)" }}>
        {str(p.title)}
      </h2>
    );
    if (p.source === "products") {
      // hand-picked, in the editor's order; pieces no longer on sale are simply skipped
      const picked = (Array.isArray(p.productIds) ? p.productIds : [])
        .map((id) => (typeof id === "string" ? ctx.refs.products[id] : undefined))
        .filter((x): x is ProductSummary => !!x)
        .slice(0, limit);
      if (!picked.length) return null;
      return (
        <section className="section">
          {title}
          <ul className="product-grid">
            {picked.map((product, i) => (
              <ProductCard key={product.id} product={product} market={ctx.market} index={i} />
            ))}
          </ul>
        </section>
      );
    }
    const source = p.source === "category" || p.source === "collection" ? p.source : null;
    const ref = str(p.ref);
    if (!source || !ref) return null;
    return (
      <section className="section">
        {title}
        <Suspense fallback={<ProductGridSkeleton count={Math.min(limit, 8)} label="" />}>
          <ProductGridBlock market={ctx.market} source={source} refHandle={ref} limit={limit} />
        </Suspense>
      </section>
    );
  },

  collection_list: (p, ctx) => {
    const handles = (Array.isArray(p.collectionHandles) ? p.collectionHandles : [])
      .filter((h): h is string => typeof h === "string" && !!h)
      .slice(0, 12);
    if (!handles.length) return null;
    return (
      <section className="section">
        {str(p.title) && (
          <h2 className="h3" style={{ marginBottom: "var(--space-5)" }}>
            {str(p.title)}
          </h2>
        )}
        <Suspense fallback={null}>
          <CollectionTiles market={ctx.market} handles={handles} />
        </Suspense>
      </section>
    );
  },

  testimonial: (p) => (
    <section className="section card-list card-list--2">
      {items(p.items).map((item, i) => (
        <figure className="box" key={i}>
          {typeof item.rating === "number" && <Stars label={`${item.rating} / 5`} size="sm" />}
          <blockquote>{str(item.quote)}</blockquote>
          <figcaption className="muted">— {str(item.author)}</figcaption>
        </figure>
      ))}
    </section>
  ),

  faq: (p) => <Disclosures title={str(p.title)} items={p.items} titleKey="question" bodyKey="answer" />,
  accordion: (p) => (
    <Disclosures items={p.items} titleKey="title" bodyKey="content" single={p.allowMultiple !== true} />
  ),

  tabs: (p) => {
    const list = items(p.items).filter((i) => str(i.title));
    if (!list.length) return null;
    return <Tabs items={list.map((i) => ({ title: str(i.title)!, content: <RichText value={i.content} /> }))} />;
  },

  countdown: (p, ctx) => {
    const heading = str(p.heading);
    const endsAt = str(p.endsAt);
    if (!heading || !endsAt || Number.isNaN(Date.parse(endsAt))) return null;
    const ends = new Intl.DateTimeFormat(ctx.market.locale, { dateStyle: "long", timeStyle: "short" }).format(
      new Date(endsAt),
    );
    return (
      <Countdown
        heading={heading}
        endsAt={endsAt}
        hideWhenDone={p.hideWhenDone !== false}
        endsLabel={ctx.labels.countdownEnds.replace("{date}", ends)}
        labels={ctx.labels.countdown}
      />
    );
  },

  // Trending is the same for everyone: rendered here and cached with the catalog. Recently viewed
  // lives in the shopper's browser, so the browser fills it in (and leaves it out when empty).
  recommendations: (p, ctx) => {
    const limit = typeof p.limit === "number" ? Math.min(24, Math.max(1, Math.round(p.limit))) : 8;
    const title = str(p.title);
    if (p.placement === "recently_viewed") {
      return (
        <RecentlyViewed
          market={ctx.market}
          title={title ?? ctx.labels.recentlyViewed}
          limit={limit}
          className="section"
        />
      );
    }
    if (p.placement !== "trending") return null;
    return (
      <Suspense fallback={<ProductGridSkeleton count={Math.min(limit, 8)} label="" />}>
        <TrendingBlock market={ctx.market} title={title ?? ctx.labels.trending} limit={limit} />
      </Suspense>
    );
  },

  // Newsletter sign-up: a full-width band in the brand colour (default) or plain. By default only a
  // Subscribe button shows; clicking it reveals the email field and a Submit button.
  newsletter: (p, ctx) => {
    const band = p.style !== "plain";
    return (
      <section className={band ? "section cms-newsletter cms-newsletter--band on-dark" : "section cms-newsletter"}>
        <div className="cms-newsletter__inner">
          {str(p.heading) && <h2 className={band ? "h2" : "h3"}>{str(p.heading)}</h2>}
          {str(p.body) && <p className="cms-newsletter__body">{str(p.body)}</p>}
          <NewsletterForm
            consent={<span className="consent">{ctx.labels.newsletterConsent}</span>}
            reveal={p.revealOnClick !== false}
            revealLabel={str(p.buttonLabel)}
            submitLabel={str(p.submitLabel)}
          />
        </div>
      </section>
    );
  },

  columns: (p, ctx, children) => {
    const gap =
      { none: "0", sm: "var(--space-3)", md: "var(--space-5)", lg: "var(--space-7)" }[String(p.gap)] ??
      "var(--space-5)";
    const count = Math.max(1, children.length);
    // two columns can have uneven widths; three or more are always equal
    const ratio = { "60-40": "3fr 2fr", "40-60": "2fr 3fr", "67-33": "2fr 1fr", "33-67": "1fr 2fr" }[String(p.ratio)];
    const template =
      count === 2 && ratio
        ? ratio
            .split(" ")
            .map((w) => `minmax(0, ${w})`)
            .join(" ")
        : `repeat(${count}, minmax(0, 1fr))`;
    const align = { center: "center", bottom: "end" }[String(p.align)] ?? "start";
    const classes = [
      "cms-columns",
      p.stackOnMobile === false && "cms-columns--keep",
      p.stackOnMobile !== false && p.reverseOnMobile === true && "cms-columns--reverse",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        className={classes}
        style={{
          gap,
          alignItems: align,
          gridTemplateColumns: template,
          ["--cols-template" as string]: template,
        }}
      >
        {children.map((child, i) => (
          <div key={child.id ?? i} className="cms-columns__col">
            {renderBlock(child, { ...ctx, depth: ctx.depth + 1 })}
          </div>
        ))}
      </div>
    );
  },

  spacer: (p) => {
    const size = ["sm", "md", "lg", "xl"].includes(String(p.size)) ? String(p.size) : "md";
    return <div className={`spacer-${size}`} aria-hidden="true" />;
  },

  // Global sections are published SECTION pages, resolved with the page and already filtered by
  // market and schedule (lib/pages.ts). They can't nest further sections.
  section_ref: (p, ctx) => {
    const handle = str(p.sectionHandle);
    if (!handle || ctx.depth > 2) return null;
    const blocks = (ctx.refs.sections[handle] ?? []).filter((b) => b.type !== "section_ref");
    return blocks.map((b, i) => <div key={b.id ?? i}>{renderBlock(b, { ...ctx, depth: ctx.depth + 1 })}</div>);
  },

  // Only staff with the dedicated `content.html.write` permission can save this block (the API
  // checks), so its HTML is trusted like the theme's own markup.
  custom_html: (p) =>
    str(p.html) ? <div className="cms-html" dangerouslySetInnerHTML={{ __html: p.html as string }} /> : null,
};

async function ProductGridBlock({
  market,
  source,
  refHandle,
  limit,
}: {
  market: MarketRef;
  source: "category" | "collection";
  refHandle: string;
  limit: number;
}) {
  const listing = await listProducts(market, { [source]: refHandle, pageSize: limit, facets: "0" }).catch(() => null);
  if (!listing?.items.length) return null;
  return (
    <ul className="product-grid">
      {listing.items.map((product, i) => (
        <ProductCard key={product.id} product={product} market={market} index={i} />
      ))}
    </ul>
  );
}

async function TrendingBlock({ market, title, limit }: { market: MarketRef; title: string; limit: number }) {
  const products = await getTrendingProducts(market, limit);
  if (!products.length) return null;
  return (
    <section className="section" data-testid="cms-trending">
      <h2 className="h3" style={{ marginBottom: "var(--space-5)" }}>
        {title}
      </h2>
      <ul className="product-grid">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} market={market} index={i} />
        ))}
      </ul>
    </section>
  );
}

async function CollectionTiles({ market, handles }: { market: MarketRef; handles: string[] }) {
  const collections = (await Promise.all(handles.map((h) => getCollection(market, h).catch(() => null)))).filter(
    (c): c is NonNullable<typeof c> => !!c,
  );
  if (!collections.length) return null;
  return (
    <ul className="cms-tiles">
      {collections.map((c, i) => (
        <li key={c.id}>
          <Link className="cms-tile" href={marketHref(market, `/collections/${c.handle}`)}>
            <div className="cms-tile__media">
              <Media art={artFor(c.title)} tone={(["mid", "warm", "light"] as const)[i % 3]} alt="" decorative />
            </div>
            <span className="cms-tile__title">{c.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Disclosures({
  title,
  items: raw,
  titleKey,
  bodyKey,
  single,
}: {
  title?: string;
  items: unknown;
  titleKey: string;
  bodyKey: string;
  // one open at a time (native exclusive <details> via a shared name)
  single?: boolean;
}) {
  const list = items(raw);
  if (!list.length) return null;
  const group = single ? `acc-${list.length}-${String(list[0]?.[titleKey] ?? "").slice(0, 12)}` : undefined;
  return (
    <section className="section pdp__details">
      {title && (
        <h2 className="h3" style={{ marginBottom: "var(--space-4)" }}>
          {title}
        </h2>
      )}
      {list.map((item, i) => (
        <details key={i} name={group}>
          <summary>
            {str(item[titleKey])}
            <Icon name="chevron" size="sm" className="disclosure__chevron" />
          </summary>
          <div style={{ paddingTop: "var(--space-3)" }}>
            <RichText value={item[bodyKey]} />
          </div>
        </details>
      ))}
    </section>
  );
}

// A block aimed at signed-in shoppers, new visitors or segments, or an A/B variant: decided per
// visitor, inside its own Suspense boundary, so the rest of the page stays shared and cached.
// A variant shows only to visitors bucketed into it (assignments are read once per request) and
// reports the exposure from the browser when it does.
async function Targeted({ block, ctx }: { block: CmsBlock; ctx: Ctx }) {
  const experiment = experimentOf(block);
  const audience = personalAudience(block);
  const [assigned, visitor] = await Promise.all([
    experiment ? currentAssignments() : null,
    audience ? currentVisitor() : null,
  ]);
  if (experiment && (!assigned?.visitorId || !matchesExperiment(experiment, assigned.assignments))) return null;
  if (audience && !matchesAudience(audience, visitor!)) return null;
  const content = draw(block, ctx);
  if (!experiment || !assigned?.visitorId) return content;
  return (
    <>
      {content}
      <ExperimentExposure
        visitorId={assigned.visitorId}
        market={ctx.market}
        experimentKey={experiment.key}
        variant={experiment.variant}
      />
    </>
  );
}

function draw(block: CmsBlock, ctx: Ctx): ReactNode {
  const render = RENDERERS[block.type];
  if (!render) return null;
  const hide = block.settings?.hideOn ?? [];
  const content = render(block.props ?? {}, ctx, block.children ?? []);
  if (!hide.length) return content;
  return <div className={hide.map((h) => `hide-on-${h}`).join(" ")}>{content}</div>;
}

function renderBlock(block: CmsBlock, ctx: Ctx): ReactNode {
  if (!RENDERERS[block.type]) return null;
  if (personalAudience(block) || experimentOf(block)) {
    return (
      <Suspense fallback={null}>
        <Targeted block={block} ctx={ctx} />
      </Suspense>
    );
  }
  return draw(block, ctx);
}

async function labelsFor() {
  const [t, r] = await Promise.all([getTranslations("cms"), getTranslations("recommendations")]);
  return {
    video: t("video"),
    carousel: { region: t("carousel"), previous: t("previous"), next: t("next") },
    countdown: { days: t("days"), hours: t("hours"), minutes: t("minutes"), seconds: t("seconds"), ended: t("ended") },
    // filled in per block with the formatted end time
    countdownEnds: t.raw("endsOn") as string,
    newsletterConsent: t("newsletterConsent"),
    trending: r("trending"),
    recentlyViewed: r("recentlyViewed"),
  };
}

export async function RenderBlocks({
  blocks,
  market,
  refs,
}: {
  blocks: CmsBlock[];
  market: MarketRef;
  refs: PageRefs;
}) {
  const ctx: Ctx = { market, refs, labels: await labelsFor(), depth: 0 };
  return (
    <>
      {blocks.map((block, i) => (
        <div key={block.id ?? i}>{renderBlock(block, ctx)}</div>
      ))}
    </>
  );
}

type StackElement = {
  kind?: string;
  text?: string;
  size?: string;
  tone?: string;
  author?: string;
  rows?: { label?: string; value?: string; href?: string }[];
  label?: string;
  href?: string;
  style?: string;
  buttonSize?: string;
};

// "Made to be *repaired,* not replaced." → words in stars become <em> (italic, brand colour);
// new lines become line breaks.
function accented(text: string): ReactNode {
  return text.split("\n").map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))}
    </span>
  ));
}

function StackPart({ el, ctx }: { el: StackElement; ctx: Ctx }) {
  const text = typeof el.text === "string" ? el.text.trim() : "";
  switch (el.kind) {
    case "eyebrow":
      return text ? <p className="eyebrow">{text}</p> : null;
    case "heading": {
      if (!text) return null;
      const cls = el.size === "md" ? "h3" : el.size === "lg" ? "h2" : "display";
      return <h2 className={cls}>{accented(text)}</h2>;
    }
    case "text": {
      const paragraphs = text
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean);
      const cls =
        el.tone === "note"
          ? "cms-stack__note"
          : el.tone === "normal"
            ? "cms-stack__text"
            : "cms-stack__text cms-stack__text--muted";
      return (
        <>
          {paragraphs.map((t, i) => (
            <p key={i} className={cls}>
              {t}
            </p>
          ))}
        </>
      );
    }
    case "quote":
      return text ? (
        <blockquote className="cms-stack__quote">
          <p>“{text}”</p>
          {el.author?.trim() && <footer>— {el.author.trim()}</footer>}
        </blockquote>
      ) : null;
    case "details": {
      const rows = (el.rows ?? []).filter((r) => r.label?.trim() || r.value?.trim());
      if (!rows.length) return null;
      return (
        <dl className="cms-stack__details">
          {rows.map((r, i) => {
            const target = link(r.href, ctx);
            return (
              <div key={i}>
                <dt>{r.label}</dt>
                <dd>{target ? <a href={target}>{r.value}</a> : r.value}</dd>
              </div>
            );
          })}
        </dl>
      );
    }
    case "button": {
      const target = link(el.href, ctx);
      const label = el.label?.trim();
      if (!target || !label) return null;
      const cls =
        el.style === "link"
          ? "cms-stack__link"
          : `btn ${el.style === "secondary" ? "btn--secondary" : "btn--primary"}${el.buttonSize === "lg" ? " btn--lg" : ""}`;
      return (
        <Link className={cls} href={target}>
          {label} <Icon name="arrow" size="sm" />
        </Link>
      );
    }
    default:
      return null;
  }
}
