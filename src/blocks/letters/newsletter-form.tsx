"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../components/storefront/icon";
import { subscribeToLetter, type SubscribeState } from "./actions";

// Email sign-up with progressive enhancement: a Server Action handles the form, so it works before
// JavaScript loads; errors are tied to the field for screen readers.
//
// Options (used by the page builder's Newsletter block):
// - reveal: start with a single button; the email field and its submit button appear when it's
//   clicked, and the field takes focus. The field is always shown again if there's an error.
// - revealLabel / submitLabel: the two button texts (default: the "Subscribe" translation).
export function NewsletterForm({
  consent,
  reveal = false,
  revealLabel,
  submitLabel,
}: {
  consent: React.ReactNode;
  reveal?: boolean;
  revealLabel?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribeToLetter, {
    status: "idle",
    email: "",
  });
  const t = useTranslations("newsletter");
  const id = useId();
  const invalid = state.status === "invalid";
  const [opened, setOpened] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const showForm = !reveal || opened || state.status !== "idle";

  // the field takes focus when it appears after the button was clicked
  useEffect(() => {
    if (opened) input.current?.focus();
  }, [opened]);

  if (state.status === "subscribed") {
    return (
      <p className="success" role="status">
        <Icon name="check" />
        {t("subscribed")}
      </p>
    );
  }

  if (!showForm) {
    return (
      <div className="newsletter__form">
        <button
          className="btn btn--primary newsletter__reveal"
          type="button"
          aria-expanded={false}
          aria-controls={`${id}-form`}
          onClick={() => setOpened(true)}
        >
          {revealLabel || t("subscribe")}
        </button>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="newsletter__form" id={`${id}-form`}>
      <div className="field">
        <label htmlFor={`${id}-email`} className={reveal ? "sr-only" : undefined}>
          {t("email")}
        </label>
        <div className="field-row">
          <input
            ref={input}
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
            {submitLabel || (reveal ? revealLabel : undefined) || t("subscribe")}
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
