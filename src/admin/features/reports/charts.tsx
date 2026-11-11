"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPercent, labelIndices, linear, nearestIndex, niceTicks } from "./scale";

// Inline SVG charts (no chart library). Colours follow the data-viz reference palette:
// categorical slot 1 for the one series, hairline grid one step off the surface, text in
// the theme's text tokens. Light and dark steps are chosen separately (dark: is the admin's
// .dark class). Every chart has a table alternative next to it.
export const vizVars =
  "[--viz-series:#2a78d6] [--viz-grid:#e1e0d9] [--viz-axis:#c3c2b7] dark:[--viz-series:#3987e5] dark:[--viz-grid:#2c2c2a] dark:[--viz-axis:#383835]";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export type ChartPoint = { key: string; label: string; longLabel: string; value: number };

const M = { top: 16, right: 72, bottom: 28, left: 64 };

// One measure over time: a 2px line over a 10% wash, an end dot with its value, and a
// crosshair that snaps to the nearest period. Arrow keys move the crosshair when the chart
// has focus; the reading is announced.
export function TimeSeriesChart({
  title,
  points,
  formatValue,
  formatTick,
  height = 240,
  stale = false,
}: {
  title: string;
  points: ChartPoint[];
  formatValue: (value: number) => string;
  formatTick: (value: number, axisMax: number) => string;
  height?: number;
  stale?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const descriptionId = useId();
  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1]!;
  const x0 = M.left;
  const x1 = Math.max(M.left + 1, width - M.right);
  const y = linear(0, top, height - M.bottom, M.top);
  const x = (i: number) => (points.length <= 1 ? (x0 + x1) / 2 : linear(0, points.length - 1, x0, x1)(i));
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area =
    points.length > 1 ? `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : "";
  const xLabels = labelIndices(points.length, Math.max(2, Math.min(7, Math.floor((x1 - x0) / 90))));
  const last = points.length - 1;
  const current = active !== null ? points[active] : undefined;

  const highest = points.reduce((best, p, i) => (p.value > (points[best]?.value ?? -1) ? i : best), 0);
  const summary = points.length
    ? `${title}: ${points.length} periods from ${points[0]!.longLabel} to ${points[last]!.longLabel}. Highest ${formatValue(points[highest]!.value)} (${points[highest]!.longLabel}); latest ${formatValue(points[last]!.value)}.`
    : `${title}: no data.`;

  function onPointer(e: PointerEvent<HTMLDivElement>) {
    if (!points.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(e.clientX - rect.left, points.length, x0, x1));
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (!points.length) return;
    const moves: Record<string, (i: number) => number> = {
      ArrowRight: (i) => Math.min(last, i + 1),
      ArrowLeft: (i) => Math.max(0, i - 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setActive((i) => move(i ?? last));
  }

  return (
    <div className={cn("relative", vizVars, stale && "opacity-60 transition-opacity")}>
      <div
        ref={ref}
        role="img"
        tabIndex={0}
        aria-label={title}
        aria-describedby={descriptionId}
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="relative w-full rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ height }}
      >
        <p id={descriptionId} className="sr-only">
          {summary} Use the left and right arrow keys to read each period.
        </p>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={x0}
                  x2={x1}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={x0 - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[11px] tabular-nums"
                >
                  {formatTick(t, top)}
                </text>
              </g>
            ))}
            {xLabels.map((i) => (
              <text
                key={points[i]!.key}
                x={x(i)}
                y={height - M.bottom + 18}
                textAnchor={points.length > 1 && i === 0 ? "start" : points.length > 1 && i === last ? "end" : "middle"}
                className="fill-muted-foreground text-[11px]"
              >
                {points[i]!.label}
              </text>
            ))}
            {area && <path d={area} fill="var(--viz-series)" fillOpacity={0.1} />}
            {points.length > 1 && (
              <path
                d={line}
                fill="none"
                stroke="var(--viz-series)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {current && (
              <line
                x1={x(active!)}
                x2={x(active!)}
                y1={M.top}
                y2={height - M.bottom}
                stroke="var(--viz-axis)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            )}
            {points.length > 0 && (
              <>
                <circle
                  cx={x(last)}
                  cy={y(points[last]!.value)}
                  r={4}
                  fill="var(--viz-series)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
                <text
                  x={x(last) + 10}
                  y={y(points[last]!.value)}
                  dy="0.32em"
                  className="fill-foreground text-xs font-medium"
                >
                  {formatValue(points[last]!.value)}
                </text>
              </>
            )}
            {current && (
              <circle
                cx={x(active!)}
                cy={y(current.value)}
                r={5}
                fill="var(--viz-series)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            )}
          </svg>
        )}
        {current && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 min-w-36 rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md"
            style={{
              top: M.top,
              ...(x(active!) > width / 2 ? { right: width - x(active!) + 12 } : { left: x(active!) + 12 }),
            }}
          >
            <p className="text-sm font-semibold tabular-nums">{formatValue(current.value)}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-0.5 w-3 rounded-full bg-(--viz-series)" aria-hidden />
              {current.longLabel}
            </p>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {current ? `${current.longLabel}: ${formatValue(current.value)}` : ""}
      </p>
    </div>
  );
}

// A horizontal bar inside a table cell, scaled to the column's largest value. The number
// sits next to it in text, so the bar is decoration for sighted readers only.
export function InlineBar({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.max(0, value) / max : 0;
  return (
    <span className={cn("block h-2 w-full min-w-16", vizVars)} aria-hidden>
      {share > 0 && (
        <span
          className="block h-full rounded-r-[4px] bg-(--viz-series)"
          style={{ width: `${Math.max(1, share * 100)}%` }}
        />
      )}
    </span>
  );
}

// A KPI tile: label, value, and optionally the change against the previous period. The
// change is coloured by whether it's good news, and always carries an arrow and words.
export function KpiTile({
  label,
  value,
  delta,
  upIsGood = true,
  comparison,
  hint,
  stale,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
  comparison?: string;
  hint?: string;
  stale?: boolean;
}) {
  const flat = delta === null || delta === undefined || Math.abs(delta) < 0.0005;
  const good = !flat && delta! > 0 === upIsGood;
  const Icon = flat ? MinusIcon : delta! > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <div className={cn("rounded-lg border bg-card p-4", stale && "opacity-60 transition-opacity")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 space-y-1">
        <span className="block text-2xl font-semibold tracking-tight">{value}</span>
        {delta !== undefined && comparison && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              flat && "text-muted-foreground",
              !flat && good && "text-[#006300] dark:text-[#0ca30c]",
              !flat && !good && "text-destructive",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {delta === null ? (
              <span className="text-muted-foreground">No data for the {comparison}</span>
            ) : (
              <span>
                {flat ? "No change" : `${delta > 0 ? "+" : "−"}${formatPercent(Math.abs(delta))}`}
                <span className="text-muted-foreground"> vs {comparison}</span>
              </span>
            )}
          </span>
        )}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
