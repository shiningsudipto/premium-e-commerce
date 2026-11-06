import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/src/features/account/forms";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("resetTitle"), robots: { index: false } };
}

// The link in the reset email (…/account/reset-password?token=…) lands here.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/[market]/account/reset-password">) {
  const t = await getTranslations("account");
  return (
    <div className="pt-container auth">
      <div className="auth__card">
        <h1 className="h2">{t("resetTitle")}</h1>
        <Suspense>
          <Reset searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Reset({
  searchParams,
}: {
  searchParams: PageProps<"/[market]/account/reset-password">["searchParams"];
}) {
  const [market, params, t] = await Promise.all([currentMarket(), searchParams, getTranslations("account")]);
  const token = typeof params.token === "string" ? params.token : "";
  if (!token) {
    return (
      <>
        <p className="muted">{t("resetMissing")}</p>
        <Link className="btn btn--primary" href={href(market, "/account/forgot-password")}>
          {t("sendLink")}
        </Link>
      </>
    );
  }
  return <ResetPasswordForm token={token} signInHref={href(market, "/account/sign-in")} />;
}
