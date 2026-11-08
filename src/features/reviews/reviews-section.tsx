import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requestContext } from "../../api/server";
import { isEnabled } from "../../lib/flags";
import { href } from "../../lib/links";
import type { MarketRef } from "../../lib/market";
import { getQuestionPage, getReviewPage } from "./data";
import { formatAverage, ratingBars, type RatingSummary } from "./parse";
import { QuestionForm, QuestionList } from "./questions-client";
import { ReviewForm, ReviewList } from "./reviews-client";
import { RatingStars } from "./stars";

// Reviews and Q&A under the product (plan B-Phase 2, flags `reviews` and `qna`). Both read the
// shopper's flags and session, so the product page renders them behind <Suspense>; the lists
// themselves come from the shared cache in ./data.

const signInLink = (market: MarketRef, handle: string, anchor: string) =>
  `${href(market, "/account/sign-in")}?next=${encodeURIComponent(href(market, `/products/${handle}#${anchor}`))}`;

export async function ProductReviews({ market, handle }: { market: MarketRef; handle: string }) {
  if (!(await isEnabled("reviews"))) return null;
  const [page, ctx, t] = await Promise.all([
    getReviewPage(market, handle, "newest", 1),
    requestContext(),
    getTranslations("reviews"),
  ]);
  if (!page) return null;
  const signedIn = ctx.kind === "customer";
  const signInHref = signInLink(market, handle, "reviews");

  return (
    <section id="reviews" className="community" aria-labelledby="reviews-title" data-testid="reviews">
      <h2 id="reviews-title" className="h3 community__title">
        {t("title")}
      </h2>
      <div className="community__grid">
        <div className="community__aside">
          <Summary summary={page.summary} locale={market.locale} />
          {signedIn ? (
            <details className="community__write">
              <summary className="btn btn--secondary">{t("write")}</summary>
              <ReviewForm handle={handle} />
            </details>
          ) : (
            <p className="community__signin">
              <Link className="btn btn--secondary" href={signInHref} data-testid="review-sign-in">
                {t("signInToReview")}
              </Link>
            </p>
          )}
        </div>
        <ReviewList handle={handle} initial={page} signedIn={signedIn} signInHref={signInHref} locale={market.locale} />
      </div>
    </section>
  );
}

async function Summary({ summary, locale }: { summary: RatingSummary; locale: string }) {
  const t = await getTranslations("reviews");
  if (!summary.count || summary.average === null) return <p className="muted">{t("noRatings")}</p>;
  const average = formatAverage(summary.average, locale);
  const bars = ratingBars(summary.distribution);
  const hasDistribution = bars.some((b) => b.count > 0);
  return (
    <div className="rating-summary" data-testid="rating-summary">
      <div className="score">
        <span className="score__num" aria-hidden="true">
          {average}
        </span>
        <span className="rating-summary__stars">
          <RatingStars value={summary.average} label={t("averageLabel", { average })} />
          <span className="muted">{t("basedOn", { count: summary.count })}</span>
        </span>
      </div>
      {hasDistribution && (
        <ul className="rating-bars" aria-label={t("distribution")}>
          {bars.map((b) => (
            <li key={b.rating} className="rating-bars__row">
              <span className="rating-bars__label">{t("starsShort", { count: b.rating })}</span>
              <span className="rating-bars__track" aria-hidden="true">
                <span className="rating-bars__fill" style={{ width: `${b.percent}%` }} />
              </span>
              <span className="rating-bars__count">
                <span aria-hidden="true">{b.count}</span>
                <span className="sr-only">{t("barLabel", { count: b.count, percent: b.percent })}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function ProductQuestions({ market, handle }: { market: MarketRef; handle: string }) {
  if (!(await isEnabled("qna"))) return null;
  const [page, ctx, t] = await Promise.all([
    getQuestionPage(market, handle, null),
    requestContext(),
    getTranslations("questions"),
  ]);
  if (!page) return null;
  return (
    <section id="questions" className="community" aria-labelledby="questions-title" data-testid="questions">
      <h2 id="questions-title" className="h3 community__title">
        {t("title")}
      </h2>
      <div className="community__grid">
        <div className="community__aside">
          <p className="muted">{t("intro")}</p>
          {ctx.kind === "customer" ? (
            <details className="community__write">
              <summary className="btn btn--secondary">{t("ask")}</summary>
              <QuestionForm handle={handle} />
            </details>
          ) : (
            <p className="community__signin">
              <Link
                className="btn btn--secondary"
                href={signInLink(market, handle, "questions")}
                data-testid="question-sign-in"
              >
                {t("signInToAsk")}
              </Link>
            </p>
          )}
        </div>
        <QuestionList handle={handle} initial={page} locale={market.locale} />
      </div>
    </section>
  );
}
