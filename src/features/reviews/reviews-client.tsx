"use client";

import Link from "next/link";
import { useActionState, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Field } from "../../components/storefront/field";
import { Icon } from "../../components/storefront/icon";
import { loadReviews, submitReview, voteHelpful } from "./actions";
import {
  hasMoreReviews,
  REVIEW_LIMITS,
  REVIEW_SORTS,
  type ReviewPage,
  type ReviewSort,
  type ReviewView,
} from "./parse";
import { RatingStars } from "./stars";
import { initialCommunityForm, type CommunityFormState } from "./state";

// The interactive half of the reviews section: sorting, "show more", helpful votes and the
// review form. The first page arrives from the cached server render.

// UTC so the server render and the browser agree on the day.
export function useDateFormat(locale: string) {
  return (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
}

export function useFormError(namespace: "reviews" | "questions") {
  const t = useTranslations(namespace);
  const te = useTranslations("reviews.errors");
  return {
    field: (state: CommunityFormState, name: string) => {
      const code = state.errors[name];
      return code ? (te.has(code) ? te(code) : code) : undefined;
    },
    message: (state: CommunityFormState) =>
      state.ok ? null : state.messageKey && te.has(state.messageKey) ? te(state.messageKey) : (state.message ?? null),
    t,
  };
}

type Vote = { count: number; voted: boolean; note?: "signIn" | "own" | "failed" };

export function ReviewList({
  handle,
  initial,
  signedIn,
  signInHref,
  locale,
}: {
  handle: string;
  initial: ReviewPage;
  signedIn: boolean;
  signInHref: string;
  locale: string;
}) {
  const t = useTranslations("reviews");
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [items, setItems] = useState<ReviewView[]>(initial.items);
  const [paging, setPaging] = useState({ page: initial.page, pageSize: initial.pageSize, total: initial.total });
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const sortId = useId();
  const date = useDateFormat(locale);

  const load = (nextSort: ReviewSort, page: number) =>
    start(async () => {
      setFailed(false);
      const result = await loadReviews(handle, nextSort, page);
      if (!result) return setFailed(true);
      setItems((prev) =>
        page === 1 ? result.items : [...prev, ...result.items.filter((r) => !prev.some((p) => p.id === r.id))],
      );
      setPaging({ page: result.page, pageSize: result.pageSize, total: result.total });
    });

  const vote = (review: ReviewView) =>
    start(async () => {
      const result = await voteHelpful(handle, review.id);
      setVotes((v) => ({
        ...v,
        [review.id]: result.ok
          ? { count: result.helpfulCount, voted: true }
          : { count: v[review.id]?.count ?? review.helpfulCount, voted: false, note: result.reason },
      }));
    });

  if (!items.length && paging.total === 0) return <p className="muted">{t("none")}</p>;

  return (
    <div className="review-feed">
      {paging.total > 1 && (
        <div className="review-feed__toolbar">
          <label htmlFor={sortId}>{t("sortBy")}</label>
          <select
            id={sortId}
            className="select"
            value={sort}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as ReviewSort;
              setSort(next);
              load(next, 1);
            }}
          >
            {REVIEW_SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sort.${s}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <ul className="review-feed__list" aria-busy={pending || undefined} data-testid="review-list">
        {items.map((r) => {
          const v = votes[r.id];
          const count = v?.count ?? r.helpfulCount;
          return (
            <li key={r.id}>
              <article className="review-card" aria-labelledby={`review-${r.id}`}>
                <header className="review-card__head">
                  <RatingStars value={r.rating} size="sm" label={t("ratedOutOf", { rating: r.rating })} />
                  <h3 id={`review-${r.id}`} className="review-card__title">
                    {r.title ?? t("untitled", { rating: r.rating })}
                  </h3>
                </header>
                <p className="review-card__meta">
                  <span className="review__name">{r.author || t("anonymous")}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={r.createdAt}>{date(r.createdAt)}</time>
                  {r.verifiedBuyer && (
                    <span className="verified">
                      <Icon name="check" size="sm" />
                      {t("verified")}
                    </span>
                  )}
                </p>
                <p className="review-card__body">{r.body}</p>
                {r.reply && (
                  <div className="review-card__reply">
                    <p className="review-card__reply-label">{t("storeReply")}</p>
                    <p>{r.reply}</p>
                  </div>
                )}
                <div className="review-card__foot">
                  <button
                    type="button"
                    className="link-btn"
                    aria-pressed={v?.voted ? true : undefined}
                    disabled={pending || v?.voted}
                    onClick={() =>
                      signedIn
                        ? vote(r)
                        : setVotes((all) => ({ ...all, [r.id]: { count, voted: false, note: "signIn" } }))
                    }
                  >
                    {v?.voted ? t("votedHelpful", { count }) : t("helpful", { count })}
                  </button>
                  <span role="status" className="review-card__note">
                    {v?.note === "signIn" && (
                      <>
                        {t("signInToVote")} <Link href={signInHref}>{t("signIn")}</Link>
                      </>
                    )}
                    {v?.note === "own" && t("ownReview")}
                    {v?.note === "failed" && t("voteFailed")}
                  </span>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <p className="muted review-feed__count" role="status">
        {t("showing", { shown: items.length, total: paging.total })}
      </p>
      {failed && (
        <p className="notice notice--error" role="alert">
          {t("loadFailed")}
        </p>
      )}
      {hasMoreReviews(paging) && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pending}
          onClick={() => load(sort, paging.page + 1)}
        >
          {pending ? t("loading") : t("showMore")}
        </button>
      )}
    </div>
  );
}

// A proper radio group: arrow keys move between ratings, the stars only show the choice.
function StarInput({ value, onChange, error }: { value: number; onChange: (n: number) => void; error?: string }) {
  const t = useTranslations("reviews");
  const id = useId();
  return (
    <fieldset
      className="star-input field"
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend>{t("form.rating")}</legend>
      <div className="star-input__options">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="star-input__option" data-on={n <= value || undefined}>
            <input
              className="sr-only"
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              required
            />
            <Icon name="star" filled={n <= value} />
            <span className="sr-only">{t("stars", { count: n })}</span>
          </label>
        ))}
      </div>
      {error && (
        <span className="field__error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </fieldset>
  );
}

export function ReviewForm({ handle }: { handle: string }) {
  const { t, field, message } = useFormError("reviews");
  const [state, action, pending] = useActionState(submitReview, initialCommunityForm);
  const [rating, setRating] = useState(0);
  const [prevState, setPrevState] = useState(state);
  // a refused submission comes back with the rating the shopper chose
  if (prevState !== state) {
    setPrevState(state);
    const r = Number(state.values?.rating);
    if (Number.isInteger(r) && r >= 1 && r <= 5) setRating(r);
  }
  if (state.ok) {
    return (
      <p className="notice" role="status" data-testid="review-thanks">
        {state.published ? t("form.thanksPublished") : t("form.thanksPending")}
      </p>
    );
  }
  const alert = message(state);
  const bodyError = field(state, "body");
  return (
    <form action={action} className="form-grid" noValidate data-testid="review-form">
      {alert && (
        <p className="notice notice--error" role="alert">
          {alert}
        </p>
      )}
      <input type="hidden" name="handle" value={handle} />
      <StarInput value={rating} onChange={setRating} error={field(state, "rating")} />
      <Field
        label={t("form.title")}
        name="title"
        id="review-title-input"
        maxLength={REVIEW_LIMITS.titleMax}
        defaultValue={state.values?.title}
        hint={t("form.optional")}
        error={field(state, "title")}
      />
      <Field
        label={t("form.body")}
        name="body"
        id="review-body"
        error={bodyError}
        hint={t("form.bodyHint", REVIEW_LIMITS)}
      >
        <textarea
          id="review-body"
          name="body"
          rows={5}
          required
          minLength={REVIEW_LIMITS.bodyMin}
          maxLength={REVIEW_LIMITS.bodyMax}
          defaultValue={state.values?.body}
          aria-invalid={bodyError ? true : undefined}
          aria-describedby={["review-body-hint", bodyError && "review-body-error"].filter(Boolean).join(" ")}
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
