"use client";

import { useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { MarketRef } from "../../lib/market";
import { formatMoney } from "../../lib/money";
import { appliedByCode, explainCode, type Explanation } from "./promotions";
import type { Bag } from "./types";

// What a code change reports back: nothing when it worked, else the message to show.
export type CodeAction = (code: string) => Promise<string | null>;

// The promotion code field with the codes already entered: each one shows its discount, or why it
// isn't applying yet ("Spend ৳5,000 or more to use it"). How codes are applied is the caller's
// (RTK Query on the bag page, Server Actions at checkout); the API decides how many are allowed.
export function PromoCodes({
  cart,
  market,
  onApply,
  onRemove,
}: {
  cart: Bag;
  market: MarketRef;
  onApply: CodeAction;
  onRemove: CodeAction;
}) {
  const t = useTranslations("promotions");
  const id = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const discounts = appliedByCode(cart);
  const money = (minor: number) => formatMoney(minor, cart.currency, market.locale);

  const explain = (e: Explanation) => {
    switch (e.key) {
      case "spendAtLeast":
      case "qualifyingAmount":
        return t(e.key, { amount: money(e.amountMinor) });
      case "qualifyingItems":
        return t(e.key, { count: e.count });
      default:
        return t(e.key);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const code = String(new FormData(form).get("code") ?? "").trim();
    if (!code) return setError(t("required"));
    setBusy(true);
    const failure = await onApply(code);
    setBusy(false);
    setError(failure ?? "");
    if (!failure) form.reset();
  };

  const remove = async (code: string) => {
    setBusy(true);
    setError((await onRemove(code)) ?? "");
    setBusy(false);
  };

  return (
    <div className="promo" data-testid="promo-codes">
      <form className="promo__form" onSubmit={submit} noValidate>
        <label className="promo__label" htmlFor={`${id}-code`}>
          {t("label")}
        </label>
        <div className="promo__row">
          <input
            id={`${id}-code`}
            className="input"
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={60}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <button className="btn btn--secondary" type="submit" disabled={busy}>
            {t("apply")}
          </button>
        </div>
        {error && (
          <p className="field__error" id={`${id}-error`} role="alert">
            {error}
          </p>
        )}
      </form>
      {cart.promotions.codes.length > 0 && (
        <ul className="promo__codes" aria-label={t("entered")}>
          {cart.promotions.codes.map((c) => {
            const applied = c.status === "applied";
            const amount = discounts.get(c.code);
            return (
              <li key={c.code} className={applied ? "promo__code is-applied" : "promo__code is-rejected"}>
                <div>
                  <span className="promo__tag">{c.code}</span>
                  <p className="promo__note">
                    {applied
                      ? amount
                        ? t("saving", { amount: money(amount) })
                        : t("applied")
                      : explain(explainCode(c))}
                  </p>
                </div>
                <button className="link-btn" type="button" onClick={() => remove(c.code)} disabled={busy}>
                  {t("remove")}
                  <span className="sr-only"> {c.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
