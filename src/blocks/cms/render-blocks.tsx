import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ProductCard, ProductGridSkeleton } from "../product-shelf/product-card";
import { NewsletterForm } from "../letters/newsletter-form";
import { artFor } from "../../components/storefront/art";
import { Media, type MediaImage } from "../../components/storefront/media";
import { RichText } from "../../components/storefront/rich-text";
import { Stars } from "../../components/storefront/primitives";
import { getCollection, listProducts, type ProductSummary } from "../../lib/catalog";
import type { MarketRef } from "../../lib/market";
import { href as marketHref } from "../../lib/links";
import { matchesAudience, personalAudience, type CmsBlock } from "./blocks";
import { Carousel, Countdown, Tabs } from "./interactive";
import { videoSource } from "./video";
import { currentVisitor } from "./visitor";

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

  image: (p, ctx) => {
    const image = mediaOf(p.mediaId, ctx, p.alt) ?? (str(p.url) ? { url: str(p.url)!, alt: str(p.alt) ?? null } : null);
    if (!image) return null;
    const target = link(p.href, ctx);
    const ratio = image.width && image.height ? `${image.width} / ${image.height}` : "4 / 3";
    const img = (
      <div className="cms-image" style={{ aspectRatio: ratio }}>
        <Media image={image} art="tote" alt={image.alt ?? ""} sizes="(min-width: 1024px) 80vw, 100vw" />
      </div>
    );
    return (
      <figure className="cms-figure">
        {target ? <Link href={target}>{img}</Link> : img}
        {str(p.caption) && <figcaption className="muted">{str(p.caption)}</figcaption>}
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

  newsletter: (p, ctx) => (
    <section className="section cms-newsletter">
      {str(p.heading) && <h2 className="h3">{str(p.heading)}</h2>}
      {str(p.body) && <p className="muted">{str(p.body)}</p>}
      <NewsletterForm consent={<span className="consent">{ctx.labels.newsletterConsent}</span>} />
    </section>
  ),

  columns: (p, ctx, children) => {
    const gap =
      { none: "0", sm: "var(--space-3)", md: "var(--space-5)", lg: "var(--space-7)" }[String(p.gap)] ??
      "var(--space-5)";
    return (
      <div
        className={p.stackOnMobile === false ? "cms-columns cms-columns--keep" : "cms-columns"}
        style={{
          gap,
          gridTemplateColumns: `repeat(${Math.max(1, children.length)}, minmax(0, 1fr))`,
          ["--cols" as string]: Math.max(1, children.length),
        }}
      >
        {children.map((child, i) => (
          <div key={child.id ?? i}>{renderBlock(child, { ...ctx, depth: ctx.depth + 1 })}</div>
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
          <summary>{str(item[titleKey])}</summary>
          <div style={{ paddingTop: "var(--space-3)" }}>
            <RichText value={item[bodyKey]} />
          </div>
        </details>
      ))}
    </section>
  );
}

// A block aimed at signed-in shoppers, new visitors or segments: decided per visitor, inside its
// own Suspense boundary, so the rest of the page stays shared and cached.
async function Targeted({ block, ctx }: { block: CmsBlock; ctx: Ctx }) {
  const audience = personalAudience(block)!;
  if (!matchesAudience(audience, await currentVisitor())) return null;
  return draw(block, ctx);
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
  if (personalAudience(block)) {
    return (
      <Suspense fallback={null}>
        <Targeted block={block} ctx={ctx} />
      </Suspense>
    );
  }
  return draw(block, ctx);
}

async function labelsFor() {
  const t = await getTranslations("cms");
  return {
    video: t("video"),
    carousel: { region: t("carousel"), previous: t("previous"), next: t("next") },
    countdown: { days: t("days"), hours: t("hours"), minutes: t("minutes"), seconds: t("seconds"), ended: t("ended") },
    // filled in per block with the formatted end time
    countdownEnds: t.raw("endsOn") as string,
    newsletterConsent: t("newsletterConsent"),
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
