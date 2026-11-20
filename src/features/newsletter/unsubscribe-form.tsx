"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { unsubscribeFromLetter, type UnsubscribeState } from "./actions";

export function UnsubscribeForm({ token, homeHref }: { token: string; homeHref: string }) {
  const t = useTranslations("newsletter.unsubscribePage");
  const [state, action, pending] = useActionState<UnsubscribeState, FormData>(unsubscribeFromLetter, {
    status: token ? "idle" : "invalid",
  });
  const title = state.status === "done" ? t("doneTitle") : state.status === "invalid" ? t("invalidTitle") : t("title");
  const body = state.status === "done" ? t("doneBody") : state.status === "invalid" ? t("invalidBody") : t("body");
  return (
    <section className="notice-page" aria-labelledby="newsletter-unsub-title">
      <header className="page-head">
        <h1 className="h2" id="newsletter-unsub-title">
          {title}
        </h1>
      </header>
      <p className="lede" role={state.status === "idle" ? undefined : "status"}>
        {body}
      </p>
      {state.status === "idle" ? (
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <button className="btn btn--primary" type="submit" disabled={pending}>
            {t("button")}
          </button>
        </form>
      ) : (
        <p>
          <Link className="btn btn--secondary" href={homeHref}>
            {t("continue")}
          </Link>
        </p>
      )}
    </section>
  );
}
