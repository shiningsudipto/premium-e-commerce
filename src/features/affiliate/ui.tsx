import Link from "next/link";
import { statusTone } from "./readers";

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
