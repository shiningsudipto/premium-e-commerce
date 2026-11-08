import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { unwrap } from "@/src/api/errors";
import { requestContext, serverApi } from "@/src/api/server";
import { PasswordForm, ProfileForm } from "@/src/features/account/forms";
import { isEnabled } from "@/src/lib/flags";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

// Rendered inside the layout's customer-only Suspense boundary.
export default async function AccountOverviewPage() {
  const [ctx, t, ta, affiliates] = await Promise.all([
    requestContext(),
    getTranslations("account"),
    getTranslations("affiliate"),
    isEnabled("affiliates"),
  ]);
  const profile = await unwrap(serverApi(ctx).GET("/v1/store/account"));
  return (
    <>
      <section className="box" aria-labelledby="profile-title">
        <h2 className="h3" id="profile-title">
          {profile.firstName ? t("hello", { name: profile.firstName }) : t("profile")}
        </h2>
        <ProfileForm profile={profile} />
      </section>
      <section className="box" aria-labelledby="password-title">
        <h2 className="h3" id="password-title">
          {t("password")}
        </h2>
        <PasswordForm />
      </section>
      {affiliates && (
        <section className="box" aria-labelledby="affiliate-card-title" data-testid="affiliate-card">
          <h2 className="h3" id="affiliate-card-title">
            {ta("card.title")}
          </h2>
          <p className="muted">{ta("card.body")}</p>
          <p className="box__actions">
            <Link className="btn btn--secondary" href={href(ctx.market, "/account/affiliate")}>
              {ta("card.link")}
            </Link>
          </p>
        </section>
      )}
    </>
  );
}
