"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// The page-builder blocks that need the browser: carousel, countdown and tabs. Each renders a
// complete, usable version on the server (prerendered, cacheable) and adds behaviour after
// hydration, so nothing reads the clock or randomness while the page is prerendered.

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type Slide = { key: string; content: ReactNode; label: string };

// Horizontal scroll-snap slides with previous/next buttons. Autoplay (if set) pauses on hover,
// focus and for visitors who prefer reduced motion.
export function Carousel({
  slides,
  autoplaySeconds,
  labels,
}: {
  slides: Slide[];
  autoplaySeconds: number;
  labels: { region: string; previous: string; next: string };
}) {
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = (next: number) => {
    const el = track.current;
    if (!el || !slides.length) return;
    const target = (next + slides.length) % slides.length;
    el.children[target]?.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
    setIndex(target);
  };

  useEffect(() => {
    if (!autoplaySeconds || paused || reducedMotion() || slides.length < 2) return;
    const timer = setInterval(() => go(index + 1), autoplaySeconds * 1000);
    return () => clearInterval(timer);
  });

  return (
    <section
      className="cms-carousel"
      aria-roledescription="carousel"
      aria-label={labels.region}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <ul className="cms-carousel__track" ref={track}>
        {slides.map((s, i) => (
          <li
            key={s.key}
            className="cms-carousel__slide"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length}: ${s.label}`}
          >
            {s.content}
          </li>
        ))}
      </ul>
      {slides.length > 1 && (
        <div className="cms-carousel__nav">
          <button type="button" className="icon-btn" aria-label={labels.previous} onClick={() => go(index - 1)}>
            ‹
          </button>
          <button type="button" className="icon-btn" aria-label={labels.next} onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
      )}
    </section>
  );
}

function remaining(endsAt: number, now: number) {
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: s === 0,
  };
}

// A countdown to `endsAt`. The server renders the heading and the end time; the live numbers
// start after hydration. When it ends it hides itself or shows the "ended" text.
export function Countdown({
  heading,
  endsAt,
  hideWhenDone,
  endsLabel,
  labels,
}: {
  heading: string;
  endsAt: string;
  hideWhenDone: boolean;
  endsLabel: string;
  labels: { days: string; hours: string; minutes: string; seconds: string; ended: string };
}) {
  const end = Date.parse(endsAt);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is only read after hydration
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = now === null ? null : remaining(end, now);
  if (left?.done && hideWhenDone) return null;

  return (
    <section className="cms-countdown" aria-label={heading}>
      <h2 className="h3">{heading}</h2>
      {left === null ? (
        <p className="muted">{endsLabel}</p>
      ) : left.done ? (
        <p className="muted">{labels.ended}</p>
      ) : (
        <p className="cms-countdown__clock" role="timer" aria-live="off">
          {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
            <span key={unit} className="cms-countdown__unit">
              <strong>{String(left[unit]).padStart(2, "0")}</strong>
              <span>{labels[unit]}</span>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

// Tabs with the WAI-ARIA pattern (arrow keys, Home/End). Every panel is in the HTML, so the content
// is there for search engines and before scripts load.
export function Tabs({ items }: { items: { title: string; content: ReactNode }[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = items.length - 1;
    const next =
      e.key === "ArrowRight"
        ? active === last
          ? 0
          : active + 1
        : e.key === "ArrowLeft"
          ? active === 0
            ? last
            : active - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="cms-tabs">
      <div role="tablist" className="cms-tabs__list">
        {items.map((item, i) => (
          <button
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={onKey}
          >
            {item.title}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          role="tabpanel"
          id={`${id}-panel-${i}`}
          aria-labelledby={`${id}-tab-${i}`}
          hidden={i !== active}
          tabIndex={0}
          className="cms-tabs__panel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
