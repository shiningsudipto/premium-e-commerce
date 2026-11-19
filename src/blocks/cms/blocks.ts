// The page builder's block tree as the storefront reads it, and which blocks a page shows.

export type Audience = { segmentIds?: string[]; markets?: string[]; loggedIn?: boolean; newVisitors?: boolean };

export type CmsBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  settings?: {
    hideOn?: ("mobile" | "tablet" | "desktop")[];
    audience?: Audience;
    schedule?: { startsAt?: string; endsAt?: string };
    experiment?: { key: string; variant: string };
  };
  children?: CmsBlock[];
};

const isBlock = (v: unknown): v is CmsBlock =>
  !!v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string";

// Rules that hold for every visitor, applied to the cached, shared page: the market list and the
// schedule. Blocks aimed at signed-in shoppers, new visitors or segments, and A/B variant blocks,
// stay in the tree; they're decided per visitor when the page renders (see `personalAudience` /
// `matchesAudience` and `experimentOf` / `matchesExperiment`).
export function visibleBlocks(blocks: unknown, ctx: { market: string; now: Date }): CmsBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter(isBlock)
    .filter((b) => {
      const s = b.settings;
      if (!s) return true;
      const a = s.audience;
      if (a?.markets?.length && !a.markets.includes(ctx.market)) return false;
      const starts = s.schedule?.startsAt ? Date.parse(s.schedule.startsAt) : NaN;
      const ends = s.schedule?.endsAt ? Date.parse(s.schedule.endsAt) : NaN;
      if (!Number.isNaN(starts) && ctx.now.getTime() < starts) return false;
      if (!Number.isNaN(ends) && ctx.now.getTime() >= ends) return false;
      return true;
    })
    .map((b) => ({ ...b, children: b.children ? visibleBlocks(b.children, ctx) : undefined }));
}

// The part of a block's audience that depends on who is looking, or null when it shows to everyone.
export function personalAudience(block: CmsBlock): Omit<Audience, "markets"> | null {
  const a = block.settings?.audience;
  if (!a) return null;
  const personal = {
    ...(a.segmentIds?.length ? { segmentIds: a.segmentIds } : {}),
    ...(a.loggedIn !== undefined ? { loggedIn: a.loggedIn } : {}),
    ...(a.newVisitors !== undefined ? { newVisitors: a.newVisitors } : {}),
  };
  return Object.keys(personal).length ? personal : null;
}

// Who is looking, as far as targeting needs to know. "New" means the visitor has never started a
// session with the shop (no bag, never signed in); segments are only known for signed-in customers.
export type Visitor = { signedIn: boolean; isNew: boolean; segmentIds: string[] };

// Every condition set on the block must hold (segments: any one of them).
export function matchesAudience(audience: Omit<Audience, "markets">, visitor: Visitor): boolean {
  if (audience.loggedIn !== undefined && audience.loggedIn !== visitor.signedIn) return false;
  if (audience.newVisitors !== undefined && audience.newVisitors !== visitor.isNew) return false;
  if (audience.segmentIds?.length && !audience.segmentIds.some((id) => visitor.segmentIds.includes(id))) return false;
  return true;
}

// The A/B variant a block belongs to, or null when it isn't part of an experiment.
export function experimentOf(block: CmsBlock): { key: string; variant: string } | null {
  const e = block.settings?.experiment;
  if (!e || typeof e.key !== "string" || typeof e.variant !== "string" || !e.key || !e.variant) return null;
  return { key: e.key, variant: e.variant };
}

// A visitor's variants across running experiments ({ experimentKey: variant }), from the API.
export type Assignments = Record<string, string>;

// Shown only to visitors bucketed into this variant; visitors outside the experiment's traffic,
// or experiments that aren't running (no assignment at all), see none of its variants.
export function matchesExperiment(experiment: { key: string; variant: string }, assignments: Assignments): boolean {
  return assignments[experiment.key] === experiment.variant;
}
