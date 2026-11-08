"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import type { FormState } from "../account/actions";
import { initialForm } from "../account/form-state";
import { acceptAffiliateTerms, applyForAffiliate } from "./actions";
import { APPLICATION_FIELDS } from "./application";

// Affiliate program forms. They post to Server Actions, so they work before JavaScript loads.

function useErrorText(state: FormState) {
  const tf = useTranslations("forms");
  const t = useTranslations("affiliate");
  return (name: string) => {
    const code = state.errors[name];
    if (!code) return undefined;
    if (t.has(`errors.${code}`)) return t(`errors.${code}`);
    return tf.has(`errors.${code}`) ? tf(`errors.${code}`) : code;
  };
}

function FormMessage({ state }: { state: FormState }) {
  const t = useTranslations("affiliate");
  if (!state.message || state.ok) return null;
  return (
    <p className="notice notice--error" role="alert">
      {t.has(`errors.${state.message}`) ? t(`errors.${state.message}`) : t("errors.generic")}
    </p>
  );
}

function TermsCheckbox({ termsHref, version, error }: { termsHref: string; version: string; error?: string }) {
  const t = useTranslations("affiliate");
  return (
    <div className="field">
      <label className="facet__option">
        <input
          type="checkbox"
          name="acceptTerms"
          id="f-acceptTerms"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "f-acceptTerms-error" : undefined}
        />
        {t("terms.accept", { version })}
      </label>
      <span className="field__hint">
        <Link href={termsHref} target="_blank" rel="noopener">
          {t("terms.read")}
          <span className="sr-only"> {t("terms.newTab")}</span>
        </Link>
      </span>
      {error && (
        <span className="field__error" id="f-acceptTerms-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function ApplicationForm({ termsHref, termsVersion }: { termsHref: string; termsVersion: string }) {
  const t = useTranslations("affiliate");
  const [state, action, pending] = useActionState(applyForAffiliate, initialForm);
  const err = useErrorText(state);
  return (
    <form action={action} className="form-grid" noValidate data-testid="affiliate-apply-form">
      <FormMessage state={state} />
      {APPLICATION_FIELDS.map((f) => {
        const label = t(`apply.fields.${f.key}.label`);
        const hint = t.has(`apply.fields.${f.key}.hint`) ? t(`apply.fields.${f.key}.hint`) : undefined;
        const common = {
          label: f.required ? label : t("apply.optional", { label }),
          name: f.key,
          required: f.required,
          error: err(f.key),
          hint,
          defaultValue: state.values?.[f.key],
        };
        if (f.type === "textarea") {
          const id = `f-${f.key}`;
          const error = err(f.key);
          const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
          return (
            <Field key={f.key} {...common}>
              <textarea
                id={id}
                name={f.key}
                rows={4}
                maxLength={2000}
                defaultValue={state.values?.[f.key]}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
              />
            </Field>
          );
        }
        return (
          <Field
            key={f.key}
            {...common}
            type={f.type === "number" ? "text" : f.type}
            inputMode={f.type === "number" ? "numeric" : f.type === "url" ? "url" : undefined}
            autoComplete={f.autoComplete}
          />
        );
      })}
      <TermsCheckbox termsHref={termsHref} version={termsVersion} error={err("acceptTerms")} />
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("apply.sending") : t("apply.submit")}
        </button>
      </div>
    </form>
  );
}

export function TermsForm({ termsHref, termsVersion }: { termsHref: string; termsVersion: string }) {
  const t = useTranslations("affiliate");
  const [state, action, pending] = useActionState(acceptAffiliateTerms, initialForm);
  const err = useErrorText(state);
  return (
    <form action={action} className="form-grid" noValidate data-testid="affiliate-terms-form">
      <FormMessage state={state} />
      <TermsCheckbox termsHref={termsHref} version={termsVersion} error={err("acceptTerms")} />
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {t("terms.submit")}
        </button>
      </div>
    </form>
  );
}
