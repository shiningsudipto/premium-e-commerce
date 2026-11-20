"use client";

import { useState } from "react";
import { SearchIcon, UsersIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  useGetV1AdminChannelsQuery,
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminCustomersIdQuery,
  useGetV1AdminCustomersQuery,
  useGetV1AdminMarketsQuery,
  usePutV1AdminFlagsKeyMutation,
  type GetV1AdminFlagsApiResponse,
} from "../../store/api.generated";
import { notifyError, notifySaved } from "../../lib/notify";
import { describeAudience, type Audience } from "./flag-audience";

type Flag = GetV1AdminFlagsApiResponse[number];

// Who a flag applies to, in plain language: where (markets, channels), who (customer groups,
// specific customers, a share of shoppers), plus the kill switch and an owner note. A live
// summary at the top says who will actually see the feature.
export function FlagEditor({ flag, readOnly }: { flag: Flag; readOnly: boolean }) {
  const markets = useGetV1AdminMarketsQuery({});
  const channels = useGetV1AdminChannelsQuery({});
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const [audience, setAudience] = useState<Audience>(() => (flag.targeting as Audience) ?? {});
  const [killSwitch, setKillSwitch] = useState(flag.killSwitch);
  const [owner, setOwner] = useState(flag.owner ?? "");
  const [saveFlag, save] = usePutV1AdminFlagsKeyMutation();

  const setList = (key: "markets" | "channels" | "groups" | "customerIds", next: string[]) =>
    setAudience((a) => ({ ...a, [key]: next.length ? next : undefined }));
  const toggleIn = (key: "markets" | "channels" | "groups", id: string, on: boolean) => {
    const current = audience[key] ?? [];
    setList(key, on ? [...current, id] : current.filter((x) => x !== id));
  };

  const summary = describeAudience(
    audience,
    {
      markets: new Map((markets.data ?? []).map((m) => [m.handle, m.name])),
      channels: new Map((channels.data ?? []).map((c) => [c.handle, c.name])),
      groups: new Map((groups.data ?? []).map((g) => [g.id, g.name])),
    },
    { enabled: flag.enabled, killSwitch },
  );
  const rollout = audience.percentage !== undefined && audience.percentage < 100;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        saveFlag({
          key: flag.key,
          body: { targeting: audience, killSwitch, owner: owner.trim() || null, version: flag.version },
        })
          .unwrap()
          .then(() => notifySaved(`${flag.key}: audience saved`), notifyError);
      }}
    >
      <div
        className={cn(
          "rounded-md border p-3 text-sm",
          killSwitch || !flag.enabled ? "border-amber-500/40 bg-amber-500/10" : "bg-muted/40",
        )}
        role="status"
      >
        <p>
          <span className="font-medium">Who will see it: </span>
          {summary.headline}
        </p>
        {summary.conditions.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {summary.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Leave everything below empty to show it to everyone. Each part you fill in narrows the audience: a shopper
          must match <strong>all</strong> of them.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-5" aria-labelledby={`${flag.key}-where`}>
          <h3 id={`${flag.key}-where`} className="text-sm font-medium">
            Where
          </h3>
          <CheckList
            id={`${flag.key}-markets`}
            label="Markets"
            description="The country/currency stores it's on in. None ticked: every market."
            options={(markets.data ?? []).map((m) => ({ id: m.handle, label: m.name }))}
            selected={audience.markets ?? []}
            onToggle={(id, on) => toggleIn("markets", id, on)}
            readOnly={readOnly}
          />
          <CheckList
            id={`${flag.key}-channels`}
            label="Sales channels"
            description="Where the order is placed, e.g. the web store or an app. None ticked: every channel."
            options={(channels.data ?? []).map((c) => ({ id: c.handle, label: c.name }))}
            selected={audience.channels ?? []}
            onToggle={(id, on) => toggleIn("channels", id, on)}
            readOnly={readOnly}
          />
        </section>

        <section className="space-y-5" aria-labelledby={`${flag.key}-who`}>
          <h3 id={`${flag.key}-who`} className="text-sm font-medium">
            Who
          </h3>
          <CheckList
            id={`${flag.key}-groups`}
            label="Customer groups"
            description="Only signed-in customers in these groups (set a customer's group on their page in Customers). None ticked: no group limit."
            options={(groups.data ?? []).map((g) => ({ id: g.id, label: g.name }))}
            selected={audience.groups ?? []}
            onToggle={(id, on) => toggleIn("groups", id, on)}
            readOnly={readOnly}
            empty="No customer groups yet."
          />
          <CustomerPicker
            flagKey={flag.key}
            selected={audience.customerIds ?? []}
            onChange={(ids) => setList("customerIds", ids)}
            readOnly={readOnly}
          />
          <Field>
            <div className="flex items-center gap-3">
              <Switch
                id={`${flag.key}-rollout`}
                checked={rollout}
                disabled={readOnly}
                onCheckedChange={(on) => setAudience((a) => ({ ...a, percentage: on ? 10 : undefined }))}
              />
              <FieldLabel htmlFor={`${flag.key}-rollout`}>Gradual rollout</FieldLabel>
            </div>
            <FieldDescription>
              Show it to only part of your shoppers first, then raise the share as you gain confidence. Each shopper
              keeps the same answer. Visitors who haven&apos;t started a session yet (no bag, not signed in) are left
              out until it reaches 100%.
            </FieldDescription>
            {rollout && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={audience.percentage}
                  disabled={readOnly}
                  aria-label="Share of shoppers"
                  className="w-full accent-primary"
                  onChange={(e) => setAudience((a) => ({ ...a, percentage: Number(e.target.value) }))}
                />
                <span className="w-12 text-right text-sm tabular-nums">{audience.percentage}%</span>
              </div>
            )}
          </Field>
        </section>
      </div>

      <div className="grid gap-6 border-t pt-5 md:grid-cols-2">
        <Field orientation="horizontal" className="items-start">
          <Switch id={`${flag.key}-kill`} checked={killSwitch} disabled={readOnly} onCheckedChange={setKillSwitch} />
          <div>
            <FieldLabel htmlFor={`${flag.key}-kill`}>Kill switch (emergency off)</FieldLabel>
            <FieldDescription>
              Turns the feature off for everyone at once, ignoring the audience above, e.g. if it misbehaves. Turn it
              off again to go back to the audience you set; nothing else is lost.
            </FieldDescription>
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${flag.key}-owner`}>Owner (note)</FieldLabel>
          <Input
            id={`${flag.key}-owner`}
            value={owner}
            disabled={readOnly}
            maxLength={100}
            placeholder="e.g. Marketing team, or Ayesha"
            onChange={(e) => setOwner(e.target.value)}
          />
          <FieldDescription>
            Who to ask about this flag. Just a label; it doesn&apos;t change who sees it.
          </FieldDescription>
        </Field>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={save.isLoading}>
            {save.isLoading ? "Saving…" : "Save audience"}
          </Button>
        </div>
      )}
    </form>
  );
}

function CheckList({
  id,
  label,
  description,
  options,
  selected,
  onToggle,
  readOnly,
  empty,
}: {
  id: string;
  label: string;
  description: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
  readOnly: boolean;
  empty?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <p className="text-xs text-muted-foreground">{description}</p>
      {options.length === 0 && empty && <p className="text-xs text-muted-foreground italic">{empty}</p>}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((o) => (
          <Field key={o.id} orientation="horizontal" className="w-auto">
            <Checkbox
              id={`${id}-${o.id}`}
              checked={selected.includes(o.id)}
              disabled={readOnly}
              onCheckedChange={(on) => onToggle(o.id, !!on)}
            />
            <FieldLabel htmlFor={`${id}-${o.id}`} className="font-normal">
              {o.label}
            </FieldLabel>
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

// Pick specific customers by name, email or phone instead of typing IDs.
function CustomerPicker({
  flagKey,
  selected,
  onChange,
  readOnly,
}: {
  flagKey: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState("");
  // names of customers picked in this session, so their chip reads right before details load
  const [known, setKnown] = useState<Record<string, string>>({});
  const term = query.trim();
  const results = useGetV1AdminCustomersQuery({ q: term, limit: 8 }, { skip: term.length < 2 });
  const matches = (results.data?.items ?? []).filter((c) => !selected.includes(c.id));
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Specific customers</p>
      <p className="text-xs text-muted-foreground">
        Only these signed-in customers, e.g. your team or a few testers before a launch. None chosen: no limit.
      </p>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <SelectedCustomer
              key={id}
              id={id}
              knownLabel={known[id]}
              readOnly={readOnly}
              onRemove={() => onChange(selected.filter((x) => x !== id))}
            />
          ))}
        </ul>
      )}
      {!readOnly && (
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={`${flagKey}-customer-search`}
            aria-label="Find a customer by name, email or phone"
            placeholder="Find a customer by name, email or phone"
            className="h-8 pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {term.length >= 2 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
              {results.isFetching && <Skeleton className="m-2 h-6" />}
              {!results.isFetching && matches.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">No matching customers.</p>
              )}
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setKnown((k) => ({
                      ...k,
                      [c.id]: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "Customer",
                    }));
                    onChange([...selected, c.id]);
                    setQuery("");
                  }}
                >
                  <span className="font-medium">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "Customer"}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">{c.email ?? c.phone ?? ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedCustomer({
  id,
  knownLabel,
  readOnly,
  onRemove,
}: {
  id: string;
  knownLabel?: string;
  readOnly: boolean;
  onRemove: () => void;
}) {
  const customer = useGetV1AdminCustomersIdQuery({ id });
  const c = customer.data;
  const label = c
    ? [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || c.phone || "Customer"
    : (knownLabel ?? (customer.isError ? "Unknown customer" : "…"));
  return (
    <li className="flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-1 pl-2 text-xs">
      <UsersIcon className="size-3 text-muted-foreground" aria-hidden />
      <span title={c?.email ?? id}>{label}</span>
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-muted"
          aria-label={`Remove ${label}`}
        >
          <XIcon className="size-3" />
        </button>
      )}
    </li>
  );
}
