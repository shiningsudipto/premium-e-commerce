"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import { Icon } from "../../components/storefront/icon";
import { subscribeToLetter, type SubscribeState } from "./actions";

// Email sign-up with progressive enhancement: a Server Action handles the form, so it works before
// JavaScript loads; errors are tied to the field for screen readers.
export function NewsletterForm({ consent }: { consent: React.ReactNode }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeToLetter, {
    status: "idle",
    email: "",
  });
  const t = useTranslations("newsletter");
  const id = useId();
  const invalid = state.status === "invalid";

  if (state.status === "subscribed") {
    return (
      <p className="success" role="status">
        <Icon name="check" />
        {t("subscribed")}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="newsletter__form">
      <div className="field">
        <label htmlFor={`${id}-email`}>{t("email")}</label>
        <div className="field-row">
          <input
            className="input"
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("placeholder")}
            defaultValue={state.email}
            required
            aria-invalid={invalid}
            aria-describedby={`${id}-consent${invalid ? ` ${id}-error` : ""}`}
          />
          <button className="btn btn--primary" type="submit" disabled={pending}>
            {t("subscribe")}
          </button>
        </div>
        {invalid && (
          <p className="consent consent--error" id={`${id}-error`}>
            {t("invalid")}
          </p>
        )}
        {state.status === "unavailable" && (
          <p className="consent" role="status">
            {t("unavailable")}
          </p>
        )}
      </div>
      <p className="consent" id={`${id}-consent`}>
        {consent}
      </p>
    </form>
  );
}
