import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { UnsubscribeForm } from "@/src/features/newsletter/unsubscribe-form";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newsletter.unsubscribePage");
  return { title: t("title"), robots: { index: false } };
}

// Where the unsubscribe link in newsletter emails goes (/newsletter/unsubscribe?token=…).
export default async function UnsubscribePage({ searchParams }: PageProps<"/[market]/newsletter/unsubscribe">) {
  return (
    <div className="pt-container">
      <Suspense fallback={null}>
        <Unsubscribe searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Unsubscribe({
  searchParams,
}: {
  searchParams: PageProps<"/[market]/newsletter/unsubscribe">["searchParams"];
}) {
  const [market, params] = await Promise.all([currentMarket(), searchParams]);
  const token = typeof params.token === "string" ? params.token : "";
  return <UnsubscribeForm token={token} homeHref={href(market, "/")} />;
}
