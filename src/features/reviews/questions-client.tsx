"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { askQuestion, loadQuestions } from "./actions";
import { QUESTION_LIMITS, type QuestionPage, type QuestionView } from "./parse";
import { useDateFormat, useFormError } from "./reviews-client";
import { initialCommunityForm } from "./state";

// Published questions with their answers, "show more" through the API's cursor, and the form
// for asking a new one.
export function QuestionList({ handle, initial, locale }: { handle: string; initial: QuestionPage; locale: string }) {
  const t = useTranslations("questions");
  const [items, setItems] = useState<QuestionView[]>(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const date = useDateFormat(locale);

  if (!items.length) return <p className="muted">{t("none")}</p>;

  return (
    <div className="qa">
      <ul className="qa__list" aria-busy={pending || undefined} data-testid="question-list">
        {items.map((q) => (
          <li key={q.id} className="qa__item">
            <p className="qa__q">
              <span className="qa__mark" aria-hidden="true">
                {t("q")}
              </span>
              <span>
                <span className="sr-only">{t("question")}: </span>
                {q.body}
                <time className="qa__date" dateTime={q.createdAt}>
                  {t("askedOn", { date: date(q.createdAt) })}
                </time>
              </span>
            </p>
            {q.answers.length > 0 ? (
              q.answers.map((a) => (
                <p key={a.id} className="qa__a">
                  <span className="qa__mark" aria-hidden="true">
                    {t("a")}
                  </span>
                  <span>
                    <span className="sr-only">{t("answer")}: </span>
                    {a.body}
                    <time className="qa__date" dateTime={a.createdAt}>
                      {t("answeredOn", { date: date(a.createdAt) })}
                    </time>
                  </span>
                </p>
              ))
            ) : (
              <p className="qa__a muted">{t("noAnswer")}</p>
            )}
          </li>
        ))}
      </ul>
      {failed && (
        <p className="notice notice--error" role="alert">
          {t("loadFailed")}
        </p>
      )}
      {cursor && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setFailed(false);
              const next = await loadQuestions(handle, cursor);
              if (!next) return setFailed(true);
              setItems((prev) => [...prev, ...next.items.filter((q) => !prev.some((p) => p.id === q.id))]);
              setCursor(next.nextCursor);
            })
          }
        >
          {pending ? t("loading") : t("showMore")}
        </button>
      )}
    </div>
  );
}

export function QuestionForm({ handle }: { handle: string }) {
  const { t, field, message } = useFormError("questions");
  const [state, action, pending] = useActionState(askQuestion, initialCommunityForm);
  if (state.ok) {
    return (
      <p className="notice" role="status" data-testid="question-thanks">
        {t("form.thanks")}
      </p>
    );
  }
  const alert = message(state);
  const error = field(state, "body");
  return (
    <form action={action} className="form-grid" noValidate data-testid="question-form">
      {alert && (
        <p className="notice notice--error" role="alert">
          {alert}
        </p>
      )}
      <input type="hidden" name="handle" value={handle} />
      <Field label={t("form.body")} name="body" id="question-body" error={error} hint={t("form.hint", QUESTION_LIMITS)}>
        <textarea
          id="question-body"
          name="body"
          rows={3}
          required
          minLength={QUESTION_LIMITS.bodyMin}
          maxLength={QUESTION_LIMITS.bodyMax}
          defaultValue={state.values?.body}
          aria-invalid={error ? true : undefined}
          aria-describedby={["question-body-hint", error && "question-body-error"].filter(Boolean).join(" ")}
        />
      </Field>
      <div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? t("form.submitting") : t("form.submit")}
        </button>
      </div>
    </form>
  );
}
