import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { AssetLink } from "@/src/features/affiliate/asset-link";
import { fileFormat, fileSize } from "@/src/features/affiliate/assets";
import { activeAffiliate } from "@/src/features/affiliate/data";
import { env } from "@/src/lib/env";
import { href } from "@/src/lib/links";
import { formatMoney } from "@/src/lib/money";
import { getStoreConfig } from "@/src/lib/store-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("nav.assets"), robots: { index: false } };
}

// Marketing assets: banners, product images and ready-made copy. Downloads go through
// ./[id]/download (the API counts them with the shopper's session); the tracked link carries the
// affiliate's code and the asset, so clicks and orders are credited to both.
export default async function AffiliateAssetsPage() {
  const me = await activeAffiliate();
  if (!me) return null;
  const [ctx, t] = await Promise.all([requestContext(), getTranslations("affiliate")]);
  const api = serverApi(ctx);
  const [assets, analytics, config] = await Promise.all([
    unwrap(api.GET("/v1/affiliate/assets")),
    unwrap(api.GET("/v1/affiliate/assets/analytics", { params: { query: {} } })),
    getStoreConfig(ctx.market),
  ]);
  const count = new Intl.NumberFormat(ctx.market.locale);
  const byId = new Map(analytics.map((a) => [a.id, a]));
  const marketPrefix = href(ctx.market);

  return (
    <section aria-labelledby="affiliate-assets-title">
      <h2 className="h3" id="affiliate-assets-title">
        {t("assets.title")}
      </h2>
      <p className="muted">{t("assets.intro")}</p>
      {assets.length ? (
        <ul className="affiliate-assets" data-testid="affiliate-assets">
          {assets.map((a) => {
            const stats = byId.get(a.id);
            const format = fileFormat(a.media?.mimeType);
            const meta = [
              t(`assets.kind.${a.kind}`),
              format,
              a.media?.width && a.media.height ? t("assets.dimensions", { w: a.media.width, h: a.media.height }) : null,
              a.media ? fileSize(a.media.sizeBytes, ctx.market.locale) : null,
            ].filter(Boolean);
            const isImage = !!a.media && a.media.mimeType.startsWith("image/");
            return (
              <li key={a.id} className="affiliate-asset">
                <article aria-labelledby={`asset-${a.id}`}>
                  {isImage ? (
                    <div className="affiliate-asset__preview">
                      {/* eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host */}
                      <img
                        src={a.media!.url}
                        alt={t("assets.previewAlt", { title: a.title })}
                        width={a.media!.width ?? undefined}
                        height={a.media!.height ?? undefined}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : a.kind === "copy" && a.body ? (
                    <blockquote className="affiliate-asset__copy">{a.body}</blockquote>
                  ) : null}
                  <h3 className="affiliate-asset__title" id={`asset-${a.id}`}>
                    {a.title}
                  </h3>
                  <p className="muted affiliate-asset__meta">{meta.join(" · ")}</p>
                  {stats && (
                    <p className="affiliate-asset__stats">
                      {t("assets.stats", {
                        downloads: count.format(stats.downloads),
                        clicks: count.format(stats.clicks),
                        orders: count.format(stats.conversions),
                      })}
                      {stats.revenueMinor > 0 &&
                        ` · ${t("assets.revenue", { amount: formatMoney(stats.revenueMinor, config.market.currency, ctx.market.locale) })}`}
                    </p>
                  )}
                  <p className="affiliate-asset__actions">
                    <a
                      className="btn btn--primary"
                      href={href(ctx.market, `/affiliate/assets/${encodeURIComponent(a.id)}/download`)}
                      download
                    >
                      {t("assets.download")}
                      <span className="sr-only">
                        : {a.title}
                        {format ? ` (${format})` : ""}
                      </span>
                    </a>
                  </p>
                  <AssetLink
                    asset={{ id: a.id, title: a.title, kind: a.kind, body: a.body, media: a.media }}
                    origin={env.SITE_URL}
                    marketPrefix={marketPrefix}
                  />
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{t("assets.empty")}</p>
      )}
      <p className="muted affiliate-assets__note">{t("assets.statsNote")}</p>
    </section>
  );
}
