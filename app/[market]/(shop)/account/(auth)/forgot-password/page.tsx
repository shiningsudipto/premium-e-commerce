import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/src/features/account/forms";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("forgotTitle"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("account")]);
  return (
    <div className="pt-container auth">
      <div className="auth__card">
        <h1 className="h2">{t("forgotTitle")}</h1>
        <p className="muted">{t("forgotBody")}</p>
        <ForgotPasswordForm signInHref={href(market, "/account/sign-in")} />
      </div>
    </div>
  );
}
