import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { SignInForm } from "@/src/features/account/forms";
import { safeNext } from "@/src/features/account/next-path";
import { href } from "@/src/lib/links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("signIn"), robots: { index: false } };
}

export default async function SignInPage({ searchParams }: PageProps<"/[market]/account/sign-in">) {
  const t = await getTranslations("account");
  return (
    <div className="pt-container auth">
      <div className="auth__card">
        <h1 className="h2">{t("signInTitle")}</h1>
        <p className="muted">{t("signInBody")}</p>
        <Suspense>
          <SignIn searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

// Signed-in visitors go straight on; the form carries ?next= through sign-in.
async function SignIn({ searchParams }: { searchParams: PageProps<"/[market]/account/sign-in">["searchParams"] }) {
  const [ctx, params] = await Promise.all([requestContext(), searchParams]);
  const next = safeNext(typeof params.next === "string" ? params.next : null, href(ctx.market, "/account"));
  if (ctx.kind === "customer") redirect(next);
  const withNext = (path: string) => `${href(ctx.market, path)}?next=${encodeURIComponent(next)}`;
  return (
    <SignInForm
      next={next}
      links={{ register: withNext("/account/register"), forgot: href(ctx.market, "/account/forgot-password") }}
    />
  );
}
