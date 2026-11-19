import Link from "next/link";
import { statusTone } from "./status";

// Small presentational pieces shared by the affiliate pages (server-rendered).

export function StatusPill({ status, label }: { status: string | null | undefined; label: string }) {
  const tone = statusTone(status);
  return <span className={`status${tone ? ` status--${tone}` : ""}`}>{label}</span>;
}

// "Older …" link for cursor-paginated lists.
export function NextPage({ base, cursor, label }: { base: string; cursor: string | null; label: string }) {
  if (!cursor) return null;
  return (
    <p className="affiliate-pager">
      <Link className="btn btn--secondary" href={`${base}?cursor=${encodeURIComponent(cursor)}`}>
        {label}
      </Link>
    </p>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="affiliate-stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {note && <span className="affiliate-stat__note">{note}</span>}
      </dd>
    </div>
  );
}

export const cursorOf = (params: Record<string, string | string[] | undefined>) =>
  typeof params.cursor === "string" && params.cursor.length <= 100 ? params.cursor : undefined;

// A progress bar towards a goal: the numbers are in `valueText` (read out and shown beside it),
// the bar itself is the visual.
export function ProgressBar({
  value,
  max,
  label,
  valueText,
}: {
  value: number;
  max: number;
  label: string;
  valueText: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="affiliate-progress">
      <div
        className="affiliate-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(Math.max(value, 0), max)}
        aria-valuetext={valueText}
      >
        <span className="affiliate-progress__fill" style={{ width: `${(ratio * 100).toFixed(1)}%` }} />
      </div>
      <p className="affiliate-progress__text">{valueText}</p>
    </div>
  );
}
