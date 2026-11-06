import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { serverApi } from "@/src/api/server";
import { Breadcrumbs } from "@/src/components/storefront/breadcrumbs";
import { Icon } from "@/src/components/storefront/icon";
import { ListingSkeleton } from "@/src/features/catalog/listing-skeleton";
import { parseListing, toApiQuery } from "@/src/features/catalog/listing-query";
import { ProductListing } from "@/src/features/catalog/product-listing";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  // results pages are for people, not search engines
  return { title: t("title"), robots: { index: false, follow: true } };
}

// Search results. Search is dynamic (plan B.3): every query goes to the API, which also returns
// merchandised redirects ("returns" → the returns page) and spelling suggestions for no results.
export default async function SearchPage({ searchParams }: PageProps<"/[market]/search">) {
  const market = await currentMarket();
  const t = await getTranslations("search");
  return (
    <div className="pt-container">
      <header className="page-head">
        <Breadcrumbs items={[{ label: t("home"), href: href(market) }, { label: t("title") }]} />
        <Suspense fallback={<h1 className="h2">{t("title")}</h1>}>
          <SearchHeading searchParams={searchParams} />
        </Suspense>
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchHeading({ searchParams }: { searchParams: PageProps<"/[market]/search">["searchParams"] }) {
  const [market, t, params] = await Promise.all([currentMarket(), getTranslations("search"), searchParams]);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  return (
    <>
      <h1 className="h2">{q ? t("resultsFor", { q }) : t("title")}</h1>
      <form className="search-form" role="search" action={href(market, "/search")} method="get">
        <input
          className="input"
          type="search"
          name="q"
          defaultValue={q}
          aria-label={t("label")}
          placeholder={t("placeholder")}
        />
        <button className="btn btn--primary" type="submit">
          <Icon name="search" size="sm" />
          {t("submit")}
        </button>
      </form>
    </>
  );
}

async function SearchResults({ searchParams }: { searchParams: PageProps<"/[market]/search">["searchParams"] }) {
  const [market, t, params] = await Promise.all([currentMarket(), getTranslations("search"), searchParams]);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  if (q.length < 2) return <p className="muted">{t("tooShort")}</p>;

  const state = parseListing(params);
  const result = await unwrap(
    serverApi({ market }).GET("/v1/store/search", {
      params: { query: { ...toApiQuery(state, { q }, PAGE_SIZE), q } },
    }),
  );
  if (result.redirect) redirect(result.redirect.startsWith("/") ? href(market, result.redirect) : result.redirect);

  if (!result.items.length && !Object.keys(state.filters).length) {
    return (
      <div className="no-results">
        <h2 className="h3">{t("noResults", { q })}</h2>
        {result.suggestions.length > 0 && (
          <p>
            {t("didYouMean")}{" "}
            {result.suggestions.map((s, i) => (
              <span key={s}>
                {i > 0 && ", "}
                <Link href={`${href(market, "/search")}?q=${encodeURIComponent(s)}`}>{s}</Link>
              </span>
            ))}
          </p>
        )}
        <p className="muted">{t("tips")}</p>
        <Link className="btn btn--secondary" href={href(market, "/products")}>
          {t("browseAll")}
        </Link>
      </div>
    );
  }
  return (
    <ProductListing
      market={market}
      listing={result}
      state={state}
      basePath={href(market, "/search")}
      extraParams={{ q }}
      sorts={["relevance", "newest", "price_asc", "price_desc"]}
    />
  );
}
