"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "../../components/storefront/icon";

// The current time, rounded to the minute and refreshed every 30 seconds. On the server and
// during hydration it is null, so the prerendered HTML never depends on the clock.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const nowMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 30_000);
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function remaining(endsAt: string, now: number) {
  const end = Date.parse(endsAt);
  const diff = Number.isNaN(end) ? 0 : Math.max(0, end - now);
  return {
    over: diff <= 0,
    days: Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    minutes: Math.floor((diff % 36e5) / 6e4),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function OfferTimer({ endsAt, endedLabel }: { endsAt: string; endedLabel: string }) {
  const t = useTranslations("offer");
  const now = useSyncExternalStore(subscribe, nowMinute, () => null);
  const left = now === null ? null : remaining(endsAt, now);
  if (left?.over) return <p className="h3 offer__ended">{endedLabel}</p>;
  const units: [string, number | null][] = [
    [t("days"), left?.days ?? null],
    [t("hours"), left?.hours ?? null],
    [t("minutes"), left?.minutes ?? null],
  ];
  return (
    <div className="timer" role="timer" aria-live="off" aria-atomic="true">
      {left && <p className="sr-only">{t("endsIn", { days: left.days, hours: left.hours, minutes: left.minutes })}</p>}
      {units.map(([label, value]) => (
        <div key={label} className="timer__unit" aria-hidden="true">
          <span className="timer__num">{value === null ? "––" : pad(value)}</span>
          <span className="timer__lbl">{label}</span>
        </div>
      ))}
    </div>
  );
}

// The promo code with a copy button that confirms for a moment, visually and to screen readers.
export function CopyCode({ code }: { code: string }) {
  const t = useTranslations("offer");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <div className="code-chip">
      <span className="code-chip__code">{code}</span>
      <button
        className="code-chip__btn"
        type="button"
        aria-label={t("copyAria", { code })}
        onClick={() => {
          navigator.clipboard?.writeText(code).catch(() => undefined);
          setCopied(true);
        }}
      >
        <Icon name={copied ? "check" : "copy"} size="sm" />
        {copied ? t("copied") : t("copy")}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t("copiedNote", { code }) : ""}
      </span>
    </div>
  );
}
