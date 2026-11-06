import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { RegisterForm } from "@/src/features/account/forms";
import { safeNext } from "@/src/features/account/next-path";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("createAccount"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: PageProps<"/[market]/account/register">) {
  const t = await getTranslations("account");
  return (
    <div className="pt-container auth">
      <div className="auth__card">
        <h1 className="h2">{t("registerTitle")}</h1>
        <p className="muted">{t("registerBody")}</p>
        <Suspense>
          <Register searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Register({ searchParams }: { searchParams: PageProps<"/[market]/account/register">["searchParams"] }) {
  const [ctx, params] = await Promise.all([requestContext(), searchParams]);
  const next = safeNext(typeof params.next === "string" ? params.next : null, href(ctx.market, "/account"));
  if (ctx.kind === "customer") redirect(next);
  return (
    <RegisterForm next={next} signInHref={`${href(ctx.market, "/account/sign-in")}?next=${encodeURIComponent(next)}`} />
  );
}
