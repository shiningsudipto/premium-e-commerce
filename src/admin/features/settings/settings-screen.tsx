"use client";

import { useMemo, useState } from "react";
import { LockIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminSettingsKeyMutation,
  useGetV1AdminChannelsQuery,
  useGetV1AdminMarketsQuery,
  useGetV1AdminSettingsQuery,
  usePutV1AdminSettingsKeyMutation,
  type GetV1AdminSettingsApiResponse,
} from "../../store/api.generated";
import { useMe } from "../../components/can";
import { SchemaField } from "../../components/json-schema-form/schema-field";
import { humanize, validate, type JsonSchema } from "../../components/json-schema-form/schema";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { can } from "../../lib/permissions";

type Setting = GetV1AdminSettingsApiResponse[number];
type Scope = Setting["scopes"][number];
type ScopeRef = { scope: Scope; scopeId: string | null };

const SECRET_MASK_HINT = "Stored securely. Enter a new value to replace it.";

// Settings screens are generated from the API's registry (spec §2.3): every setting describes
// itself with a JSON Schema, its allowed scopes and the permission needed to change it.
export function SettingsScreen() {
  const settings = useGetV1AdminSettingsQuery({});
  const markets = useGetV1AdminMarketsQuery({});
  const channels = useGetV1AdminChannelsQuery({});
  const [group, setGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => [...new Set(settings.data?.map((s) => s.group) ?? [])].sort(), [settings.data]);
  const activeGroup = group ?? groups[0] ?? null;
  const query = search.trim().toLowerCase();
  const visible = (settings.data ?? []).filter((s) =>
    query ? `${s.key} ${s.description}`.toLowerCase().includes(query) : s.group === activeGroup,
  );

  if (settings.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(settings.error)}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search settings"
            placeholder="Search settings"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <nav aria-label="Setting groups" className="flex gap-1 overflow-x-auto lg:flex-col">
          {settings.isLoading
            ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-7 w-full" />)
            : groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-current={!query && g === activeGroup ? "true" : undefined}
                  onClick={() => {
                    setGroup(g);
                    setSearch("");
                  }}
                  className="shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted aria-[current=true]:bg-accent aria-[current=true]:font-medium aria-[current=true]:text-accent-foreground"
                >
                  {humanize(g)}
                </button>
              ))}
        </nav>
      </div>

      <div className="space-y-4">
        {settings.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        {!settings.isLoading && visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No settings match “{search}”.</p>
        )}
        {visible.map((setting) => (
          <SettingCard
            key={setting.key}
            setting={setting}
            markets={markets.data ?? []}
            channels={channels.data ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function storedAt(setting: Setting, ref: ScopeRef) {
  return setting.values.find((v) => v.scope === ref.scope && (v.scopeId ?? null) === (ref.scopeId ?? null));
}

// What applies at a scope when nothing is stored there: the global value, then the default.
function fallbackFor(setting: Setting, ref: ScopeRef) {
  if (ref.scope === "global") return { value: setting.default, source: "default" };
  const global = storedAt(setting, { scope: "global", scopeId: null });
  return global ? { value: global.value, source: "global value" } : { value: setting.default, source: "default" };
}

export function SettingCard({
  setting,
  markets,
  channels,
}: {
  setting: Setting;
  markets: { id: string; handle: string; name: string }[];
  channels: { id: string; handle: string; name: string }[];
}) {
  const me = useMe();
  const scopeOptions = useMemo(
    () =>
      setting.scopes.flatMap((scope): (ScopeRef & { label: string })[] => {
        if (scope === "global") return [{ scope, scopeId: null, label: "All markets and channels" }];
        const list = scope === "market" ? markets : channels;
        return list.map((item) => ({ scope, scopeId: item.id, label: `${humanize(scope)}: ${item.name}` }));
      }),
    [setting.scopes, markets, channels],
  );
  const [refIndex, setRefIndex] = useState(0);
  const ref = scopeOptions[refIndex] ?? scopeOptions[0] ?? { scope: "global" as const, scopeId: null, label: "" };
  const stored = storedAt(setting, ref);
  const fallback = fallbackFor(setting, ref);
  const writable =
    can(me.data?.permissions, setting.permission) &&
    (!setting.secret || can(me.data?.permissions, "settings.secrets.write"));

  const initial = setting.secret ? "" : stored ? stored.value : fallback.value;
  const draftKey = `${refIndex}:${stored?.version ?? "none"}`;
  const [draft, setDraft] = useState<{ key: string; value: unknown }>({ key: draftKey, value: initial });
  const value = draft.key === draftKey ? draft.value : initial;
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const localErrors = dirty ? validate(setting.schema as JsonSchema, value) : {};
  const errors = { ...serverErrors, ...localErrors };

  // both mutations refetch the registry (OpenAPI tag), so a version conflict shows the latest value
  const [saveSetting, save] = usePutV1AdminSettingsKeyMutation();
  const [resetSetting, reset] = useDeleteV1AdminSettingsKeyMutation();
  const onError = (error: unknown) => {
    const fields = fieldErrors(error);
    setServerErrors(fields._form ? { "": fields._form[0]! } : {});
    notifyError(error);
  };

  const label = humanize(setting.key.slice(setting.group.length + 1) || setting.key);

  return (
    <section
      aria-labelledby={`setting-${setting.key}`}
      className="rounded-lg border bg-card p-5"
      data-testid={`setting-${setting.key}`}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id={`setting-${setting.key}`} className="flex items-center gap-2 font-medium">
            {label}
            {setting.secret && (
              <Badge variant="outline" className="gap-1">
                <LockIcon className="size-3" /> Secret
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{setting.description}</p>
          <p className="font-mono text-[11px] text-muted-foreground/80">{setting.key}</p>
        </div>
        {scopeOptions.length > 1 && (
          <Select value={String(refIndex)} onValueChange={(v) => setRefIndex(Number(v))}>
            <SelectTrigger aria-label={`Scope for ${label}`} className="w-60" size="sm">
              <SelectValue>{ref.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {scopeOptions.map((o, i) => (
                <SelectItem key={`${o.scope}:${o.scopeId}`} value={String(i)}>
                  {o.label}
                  {storedAt(setting, o) ? " •" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (Object.keys(localErrors).length) return;
          saveSetting({
            key: setting.key,
            body: { scope: ref.scope, scopeId: ref.scopeId, value, ...(stored ? { version: stored.version } : {}) },
          })
            .unwrap()
            .then(() => {
              setServerErrors({});
              notifySaved(`${humanize(setting.key)} saved. The storefront picks it up within seconds.`);
            }, onError);
        }}
      >
        <SchemaField
          schema={setting.schema as JsonSchema}
          value={value}
          onChange={(next) => setDraft({ key: draftKey, value: next })}
          label="Value"
          description={setting.secret ? SECRET_MASK_HINT : undefined}
          errors={errors}
          disabled={!writable || save.isLoading}
          secret={setting.secret}
        />

        <footer className="flex flex-wrap items-center gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span className={cn(stored && "text-foreground")}>
            {stored
              ? `Set here · updated ${formatDateTime(stored.updatedAt)}`
              : `Not set here · uses the ${fallback.source}`}
          </span>
          {!writable && <span>· Read-only for your role ({setting.permission})</span>}
          {writable && (
            <div className="ml-auto flex gap-2">
              {stored && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={reset.isLoading}
                  onClick={() =>
                    resetSetting({
                      key: setting.key,
                      scope: ref.scope,
                      ...(ref.scopeId ? { scopeId: ref.scopeId } : {}),
                    })
                      .unwrap()
                      .then(() => notifySaved(`${humanize(setting.key)} now uses the ${fallback.source}.`), onError)
                  }
                >
                  <RotateCcwIcon /> Use {fallback.source}
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!dirty || save.isLoading || Object.keys(localErrors).length > 0}
              >
                {save.isLoading ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </footer>
      </form>
    </section>
  );
}
