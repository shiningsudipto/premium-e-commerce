// The page builder's block tree as the storefront reads it, and which blocks a page shows.

export type CmsBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  settings?: {
    hideOn?: ("mobile" | "tablet" | "desktop")[];
    audience?: { segmentIds?: string[]; markets?: string[]; loggedIn?: boolean; newVisitors?: boolean };
    schedule?: { startsAt?: string; endsAt?: string };
    experiment?: { key: string; variant: string };
  };
  children?: CmsBlock[];
};

const isBlock = (v: unknown): v is CmsBlock =>
  !!v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string";

// Pages are cached and shared by every visitor, so only rules that hold for everyone are
// applied here: the market list and the schedule. Blocks aimed at a segment, signed-in state,
// new visitors or an experiment variant need a per-visitor decision and are left out of the
// shared page.
export function visibleBlocks(blocks: unknown, ctx: { market: string; now: Date }): CmsBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(isBlock)
    .filter((b) => {
      const s = b.settings;
      if (!s) return true;
      const a = s.audience;
      if (a?.markets?.length && !a.markets.includes(ctx.market)) return false;
      if (a?.segmentIds?.length || a?.loggedIn !== undefined || a?.newVisitors !== undefined) return false;
      if (s.experiment) return false;
      const starts = s.schedule?.startsAt ? Date.parse(s.schedule.startsAt) : NaN;
      const ends = s.schedule?.endsAt ? Date.parse(s.schedule.endsAt) : NaN;
      if (!Number.isNaN(starts) && ctx.now.getTime() < starts) return false;
      if (!Number.isNaN(ends) && ctx.now.getTime() >= ends) return false;
      return true;
    })
    .map((b) => ({ ...b, children: b.children ? visibleBlocks(b.children, ctx) : undefined }));
}
