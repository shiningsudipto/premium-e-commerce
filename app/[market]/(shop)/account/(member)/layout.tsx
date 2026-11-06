import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requestContext } from "@/src/api/server";
import { AccountNav } from "@/src/features/account/account-nav";
import { currentMarket } from "@/src/lib/current-market";
import { href } from "@/src/lib/links";

// The signed-in area. Customers only: anyone else goes to sign-in and comes back here after.
// (The API checks the session on every call too; this is for a friendly redirect.)
export default async function AccountLayout({ children }: LayoutProps<"/[market]/account">) {
  const [market, t] = await Promise.all([currentMarket(), getTranslations("account")]);
  const links = [
    { href: href(market, "/account"), label: t("overview") },
    { href: href(market, "/account/orders"), label: t("orders") },
    { href: href(market, "/account/addresses"), label: t("addresses") },
  ];
  return (
    <div className="pt-container">
      <header className="page-head">
        <h1 className="h2">{t("title")}</h1>
      </header>
      <div className="account">
        <AccountNav links={links} signOutLabel={t("signOut")} label={t("sections")} />
        <div className="account__panel stream-area">
          <Suspense fallback={<p className="muted">{t("loading")}</p>}>
            <CustomerOnly>{children}</CustomerOnly>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function CustomerOnly({ children }: { children: ReactNode }) {
  const ctx = await requestContext();
  if (ctx.kind !== "customer") {
    redirect(`${href(ctx.market, "/account/sign-in")}?next=${encodeURIComponent(href(ctx.market, "/account"))}`);
  }
  return children;
}
