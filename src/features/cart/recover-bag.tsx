"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { bagErrorCode, useRecoverBagMutation } from "./cart-api";

// Reopens the bag from the email's signed link, then goes to the bag page. A bag that belongs to
// a customer account needs that customer signed in; an expired link or a bag that was already
// checked out gets a message and a way back to the shop.
export function RecoverBag({ market }: { market: MarketRef }) {
  const t = useTranslations("cart.recover");
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [recover, { isError, error }] = useRecoverBagMutation();
  const started = useRef(false);

  useEffect(() => {
    // once, even when React runs effects twice in development
    if (!token || started.current) return;
    started.current = true;
    recover(token)
      .unwrap()
      .then(() => router.replace(href(market, "/cart")))
      .catch(() => {});
  }, [token, recover, router, market]);

  if (token && !isError) {
    return (
      <p className="muted" role="status">
        {t("working")}
      </p>
    );
  }

  const signInNeeded = bagErrorCode(error) === "FORBIDDEN";
  const back = `${href(market, "/cart/recover")}?token=${encodeURIComponent(token)}`;
  return (
    <section className="recover-bag" aria-labelledby="recover-bag-title">
      <header className="page-head">
        <h1 className="h2" id="recover-bag-title">
          {signInNeeded ? t("signInTitle") : t("expiredTitle")}
        </h1>
      </header>
      <p className="lede">{signInNeeded ? t("signInBody") : t("expiredBody")}</p>
      <p className="box__actions">
        {signInNeeded ? (
          <Link
            className="btn btn--primary"
            href={`${href(market, "/account/sign-in")}?next=${encodeURIComponent(back)}`}
          >
            {t("signIn")}
          </Link>
        ) : (
          <Link className="btn btn--primary" href={href(market, "/")}>
            {t("continue")}
          </Link>
        )}
      </p>
    </section>
  );
}
