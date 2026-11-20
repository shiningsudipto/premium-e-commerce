import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext, serverApi } from "@/src/api/server";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsletter.confirmPage");
  return { title: t("title"), robots: { index: false } };
}

// Where the newsletter confirmation email links (/newsletter/confirm?token=…): confirms the
// sign-up and says so, or explains that the link has expired.
export default async function ConfirmNewsletterPage({ searchParams }: PageProps<"/[market]/newsletter/confirm">) {
  return (
    <div className="pt-container">
      <Suspense fallback={null}>
        <Confirm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirm({ searchParams }: { searchParams: PageProps<"/[market]/newsletter/confirm">["searchParams"] }) {
  const [ctx, t, params] = await Promise.all([
    requestContext(),
    getTranslations("newsletter.confirmPage"),
    searchParams,
  ]);
  const token = typeof params.token === "string" ? params.token : "";
  let ok = false;
  if (token) {
    try {
      const { data } = await serverApi(ctx).POST("/v1/store/newsletter/confirm", { body: { token } });
      ok = data?.status === "subscribed";
    } catch {
      ok = false;
    }
  }
  return (
    <section className="notice-page" aria-labelledby="newsletter-confirm-title">
      <header className="page-head">
        <h1 className="h2" id="newsletter-confirm-title">
          {ok ? t("title") : t("invalidTitle")}
        </h1>
      </header>
      <p className="lede">{ok ? t("body") : t("invalidBody")}</p>
      <p>
        <Link className="btn btn--primary" href={href(ctx.market, "/")}>
          {t("continue")}
        </Link>
      </p>
    </section>
  );
}
