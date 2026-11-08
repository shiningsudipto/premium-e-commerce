import type { Metadata } from "next";
import { cookies, draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RenderBlocks } from "@/src/blocks/cms/render-blocks";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";
import { getPage, getPagePreview, pageSeo, type CmsPage } from "@/src/lib/pages";
import { PREVIEW_COOKIE } from "@/src/lib/preview";

type Props = PageProps<"/[market]/pages/[handle]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const market = await currentMarket();
  const page = await getPage(market, (await params).handle);
  if (!page) return {};
  const seo = pageSeo(page);
  return {
    title: seo.title ?? page.title,
    description: seo.description,
    alternates: { canonical: seo.canonical ?? href(market, `/pages/${page.handle}`) },
    robots: seo.noindex ? { index: false } : undefined,
    openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
  };
}

// CMS pages built in the admin (About, Shipping, Returns…). Published pages are cached and shared;
// blocks aimed at particular visitors are decided per request inside their own boundaries. The
// admin's preview link turns on Draft Mode (app/api/preview), which shows the draft instead.
export default async function CmsPageRoute({ params }: Props) {
  return (
    <Suspense>
      <PageBody params={params} />
    </Suspense>
  );
}

async function PageBody({ params }: Pick<Props, "params">) {
  const [market, { handle }, draft] = await Promise.all([currentMarket(), params, draftMode()]);
  if (draft.isEnabled) {
    const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
    const page = token ? await getPagePreview(market, handle, token) : null;
    if (page) return <PageContent page={page} />;
  }
  const page = await getPage(market, handle);
  if (!page) notFound();
  return <PageContent page={page} />;
}

async function PageContent({ page }: { page: CmsPage }) {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("common")]);
  return (
    <article className="pt-container">
      {page.preview && (
        <p className="notice" role="status">
          {t("previewNotice")} {/* a full navigation, so the route handler can clear the Draft Mode cookies */}
          <a href={`/api/preview?exit=1&handle=${encodeURIComponent(page.handle)}&market=${market.segment}`}>
            {t("previewExit")}
          </a>
        </p>
      )}
      <header className="page-head">
        <Breadcrumbs items={[{ label: t("home"), href: href(market) }, { label: page.title }]} />
        <h1 className="h2">{page.title}</h1>
      </header>
      <div className="section" style={{ paddingTop: 0 }}>
        <RenderBlocks blocks={page.blocks} market={market} refs={page} />
      </div>
    </article>
  );
}
