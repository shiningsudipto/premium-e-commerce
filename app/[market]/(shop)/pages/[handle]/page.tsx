import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { RenderBlocks } from "@/src/blocks/cms/render-blocks";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";
import { getPage, getPagePreview, pageSeo, type CmsPage } from "@/src/lib/pages";

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

// CMS pages built in the admin (About, Shipping, Returns…). Published pages are cached; a
// ?preview= link from the editor shows the draft instead.
export default async function CmsPageRoute({ params, searchParams }: Props) {
  return (
    <Suspense>
      <PageBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PageBody({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [market, { handle }, query] = await Promise.all([currentMarket(), params, searchParams]);
  const preview = typeof query.preview === "string" ? query.preview : null;
  const page = preview ? await getPagePreview(market, handle, preview) : await getPage(market, handle);
  if (!page) notFound();
  return <PageContent page={page} />;
}

async function PageContent({ page }: { page: CmsPage }) {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("common")]);
  return (
    <article className="pt-container">
      {page.preview && (
        <p className="notice" role="status">
          {t("previewNotice")}
        </p>
      )}
      <header className="page-head">
        <Breadcrumbs items={[{ label: t("home"), href: href(market) }, { label: page.title }]} />
        <h1 className="h2">{page.title}</h1>
      </header>
      <div className="section" style={{ paddingTop: 0 }}>
        <RenderBlocks blocks={page.blocks} market={market} />
      </div>
    </article>
  );
}
