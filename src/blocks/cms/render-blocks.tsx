import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ProductCard, ProductGridSkeleton } from "../product-shelf/product-card";
import { RichText } from "../../components/storefront/rich-text";
import { Stars } from "../../components/storefront/primitives";
import { listProducts } from "../../lib/catalog";
import type { MarketRef } from "../../lib/market";
import { href as marketHref } from "../../lib/links";
import type { CmsBlock } from "./blocks";

// Page-builder blocks (spec §9.1) rendered for CMS pages. Each type has one renderer; a type
// this storefront doesn't know yet renders nothing, so the admin can ship new blocks first.

type Ctx = { market: MarketRef };
type Renderer = (props: Record<string, unknown>, ctx: Ctx, children: CmsBlock[]) => ReactNode;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
// site paths in blocks are written without the market ("/collections/sale")
const link = (value: unknown, ctx: Ctx) => {
  const h = str(value);
  if (!h || !SAFE_HREF.test(h)) return undefined;
  return h.startsWith("/") ? marketHref(ctx.market, h) : h;
};

const RENDERERS: Record<string, Renderer> = {
  hero: (p, ctx) => {
    const align = p.align === "left" || p.align === "right" ? p.align : "center";
    const cta = link(p.ctaHref, ctx);
    return (
      <section className={`block-hero${align !== "left" ? ` block-hero--${align}` : ""}`}>
        <h2 className="h2">{str(p.heading)}</h2>
        {str(p.subheading) && <p className="lede">{str(p.subheading)}</p>}
        {cta && str(p.ctaLabel) && (
          <Link className="btn btn--primary" href={cta}>
            {str(p.ctaLabel)}
          </Link>
        )}
      </section>
    );
  },
  rich_text: (p) => <RichText value={p.document} />,
  image: (p, ctx) => {
    const src = str(p.url) ?? str(p.imageUrl);
    if (!src) return null;
    const target = link(p.href, ctx);
    // eslint-disable-next-line @next/next/no-img-element -- media from the library has no known size
    const img = <img src={src} alt={str(p.alt) ?? ""} loading="lazy" style={{ width: "100%", height: "auto" }} />;
    return (
      <figure>
        {target ? <Link href={target}>{img}</Link> : img}
        {str(p.caption) && <figcaption className="muted">{str(p.caption)}</figcaption>}
      </figure>
    );
  },
  product_grid: (p, ctx) => {
    const source = p.source === "category" || p.source === "collection" ? p.source : null;
    const ref = str(p.ref);
    if (!source || !ref) return null;
    const limit = typeof p.limit === "number" ? Math.min(48, Math.max(1, p.limit)) : 8;
    return (
      <section className="section">
        {str(p.title) && (
          <h2 className="h3" style={{ marginBottom: "var(--space-5)" }}>
            {str(p.title)}
          </h2>
        )}
        <Suspense fallback={<ProductGridSkeleton count={Math.min(limit, 8)} label="" />}>
          <ProductGridBlock market={ctx.market} source={source} refHandle={ref} limit={limit} />
        </Suspense>
      </section>
    );
  },
  testimonial: (p) => {
    const items = Array.isArray(p.items) ? (p.items as { quote?: unknown; author?: unknown; rating?: unknown }[]) : [];
    return (
      <section className="section card-list card-list--2">
        {items.map((item, i) => (
          <figure className="box" key={i}>
            {typeof item.rating === "number" && <Stars label={`${item.rating} / 5`} size="sm" />}
            <blockquote>{str(item.quote)}</blockquote>
            <figcaption className="muted">— {str(item.author)}</figcaption>
          </figure>
        ))}
      </section>
    );
  },
  faq: (p) => <Disclosures title={str(p.title)} items={p.items} titleKey="question" bodyKey="answer" />,
  accordion: (p) => <Disclosures items={p.items} titleKey="title" bodyKey="content" />,
  // tabs need script to switch; as disclosures they stay usable everywhere
  tabs: (p) => <Disclosures items={p.items} titleKey="title" bodyKey="content" />,
  columns: (p, ctx, children) => {
    const gap =
      { none: "0", sm: "var(--space-3)", md: "var(--space-5)", lg: "var(--space-7)" }[String(p.gap)] ??
      "var(--space-5)";
    return (
      <div
        className="cms-columns"
        style={{ gap, gridTemplateColumns: `repeat(${Math.max(1, children.length)}, minmax(0, 1fr))` }}
      >
        {children.map((child, i) => (
          <div key={child.id ?? i}>{renderBlock(child, ctx)}</div>
        ))}
      </div>
    );
  },
  spacer: (p) => {
    const size = ["sm", "md", "lg", "xl"].includes(String(p.size)) ? String(p.size) : "md";
    return <div className={`spacer-${size}`} aria-hidden="true" />;
  },
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

function Disclosures({
  title,
  items,
  titleKey,
  bodyKey,
}: {
  title?: string;
  items: unknown;
  titleKey: string;
  bodyKey: string;
}) {
  const list = Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  if (!list.length) return null;
  return (
    <section className="section pdp__details">
      {title && (
        <h2 className="h3" style={{ marginBottom: "var(--space-4)" }}>
          {title}
        </h2>
      )}
      {list.map((item, i) => (
        <details key={i}>
          <summary>{str(item[titleKey])}</summary>
          <div style={{ paddingTop: "var(--space-3)" }}>
            <RichText value={item[bodyKey]} />
          </div>
        </details>
      ))}
    </section>
  );
}

function renderBlock(block: CmsBlock, ctx: Ctx): ReactNode {
  const render = RENDERERS[block.type];
  if (!render) return null;
  const hide = block.settings?.hideOn ?? [];
  const content = render(block.props ?? {}, ctx, block.children ?? []);
  if (!hide.length) return content;
  return <div className={hide.map((h) => `hide-on-${h}`).join(" ")}>{content}</div>;
}

export function RenderBlocks({ blocks, market }: { blocks: CmsBlock[]; market: MarketRef }) {
  return (
    <>
      {blocks.map((block, i) => (
        <div key={block.id ?? i}>{renderBlock(block, { market })}</div>
      ))}
    </>
  );
}
