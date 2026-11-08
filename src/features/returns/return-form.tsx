"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { requestReturn } from "./actions";
import { NOTE_MAX, RESOLUTIONS, RETURN_REASONS, type Resolution } from "./returns";
import { initialReturnForm, type ReturnFormState } from "./state";

export type ReturnFormLine = {
  id: string;
  title: string;
  variantTitle: string | null;
  ordered: number;
  returnable: number;
};

// Choose items and quantities, a reason for each, and how to be made whole. Posts to a Server
// Action, so it works before JavaScript loads; the API's refusals (return window, final sale,
// quantities already returned) come back as a message at the top.
export function ReturnForm({
  orderId,
  lines,
  resolutions,
}: {
  orderId: string;
  lines: ReturnFormLine[];
  resolutions: Resolution[];
}) {
  const t = useTranslations("returns");
  const te = useTranslations("returns.errors");
  const [state, action, pending] = useActionState(requestReturn, initialReturnForm);
  const err = (s: ReturnFormState, name: string) => {
    const code = s.errors[name];
    return code ? (te.has(code) ? te(code) : code) : undefined;
  };
  const alert = state.messageKey && te.has(state.messageKey) ? te(state.messageKey) : state.message;
  const linesError = err(state, "lines");
  const resolutionError = err(state, "resolution");
  const noteError = err(state, "note");
  const v = state.values ?? {};

  return (
    <form action={action} className="form-grid return-form" noValidate data-testid="return-form">
      {alert && (
        <p className="notice notice--error" role="alert" data-testid="return-error">
          {alert}
        </p>
      )}
      <input type="hidden" name="orderId" value={orderId} />

      <fieldset className="return-form__group" aria-describedby={linesError ? "return-lines-error" : undefined}>
        <legend className="eyebrow">{t("form.items")}</legend>
        <p className="muted">{t("form.itemsHint")}</p>
        {linesError && (
          <p className="field__error" id="return-lines-error">
            {linesError}
          </p>
        )}
        <ul className="return-lines">
          {lines.map((line) => {
            const name = line.variantTitle ? `${line.title} · ${line.variantTitle}` : line.title;
            const qtyError = err(state, `qty:${line.id}`);
            const reasonError = err(state, `reason:${line.id}`);
            return (
              <li key={line.id} className="box return-line" data-testid="return-line">
                <p className="return-line__title">
                  <strong>{name}</strong>
                  <span className="muted">
                    {line.returnable > 0
                      ? t("form.canReturn", { count: line.returnable, ordered: line.ordered })
                      : t("form.cannotReturn")}
                  </span>
                </p>
                {line.returnable > 0 && (
                  <div className="form-grid form-grid--2">
                    <Field label={t("form.quantity")} name={`qty:${line.id}`} id={`qty-${line.id}`} error={qtyError}>
                      <select
                        id={`qty-${line.id}`}
                        name={`qty:${line.id}`}
                        className="select"
                        defaultValue={v[`qty:${line.id}`] ?? "0"}
                        aria-invalid={qtyError ? true : undefined}
                        aria-describedby={qtyError ? `qty-${line.id}-error` : undefined}
                      >
                        {Array.from({ length: line.returnable + 1 }, (_, n) => (
                          <option key={n} value={n}>
                            {n === 0 ? t("form.none") : n}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label={t("form.reason")}
                      name={`reason:${line.id}`}
                      id={`reason-${line.id}`}
                      error={reasonError}
                    >
                      <select
                        id={`reason-${line.id}`}
                        name={`reason:${line.id}`}
                        className="select"
                        defaultValue={v[`reason:${line.id}`] ?? ""}
                        aria-invalid={reasonError ? true : undefined}
                        aria-describedby={reasonError ? `reason-${line.id}-error` : undefined}
                      >
                        <option value="">{t("form.chooseReason")}</option>
                        {RETURN_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {t(`reasons.${r}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset
        className="return-form__group"
        aria-describedby={resolutionError ? "return-resolution-error" : undefined}
      >
        <legend className="eyebrow">{t("form.resolution")}</legend>
        {resolutionError && (
          <p className="field__error" id="return-resolution-error">
            {resolutionError}
          </p>
        )}
        <div className="radio-cards">
          {RESOLUTIONS.filter((r) => resolutions.includes(r)).map((r) => (
            <label key={r} className="radio-card">
              <input type="radio" name="resolution" value={r} defaultChecked={v.resolution === r} required />
              <span className="radio-card__text">
                <span>{t(`resolution.${r}.label`)}</span>
                <span className="radio-card__sub">{t(`resolution.${r}.help`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label={t("form.note")}
        name="note"
        id="return-note"
        error={noteError}
        hint={t("form.noteHint", { max: NOTE_MAX })}
      >
        <textarea
          id="return-note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          defaultValue={v.note}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={["return-note-hint", noteError && "return-note-error"].filter(Boolean).join(" ")}
        />
      </Field>

      <div>
        <button className="btn btn--primary" type="submit" disabled={pending} data-testid="return-submit">
          {pending ? t("form.submitting") : t("form.submit")}
        </button>
      </div>
    </form>
  );
}
