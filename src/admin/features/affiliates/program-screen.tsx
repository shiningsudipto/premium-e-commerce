"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetV1AdminAffiliatesConfigRulesQuery,
  useGetV1AdminAffiliatesConfigTiersQuery,
  useGetV1AdminAffiliatesQuery,
  useGetV1AdminCategoriesQuery,
  useGetV1AdminProductsQuery,
  usePostV1AdminAffiliatesConfigRulesMutation,
  usePostV1AdminAffiliatesConfigTiersMutation,
  usePutV1AdminAffiliatesConfigRulesIdMutation,
  usePutV1AdminAffiliatesConfigTiersIdMutation,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney, minorToInput } from "../../lib/money";
import { notifySaved } from "../../lib/notify";
import { FormDialog, firstError, type FormErrors } from "./affiliate-dialogs";
import {
  APPLIES_TO_LABELS,
  buildRule,
  buildTier,
  customerLabel,
  describeRule,
  REWARD_TYPE_LABELS,
  RULE_SCOPE_LABELS,
  RULE_SCOPES,
  RULE_TYPE_LABELS,
  slugify,
  splitScopeId,
  type CommissionRule,
  type RuleAppliesTo,
  type RuleForm,
  type RuleScope,
  type RuleType,
  type ScopeParts,
  type Tier,
  type TierForm,
} from "./affiliate-logic";

// Program money is configured in the store's currency.
const CURRENCY = DEFAULT_CURRENCY;

// ── Tiers ────────────────────────────────────────────────────────────────────

function tierForm(tier?: Tier): TierForm {
  return {
    handle: tier?.handle ?? "",
    name: tier?.name ?? "",
    rewardType: tier?.rewardType === "STORE_CREDIT" ? "STORE_CREDIT" : "CASH",
    autoApprove: tier?.autoApprove ?? false,
    isDefault: tier?.isDefault ?? false,
    position: tier ? String(tier.position) : "",
    minSales: tier?.minSalesMinor != null ? minorToInput(tier.minSalesMinor, CURRENCY) : "",
    currency: CURRENCY,
  };
}

function TierDialog({ tier }: { tier?: Tier }) {
  const [create] = usePostV1AdminAffiliatesConfigTiersMutation();
  const [update] = usePutV1AdminAffiliatesConfigTiersIdMutation();
  const [form, setForm] = useState<TierForm>(() => tierForm(tier));
  const set = (patch: Partial<TierForm>) => setForm((f) => ({ ...f, ...patch }));
  const idp = tier ? `tier-${tier.id}` : "tier-new";

  return (
    <FormDialog
      trigger={
        tier ? (
          <Button size="xs" variant="outline">
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon data-icon="inline-start" /> New tier
          </Button>
        )
      }
      title={tier ? `Edit ${tier.name}` : "New tier"}
      description="A tier sets how affiliates are rewarded and whether applications are approved automatically. Commission rates come from commission rules (tier scope)."
      submitLabel={tier ? "Save tier" : "Create tier"}
      onOpen={() => setForm(tierForm(tier))}
      onSubmit={() => {
        const result = buildTier(form);
        if (!result.ok) return result.errors;
        const run = tier ? update({ id: tier.id, body: result.body }) : create({ body: result.body });
        return run.unwrap().then(() => notifySaved(tier ? "Tier saved" : "Tier created"));
      }}
    >
      {(errors) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={firstError(errors, "name") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-name`}>Name</FieldLabel>
            <Input
              id={`${idp}-name`}
              value={form.name}
              required
              onChange={(e) =>
                set({
                  name: e.target.value,
                  ...(tier || form.handle !== slugify(form.name) ? {} : { handle: slugify(e.target.value) }),
                })
              }
            />
            <FieldError>{firstError(errors, "name")}</FieldError>
          </Field>
          <Field data-invalid={firstError(errors, "handle") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-handle`}>Handle</FieldLabel>
            <Input
              id={`${idp}-handle`}
              value={form.handle}
              required
              onChange={(e) => set({ handle: e.target.value })}
            />
            <FieldError>{firstError(errors, "handle")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idp}-reward`}>Reward</FieldLabel>
            <Select
              value={form.rewardType}
              onValueChange={(v) => set({ rewardType: v === "STORE_CREDIT" ? "STORE_CREDIT" : "CASH" })}
            >
              <SelectTrigger id={`${idp}-reward`} className="w-full">
                <SelectValue>{REWARD_TYPE_LABELS[form.rewardType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash (paid out)</SelectItem>
                <SelectItem value="STORE_CREDIT">Store credit</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={firstError(errors, "position") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-position`}>Position</FieldLabel>
            <Input
              id={`${idp}-position`}
              inputMode="numeric"
              value={form.position}
              onChange={(e) => set({ position: e.target.value })}
            />
            <FieldError>{firstError(errors, "position")}</FieldError>
          </Field>
          <Field className="sm:col-span-2" data-invalid={firstError(errors, "minSales") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-min`}>Automatic tier threshold ({CURRENCY}, optional)</FieldLabel>
            <Input
              id={`${idp}-min`}
              inputMode="decimal"
              value={form.minSales}
              onChange={(e) => set({ minSales: e.target.value })}
            />
            <FieldDescription>
              Affiliates whose attributed sales over the trailing period reach this move to the tier automatically.
              Leave empty to assign by hand.
            </FieldDescription>
            <FieldError>{firstError(errors, "minSales") ?? firstError(errors, "minSalesMinor")}</FieldError>
          </Field>
          <Field orientation="horizontal">
            <Switch id={`${idp}-auto`} checked={form.autoApprove} onCheckedChange={(v) => set({ autoApprove: v })} />
            <FieldLabel htmlFor={`${idp}-auto`}>Approve applications automatically</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Switch id={`${idp}-default`} checked={form.isDefault} onCheckedChange={(v) => set({ isDefault: v })} />
            <FieldLabel htmlFor={`${idp}-default`}>Default tier for new applicants</FieldLabel>
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

function TiersSection({ canWrite }: { canWrite: boolean }) {
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});
  return (
    <section className="space-y-3" aria-labelledby="tiers-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tiers-heading" className="text-sm font-medium">
            Tiers
          </h2>
          <p className="text-xs text-muted-foreground">Reward type, approval path and automatic tier changes.</p>
        </div>
        {canWrite && <TierDialog />}
      </div>
      {tiers.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(tiers.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Tier</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Automatic threshold</TableHead>
                <TableHead>Position</TableHead>
                {canWrite && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {tiers.data?.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No tiers yet.
                  </TableCell>
                </TableRow>
              )}
              {tiers.data?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <span className="text-sm font-medium">{t.name}</span>
                    {t.isDefault && (
                      <Badge variant="secondary" className="ml-2">
                        Default
                      </Badge>
                    )}
                    <p className="font-mono text-xs text-muted-foreground">{t.handle}</p>
                  </TableCell>
                  <TableCell className="text-xs">{REWARD_TYPE_LABELS[t.rewardType]}</TableCell>
                  <TableCell className="text-xs">
                    {t.autoApprove ? "Approved automatically" : "Reviewed by staff"}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {t.minSalesMinor != null ? formatMoney(t.minSalesMinor, CURRENCY) : "By hand only"}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">{t.position}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <TierDialog tier={t} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// ── Commission rules ─────────────────────────────────────────────────────────

const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function ruleForm(rule?: CommissionRule): RuleForm {
  const r = rule?.rule;
  return {
    scope: rule?.scope ?? "program",
    parts: rule ? splitScopeId(rule.scope, rule.scopeId) : { targetId: "", affiliateId: "", productId: "" },
    type: r?.type ?? "percent",
    percent: r?.percent != null ? String(r.percent) : "",
    amount: r?.amountMinor != null ? minorToInput(r.amountMinor, CURRENCY) : "",
    tiers: r?.tiers?.map((t) => ({
      minSales: minorToInput(t.minSalesMinor, CURRENCY),
      percent: String(t.percent),
    })) ?? [{ minSales: "0", percent: "" }],
    appliesTo: r?.appliesTo ?? "all",
    priority: rule ? String(rule.priority) : "",
    isActive: rule?.isActive ?? true,
    activeFrom: dateInput(rule?.activeFrom ?? null),
    activeTo: dateInput(rule?.activeTo ?? null),
    currency: CURRENCY,
  };
}

// Search-as-you-type picker for products and affiliates; keeps the chosen ID in the form.
function SearchPicker({
  id,
  label,
  value,
  selectedLabel,
  results,
  loading,
  error,
  query,
  onQuery,
  onPick,
  invalid,
  errorText,
}: {
  id: string;
  label: string;
  value: string;
  selectedLabel?: string;
  results: { id: string; label: string; hint?: string }[] | undefined;
  loading: boolean;
  error: unknown;
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  invalid?: boolean;
  errorText?: string;
}) {
  return (
    <Field data-invalid={invalid ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="search"
        value={query}
        placeholder="Search…"
        autoComplete="off"
        onChange={(e) => onQuery(e.target.value)}
      />
      {value && (
        <FieldDescription>
          Selected: <span className="font-medium">{selectedLabel ?? value}</span>{" "}
          <span className="font-mono">({value})</span>
        </FieldDescription>
      )}
      {error ? (
        <p className="text-xs text-destructive">{errorMessage(error)}</p>
      ) : query.trim() ? (
        <ul className="max-h-40 overflow-y-auto rounded-md border" aria-label={`${label} results`}>
          {loading && <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>}
          {!loading && results?.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">No matches.</li>
          )}
          {results?.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-pressed:font-medium"
                aria-pressed={r.id === value}
                onClick={() => onPick(r.id)}
              >
                {r.label}
                {r.hint && <span className="ml-2 text-xs text-muted-foreground">{r.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <FieldError>{errorText}</FieldError>
    </Field>
  );
}

function ProductPicker(props: {
  id: string;
  value: string;
  onPick: (id: string) => void;
  invalid?: boolean;
  errorText?: string;
}) {
  const canRead = useCan("products.read");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();
  const products = useGetV1AdminProductsQuery({ q: query.trim(), limit: 8 }, { skip: !canRead || !query.trim() });
  if (!canRead)
    return (
      <Field data-invalid={props.invalid ? true : undefined}>
        <FieldLabel htmlFor={props.id}>Product ID</FieldLabel>
        <Input id={props.id} value={props.value} onChange={(e) => props.onPick(e.target.value.trim())} />
        <FieldError>{props.errorText}</FieldError>
      </Field>
    );
  return (
    <SearchPicker
      {...props}
      label="Product"
      selectedLabel={picked}
      query={query}
      onQuery={setQuery}
      results={products.data?.items.map((p) => ({
        id: p.id,
        label: p.title,
        hint: p.status === "ACTIVE" ? undefined : p.status.toLowerCase(),
      }))}
      loading={products.isFetching}
      error={products.error}
      onPick={(id) => {
        setPicked(products.data?.items.find((p) => p.id === id)?.title);
        props.onPick(id);
      }}
    />
  );
}

function AffiliatePicker(props: {
  id: string;
  value: string;
  onPick: (id: string) => void;
  invalid?: boolean;
  errorText?: string;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string>();
  const list = useGetV1AdminAffiliatesQuery({ q: query.trim(), limit: 8 }, { skip: !query.trim() });
  return (
    <SearchPicker
      {...props}
      label="Affiliate"
      selectedLabel={picked}
      query={query}
      onQuery={setQuery}
      results={list.data?.items.map((a) => ({
        id: a.id,
        label: customerLabel(a.customer),
        hint: a.customer.email ?? undefined,
      }))}
      loading={list.isFetching}
      error={list.error}
      onPick={(id) => {
        const a = list.data?.items.find((x) => x.id === id);
        setPicked(a ? customerLabel(a.customer) : undefined);
        props.onPick(id);
      }}
    />
  );
}

function ScopeTarget({
  idp,
  form,
  setParts,
  errors,
}: {
  idp: string;
  form: RuleForm;
  setParts: (patch: Partial<ScopeParts>) => void;
  errors: FormErrors;
}) {
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});
  const canReadCategories = useCan("products.read");
  const categories = useGetV1AdminCategoriesQuery({}, { skip: form.scope !== "category" || !canReadCategories });
  const targetError = firstError(errors, "targetId") ?? firstError(errors, "scopeId");

  if (form.scope === "program") return null;
  if (form.scope === "tier" || (form.scope === "category" && categories.data)) {
    const options =
      form.scope === "tier"
        ? (tiers.data ?? []).map((t) => ({ value: t.id, label: t.name }))
        : (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }));
    const selected = options.find((o) => o.value === form.parts.targetId)?.label;
    return (
      <Field data-invalid={targetError ? true : undefined}>
        <FieldLabel htmlFor={`${idp}-target`}>{RULE_SCOPE_LABELS[form.scope]}</FieldLabel>
        <Select value={form.parts.targetId || null} onValueChange={(v) => setParts({ targetId: v ?? "" })}>
          <SelectTrigger id={`${idp}-target`} className="w-full">
            <SelectValue placeholder={`Choose a ${RULE_SCOPE_LABELS[form.scope].toLowerCase()}`}>
              {selected ?? (form.parts.targetId || undefined)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{targetError}</FieldError>
      </Field>
    );
  }
  if (form.scope === "category")
    return (
      <Field data-invalid={targetError ? true : undefined}>
        <FieldLabel htmlFor={`${idp}-target`}>Category ID</FieldLabel>
        <Input
          id={`${idp}-target`}
          value={form.parts.targetId}
          onChange={(e) => setParts({ targetId: e.target.value })}
        />
        <FieldError>{targetError}</FieldError>
      </Field>
    );
  if (form.scope === "product")
    return (
      <ProductPicker
        id={`${idp}-product`}
        value={form.parts.targetId}
        onPick={(targetId) => setParts({ targetId })}
        invalid={!!targetError}
        errorText={targetError}
      />
    );
  if (form.scope === "affiliate")
    return (
      <AffiliatePicker
        id={`${idp}-affiliate`}
        value={form.parts.targetId}
        onPick={(targetId) => setParts({ targetId })}
        invalid={!!targetError}
        errorText={targetError}
      />
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <AffiliatePicker
        id={`${idp}-affiliate`}
        value={form.parts.affiliateId}
        onPick={(affiliateId) => setParts({ affiliateId })}
        invalid={!!firstError(errors, "affiliateId")}
        errorText={firstError(errors, "affiliateId")}
      />
      <ProductPicker
        id={`${idp}-product`}
        value={form.parts.productId}
        onPick={(productId) => setParts({ productId })}
        invalid={!!firstError(errors, "productId")}
        errorText={firstError(errors, "productId") ?? firstError(errors, "scopeId")}
      />
    </div>
  );
}

function RuleDialog({ rule }: { rule?: CommissionRule }) {
  const [create] = usePostV1AdminAffiliatesConfigRulesMutation();
  const [update] = usePutV1AdminAffiliatesConfigRulesIdMutation();
  const [form, setForm] = useState<RuleForm>(() => ruleForm(rule));
  const set = (patch: Partial<RuleForm>) => setForm((f) => ({ ...f, ...patch }));
  const setParts = (patch: Partial<ScopeParts>) => setForm((f) => ({ ...f, parts: { ...f.parts, ...patch } }));
  const setTier = (i: number, patch: Partial<RuleForm["tiers"][number]>) =>
    setForm((f) => ({ ...f, tiers: f.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }));
  const idp = rule ? `rule-${rule.id}` : "rule-new";

  return (
    <FormDialog
      wide
      trigger={
        rule ? (
          <Button size="xs" variant="outline">
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon data-icon="inline-start" /> New rule
          </Button>
        )
      }
      title={rule ? `Edit commission rule (version ${rule.version})` : "New commission rule"}
      description={
        rule
          ? "Saving creates a new version. Earnings already recorded keep the version they were calculated with."
          : "The most specific rule wins: affiliate + product, product, category, affiliate, tier, then the program default."
      }
      submitLabel={rule ? "Save new version" : "Create rule"}
      onOpen={() => setForm(ruleForm(rule))}
      onSubmit={() => {
        const result = buildRule(form);
        if (!result.ok) return result.errors;
        const run = rule ? update({ id: rule.id, body: result.body }) : create({ body: result.body });
        return run.unwrap().then(() => notifySaved(rule ? "Rule saved as a new version" : "Rule created"));
      }}
    >
      {(errors) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${idp}-scope`}>Applies to</FieldLabel>
              <Select
                value={form.scope}
                onValueChange={(v) =>
                  set({
                    scope: (v as RuleScope | null) ?? "program",
                    parts: { targetId: "", affiliateId: "", productId: "" },
                  })
                }
              >
                <SelectTrigger id={`${idp}-scope`} className="w-full">
                  <SelectValue>{RULE_SCOPE_LABELS[form.scope]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[...RULE_SCOPES].reverse().map((s) => (
                    <SelectItem key={s} value={s}>
                      {RULE_SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${idp}-applies`}>Orders</FieldLabel>
              <Select
                value={form.appliesTo}
                onValueChange={(v) => set({ appliesTo: (v as RuleAppliesTo | null) ?? "all" })}
              >
                <SelectTrigger id={`${idp}-applies`} className="w-full">
                  <SelectValue>{APPLIES_TO_LABELS[form.appliesTo]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(APPLIES_TO_LABELS) as RuleAppliesTo[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {APPLIES_TO_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <ScopeTarget idp={idp} form={form} setParts={setParts} errors={errors} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${idp}-type`}>Commission</FieldLabel>
              <Select value={form.type} onValueChange={(v) => set({ type: (v as RuleType | null) ?? "percent" })}>
                <SelectTrigger id={`${idp}-type`} className="w-full">
                  <SelectValue>{RULE_TYPE_LABELS[form.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {RULE_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.type === "percent" && (
              <Field data-invalid={firstError(errors, "percent") ? true : undefined}>
                <FieldLabel htmlFor={`${idp}-percent`}>Rate (%)</FieldLabel>
                <Input
                  id={`${idp}-percent`}
                  inputMode="decimal"
                  value={form.percent}
                  onChange={(e) => set({ percent: e.target.value })}
                />
                <FieldDescription>0% makes the target ineligible (gift cards, for example).</FieldDescription>
                <FieldError>{firstError(errors, "percent")}</FieldError>
              </Field>
            )}
            {(form.type === "fixed_per_item" || form.type === "fixed_per_order") && (
              <Field data-invalid={firstError(errors, "amount") ? true : undefined}>
                <FieldLabel htmlFor={`${idp}-amount`}>Amount ({CURRENCY})</FieldLabel>
                <Input
                  id={`${idp}-amount`}
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                />
                <FieldError>{firstError(errors, "amount")}</FieldError>
              </Field>
            )}
          </div>

          {form.type === "tiered" && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sales tiers</legend>
              <p className="text-xs text-muted-foreground">
                The rate depends on the affiliate&apos;s attributed sales over the trailing period; the highest
                threshold reached applies.
              </p>
              {form.tiers.map((t, i) => (
                <div key={i} className="flex items-end gap-2">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`${idp}-tier-${i}-min`}>From sales of ({CURRENCY})</FieldLabel>
                    <Input
                      id={`${idp}-tier-${i}-min`}
                      inputMode="decimal"
                      value={t.minSales}
                      onChange={(e) => setTier(i, { minSales: e.target.value })}
                    />
                  </Field>
                  <Field className="w-32">
                    <FieldLabel htmlFor={`${idp}-tier-${i}-pct`}>Rate (%)</FieldLabel>
                    <Input
                      id={`${idp}-tier-${i}-pct`}
                      inputMode="decimal"
                      value={t.percent}
                      onChange={(e) => setTier(i, { percent: e.target.value })}
                    />
                  </Field>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove tier ${i + 1}`}
                    disabled={form.tiers.length <= 1}
                    onClick={() => set({ tiers: form.tiers.filter((_, j) => j !== i) })}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => set({ tiers: [...form.tiers, { minSales: "", percent: "" }] })}
              >
                <PlusIcon data-icon="inline-start" /> Add tier
              </Button>
              {firstError(errors, "tiers") && <p className="text-xs text-destructive">{firstError(errors, "tiers")}</p>}
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={firstError(errors, "priority") ? true : undefined}>
              <FieldLabel htmlFor={`${idp}-priority`}>Priority</FieldLabel>
              <Input
                id={`${idp}-priority`}
                inputMode="numeric"
                value={form.priority}
                onChange={(e) => set({ priority: e.target.value })}
              />
              <FieldDescription>Higher wins within the same scope.</FieldDescription>
              <FieldError>{firstError(errors, "priority")}</FieldError>
            </Field>
            <Field data-invalid={firstError(errors, "activeFrom") ? true : undefined}>
              <FieldLabel htmlFor={`${idp}-from`}>Starts (optional)</FieldLabel>
              <Input
                id={`${idp}-from`}
                type="date"
                value={form.activeFrom}
                onChange={(e) => set({ activeFrom: e.target.value })}
              />
              <FieldError>{firstError(errors, "activeFrom")}</FieldError>
            </Field>
            <Field data-invalid={firstError(errors, "activeTo") ? true : undefined}>
              <FieldLabel htmlFor={`${idp}-to`}>Ends (optional)</FieldLabel>
              <Input
                id={`${idp}-to`}
                type="date"
                value={form.activeTo}
                onChange={(e) => set({ activeTo: e.target.value })}
              />
              <FieldError>{firstError(errors, "activeTo")}</FieldError>
            </Field>
          </div>
          <Field orientation="horizontal">
            <Switch id={`${idp}-active`} checked={form.isActive} onCheckedChange={(v) => set({ isActive: v })} />
            <FieldLabel htmlFor={`${idp}-active`}>Active</FieldLabel>
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

function RuleTarget({ rule, tiers }: { rule: CommissionRule; tiers: Tier[] | undefined }) {
  if (rule.scope === "program") return <span className="text-xs text-muted-foreground">Everyone</span>;
  if (rule.scope === "tier")
    return <span className="text-xs">{tiers?.find((t) => t.id === rule.scopeId)?.name ?? rule.scopeId}</span>;
  if (rule.scope === "affiliate")
    return (
      <Link href={`/admin/affiliates/${rule.scopeId}`} className="font-mono text-xs underline-offset-4 hover:underline">
        {rule.scopeId}
      </Link>
    );
  if (rule.scope === "affiliate_product") {
    const { affiliateId, productId } = splitScopeId(rule.scope, rule.scopeId);
    return (
      <span className="font-mono text-xs">
        <Link href={`/admin/affiliates/${affiliateId}`} className="underline-offset-4 hover:underline">
          {affiliateId}
        </Link>{" "}
        +{" "}
        <Link href={`/admin/products/${productId}`} className="underline-offset-4 hover:underline">
          {productId}
        </Link>
      </span>
    );
  }
  if (rule.scope === "product")
    return (
      <Link href={`/admin/products/${rule.scopeId}`} className="font-mono text-xs underline-offset-4 hover:underline">
        {rule.scopeId}
      </Link>
    );
  return <span className="font-mono text-xs">{rule.scopeId}</span>;
}

function activeWindow(rule: CommissionRule): string {
  if (!rule.activeFrom && !rule.activeTo) return "Always";
  if (rule.activeFrom && rule.activeTo) return `${formatDateTime(rule.activeFrom)} – ${formatDateTime(rule.activeTo)}`;
  return rule.activeFrom ? `From ${formatDateTime(rule.activeFrom)}` : `Until ${formatDateTime(rule.activeTo)}`;
}

function RulesSection({ canWrite }: { canWrite: boolean }) {
  const rules = useGetV1AdminAffiliatesConfigRulesQuery({});
  const tiers = useGetV1AdminAffiliatesConfigTiersQuery({});
  const sorted = [...(rules.data ?? [])].sort(
    (a, b) => RULE_SCOPES.indexOf(b.scope) - RULE_SCOPES.indexOf(a.scope) || b.priority - a.priority,
  );
  return (
    <section className="space-y-3" aria-labelledby="rules-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="rules-heading" className="text-sm font-medium">
            Commission rules
          </h2>
          <p className="text-xs text-muted-foreground">
            Most specific wins: affiliate + product → product → category → affiliate → tier → program default.
          </p>
        </div>
        {canWrite && <RuleDialog />}
      </div>
      {rules.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(rules.error)}</AlertDescription>
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Scope</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                {canWrite && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {rules.data?.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No commission rules yet. Without a program default, affiliates earn nothing.
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-medium whitespace-nowrap">{RULE_SCOPE_LABELS[r.scope]}</TableCell>
                  <TableCell>
                    <RuleTarget rule={r} tiers={tiers.data} />
                  </TableCell>
                  <TableCell className="text-xs">{describeRule(r.rule, CURRENCY)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{r.priority}</TableCell>
                  <TableCell className="text-xs">{activeWindow(r)}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "outline"}>{r.isActive ? "Active" : "Inactive"}</Badge>
                    <p className="mt-1 text-xs text-muted-foreground">v{r.version}</p>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <RuleDialog rule={r} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

// Affiliate program configuration (spec §7.1, §7.4): tiers and commission rules.
export function AffiliateProgramScreen() {
  const canWrite = useCan("affiliates.commission.write");
  return (
    <>
      <Link
        href="/admin/affiliates"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> Affiliates
      </Link>
      <PageHeader
        title="Tiers & commission"
        description="How affiliates are rewarded: tiers, and the commission rules that set their rates."
      />
      <div className="space-y-10">
        <TiersSection canWrite={canWrite} />
        <RulesSection canWrite={canWrite} />
      </div>
    </>
  );
}
