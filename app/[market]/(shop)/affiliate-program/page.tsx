import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { currentMarket } from "@/src/lib/current-market";
import { isEnabled } from "@/src/lib/flags";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("affiliate");
  return { title: t("card.title") };
}

// The public way into the affiliate program (footer and home page link here). While the
// `affiliates` flag is off it says the program isn't open yet; once it's on, visitors go
// straight to /affiliate, which sends them to sign-in, the application or the dashboard.
export default async function AffiliateProgramPage() {
  const t = await getTranslations("affiliate");
  return (
    <div className="pt-container">
      <Suspense fallback={<p className="muted">{t("loading")}</p>}>
        <ProgramGate />
      </Suspense>
    </div>
  );
}

async function ProgramGate() {
  const [market, t, open] = await Promise.all([
    currentMarket(),
    getTranslations("affiliate"),
    isEnabled("affiliates"),
  ]);
  if (open) redirect(href(market, "/affiliate"));
  return (
    <section className="affiliate-closed" aria-labelledby="affiliate-closed-title" data-testid="affiliate-closed">
      <header className="page-head">
        <h1 className="h2" id="affiliate-closed-title">
          {t("closed.title")}
        </h1>
      </header>
      <p className="lede">{t("closed.body")}</p>
      <p className="box__actions">
        <Link className="btn btn--primary" href={href(market, "/")}>
          {t("closed.action")}
        </Link>
      </p>
    </section>
  );
}
