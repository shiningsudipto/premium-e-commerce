"use client";

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
  const id = useId();
  const invalid = state.status === "invalid";

  if (state.status === "subscribed") {
    return (
      <p className="success" role="status">
        <Icon name="check" />
        You’re on the list. The next letter arrives at the start of the month.
      </p>
    );
  }

  return (
    <form action={action} noValidate className="newsletter__form">
      <div className="field">
        <label htmlFor={`${id}-email`}>Email address</label>
        <div className="field-row">
          <input
            className="input"
            id={`${id}-email`}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state.email}
            required
            aria-invalid={invalid}
            aria-describedby={`${id}-consent${invalid ? ` ${id}-error` : ""}`}
          />
          <button className="btn btn--primary" type="submit" disabled={pending}>
            Subscribe
          </button>
        </div>
        {invalid && (
          <p className="consent consent--error" id={`${id}-error`}>
            Enter an email address like name@example.com.
          </p>
        )}
        {state.status === "unavailable" && (
          <p className="consent" role="status">
            Sign-ups open soon. Thank you for your interest; please check back shortly.
          </p>
        )}
      </div>
      <p className="consent" id={`${id}-consent`}>
        {consent}
      </p>
    </form>
  );
}
