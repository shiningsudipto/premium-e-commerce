// The "who will see it" summary for a flag's targeting, in plain words. Mirrors the API's rules
// (premium-ec-backend/src/core/flags.ts evaluateFlag): every condition that's set must match,
// and a partial percentage leaves out visitors without a session (they have no stable ID).

export type Audience = {
  markets?: string[];
  channels?: string[];
  groups?: string[];
  customerIds?: string[];
  percentage?: number;
};

export type AudienceNames = {
  markets: Map<string, string>;
  channels: Map<string, string>;
  groups: Map<string, string>;
};

export type AudienceSummary = { headline: string; conditions: string[] };

const list = (ids: string[], names: Map<string, string>) => ids.map((id) => names.get(id) ?? id).join(", ");

export function describeAudience(
  t: Audience,
  names: AudienceNames,
  state: { enabled: boolean; killSwitch: boolean },
): AudienceSummary {
  const conditions = [
    t.markets?.length ? `Shopping in ${list(t.markets, names.markets)}` : null,
    t.channels?.length ? `Using ${list(t.channels, names.channels)}` : null,
    t.groups?.length ? `Signed in, in customer group ${list(t.groups, names.groups)}` : null,
    t.customerIds?.length
      ? `Signed in as one of ${t.customerIds.length} chosen customer${t.customerIds.length > 1 ? "s" : ""}`
      : null,
    t.percentage !== undefined && t.percentage < 100
      ? `Among a fixed ${t.percentage}% of shoppers (visitors who haven't started a session are left out)`
      : null,
  ].filter((c): c is string => c !== null);

  const who = conditions.length ? "Only shoppers who match all of these:" : "Everyone.";
  if (state.killSwitch) return { headline: "Nobody: the kill switch is on.", conditions: [] };
  if (!state.enabled) return { headline: `Nobody: the flag is off. When it's on: ${who}`, conditions };
  return { headline: who, conditions };
}
