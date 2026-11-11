"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveItem } from "../products/product-form";
import {
  ACTION_TYPES,
  actionLabel,
  blankAction,
  MAX_ACTIONS,
  summarizeAction,
  TARGETS,
  type Action,
  type ActionTarget,
  type ActionType,
  type Tier,
} from "./promotion-rules";
import { FilterEditor, NumberInput, TokenListInput, useRuleOptions } from "./rule-inputs";

// The actions a promotion takes, applied in order; later ones see what earlier ones left.
export function ActionBuilder({
  actions,
  onChange,
  errors,
  readOnly,
}: {
  actions: Action[];
  onChange: (actions: Action[]) => void;
  errors: Record<string, string>;
  readOnly: boolean;
}) {
  const options = useRuleOptions();
  const set = (i: number, next: Action) => onChange(actions.map((a, j) => (j === i ? next : a)));
  return (
    <div className="space-y-3">
      {actions.length === 0 && <p className="text-sm text-muted-foreground">No actions yet.</p>}
      <ol className="space-y-3">
        {actions.map((a, i) => {
          const label = `action ${i + 1}`;
          return (
            <li
              key={`${i}-${a.type}`}
              className="space-y-3 rounded-md border bg-card p-3"
              aria-label={`${actionLabel(a.type)} (${label})`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                <Select
                  value={a.type}
                  disabled={readOnly}
                  onValueChange={(v) => v !== a.type && set(i, blankAction(v as ActionType))}
                >
                  <SelectTrigger size="sm" aria-label={`Type of ${label}`} className="w-44">
                    <SelectValue>{actionLabel(a.type)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex flex-col">
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground">{t.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {summarizeAction(a, options.currency, options.names)}
                </span>
                {!readOnly && (
                  <span className="flex gap-0.5">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Move ${label} up`}
                      disabled={i === 0}
                      onClick={() => onChange(moveItem(actions, i, i - 1))}
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Move ${label} down`}
                      disabled={i === actions.length - 1}
                      onClick={() => onChange(moveItem(actions, i, i + 1))}
                    >
                      <ArrowDownIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${label}`}
                      onClick={() => onChange(actions.filter((_, j) => j !== i))}
                    >
                      <Trash2Icon />
                    </Button>
                  </span>
                )}
              </div>
              <ActionFields
                action={a}
                id={`action-${i}`}
                readOnly={readOnly}
                errors={errors}
                index={i}
                onChange={(next) => set(i, next)}
              />
              {errors[String(i)] && <p className="text-xs text-destructive">{errors[String(i)]}</p>}
            </li>
          );
        })}
      </ol>
      {errors._form && <FieldError>{errors._form}</FieldError>}
      {!readOnly && actions.length < MAX_ACTIONS && (
        <Select value={null} onValueChange={(v) => v && onChange([...actions, blankAction(v as ActionType)])}>
          <SelectTrigger size="sm" aria-label="Add an action">
            <PlusIcon className="size-3.5" aria-hidden />
            <SelectValue placeholder="Add action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function TargetSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: ActionTarget;
  onChange: (t: ActionTarget) => void;
  disabled: boolean;
}) {
  return (
    <Field className="w-auto gap-1.5">
      <FieldLabel htmlFor={id} className="text-xs">
        Applies to
      </FieldLabel>
      <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v as ActionTarget)}>
        <SelectTrigger id={id} size="sm" className="w-60">
          <SelectValue>{TARGETS.find((t) => t.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TARGETS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  kind = "int",
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  kind?: "int" | "decimal" | "money";
  disabled: boolean;
  placeholder?: string;
}) {
  const { currency } = useRuleOptions();
  return (
    <Field className="w-auto gap-1.5">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <NumberInput
        id={id}
        kind={kind}
        currency={currency}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
      />
    </Field>
  );
}

// Required numbers stay NaN while empty so validation flags them.
const req = (v: number | undefined) => v ?? Number.NaN;

function ActionFields({
  action: a,
  id,
  readOnly,
  errors,
  index,
  onChange,
}: {
  action: Action;
  id: string;
  readOnly: boolean;
  errors: Record<string, string>;
  index: number;
  onChange: (a: Action) => void;
}) {
  const options = useRuleOptions();
  const money = `(${options.currency})`;
  switch (a.type) {
    case "percent_off":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <NumberField
              id={`${id}-percent`}
              label="Percent off"
              kind="decimal"
              value={a.percent}
              disabled={readOnly}
              onChange={(v) => onChange({ ...a, percent: req(v) })}
            />
            <TargetSelect
              id={`${id}-target`}
              value={a.target}
              disabled={readOnly}
              onChange={(target) => onChange({ ...a, target })}
            />
          </div>
          <FilterEditor
            idPrefix={`${id}-filter`}
            title="Matching items"
            filter={a.filter}
            disabled={readOnly}
            onChange={(filter) => onChange({ ...a, filter })}
          />
        </div>
      );
    case "fixed_off":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <NumberField
              id={`${id}-amount`}
              label={`Amount off ${money}`}
              kind="money"
              value={a.amountMinor}
              disabled={readOnly}
              onChange={(v) => onChange({ ...a, amountMinor: req(v) })}
            />
            <TargetSelect
              id={`${id}-target`}
              value={a.target}
              disabled={readOnly}
              onChange={(target) => onChange({ ...a, target })}
            />
            {a.target === "items" && (
              <Field orientation="horizontal" className="w-auto pb-1.5">
                <Checkbox
                  id={`${id}-per-item`}
                  checked={!!a.perItem}
                  disabled={readOnly}
                  onCheckedChange={(on) => onChange({ ...a, perItem: !!on })}
                />
                <FieldLabel htmlFor={`${id}-per-item`} className="text-xs font-normal">
                  Per unit (otherwise once, spread across the items)
                </FieldLabel>
              </Field>
            )}
          </div>
          <FilterEditor
            idPrefix={`${id}-filter`}
            title="Matching items"
            filter={a.filter}
            disabled={readOnly}
            onChange={(filter) => onChange({ ...a, filter })}
          />
        </div>
      );
    case "bogo":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium">Customer buys</legend>
            <NumberField
              id={`${id}-buy-qty`}
              label="Quantity"
              value={a.buy.quantity}
              disabled={readOnly}
              onChange={(v) => onChange({ ...a, buy: { ...a.buy, quantity: req(v) } })}
            />
            <FilterEditor
              idPrefix={`${id}-buy-filter`}
              title="Of"
              filter={a.buy.filter}
              disabled={readOnly}
              onChange={(filter) => onChange({ ...a, buy: { ...a.buy, filter } })}
            />
          </fieldset>
          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium">Customer gets</legend>
            <div className="flex flex-wrap gap-4">
              <NumberField
                id={`${id}-get-qty`}
                label="Quantity"
                value={a.get.quantity}
                disabled={readOnly}
                onChange={(v) => onChange({ ...a, get: { ...a.get, quantity: req(v) } })}
              />
              <NumberField
                id={`${id}-get-percent`}
                label="Percent off (100 = free)"
                kind="decimal"
                value={a.get.percent}
                disabled={readOnly}
                onChange={(v) => onChange({ ...a, get: { ...a.get, percent: req(v) } })}
              />
            </div>
            <FilterEditor
              idPrefix={`${id}-get-filter`}
              title="Of"
              filter={a.get.filter}
              disabled={readOnly}
              onChange={(filter) => onChange({ ...a, get: { ...a.get, filter } })}
            />
          </fieldset>
          <NumberField
            id={`${id}-max`}
            label="Times it can apply per order"
            value={a.maxApplications}
            placeholder="Unlimited"
            disabled={readOnly}
            onChange={(maxApplications) => onChange({ ...a, maxApplications })}
          />
          <p className="self-end text-xs text-muted-foreground">
            The most expensive qualifying units count as bought; the cheapest qualifying ones are discounted.
          </p>
        </div>
      );
    case "tiered":
      return (
        <div className="space-y-3">
          <Field className="w-auto gap-1.5">
            <FieldLabel htmlFor={`${id}-basis`} className="text-xs">
              Tiers by
            </FieldLabel>
            <Select
              value={a.basis}
              disabled={readOnly}
              onValueChange={(v) =>
                v !== a.basis &&
                // thresholds mean something else under the other basis, so they start again
                onChange({
                  ...a,
                  basis: v as "subtotal" | "quantity",
                  tiers: a.tiers.map((t) => ({ ...t, threshold: Number.NaN })),
                })
              }
            >
              <SelectTrigger id={`${id}-basis`} size="sm" className="w-56">
                <SelectValue>
                  {a.basis === "subtotal" ? "Spend on matching items" : "Quantity of matching items"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subtotal">Spend on matching items</SelectItem>
                <SelectItem value="quantity">Quantity of matching items</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <TierTable
            id={id}
            tiers={a.tiers}
            basis={a.basis}
            errors={errors}
            index={index}
            readOnly={readOnly}
            onChange={(tiers) => onChange({ ...a, tiers })}
          />
          <FilterEditor
            idPrefix={`${id}-filter`}
            title="Matching items"
            filter={a.filter}
            disabled={readOnly}
            onChange={(filter) => onChange({ ...a, filter })}
          />
        </div>
      );
    case "free_shipping":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${id}-rates`} className="text-xs">
              Only for these shipping rates (optional)
            </FieldLabel>
            <TokenListInput
              id={`${id}-rates`}
              label="Shipping rates"
              values={a.rateIds ?? []}
              options={options.rates}
              names={options.names}
              disabled={readOnly}
              onChange={(rateIds) => onChange({ ...a, rateIds })}
            />
          </Field>
          <NumberField
            id={`${id}-cap`}
            label={`Covers shipping up to ${money}`}
            kind="money"
            value={a.maxShippingMinor}
            placeholder="The full charge"
            disabled={readOnly}
            onChange={(maxShippingMinor) => onChange({ ...a, maxShippingMinor })}
          />
        </div>
      );
  }
}

function TierTable({
  id,
  tiers,
  basis,
  errors,
  index,
  readOnly,
  onChange,
}: {
  id: string;
  tiers: Tier[];
  basis: "subtotal" | "quantity";
  errors: Record<string, string>;
  index: number;
  readOnly: boolean;
  onChange: (tiers: Tier[]) => void;
}) {
  const { currency } = useRuleOptions();
  const set = (j: number, t: Tier) => onChange(tiers.map((x, k) => (k === j ? t : x)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium">Tiers (the highest one reached applies)</legend>
      <ol className="space-y-2">
        {tiers.map((t, j) => {
          const kind = t.amountMinor !== undefined ? "amount" : "percent";
          const error = errors[`${index}.tiers.${j}`];
          return (
            <li key={j} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label htmlFor={`${id}-tier-${j}-threshold`}>From</label>
                <NumberInput
                  id={`${id}-tier-${j}-threshold`}
                  kind={basis === "subtotal" ? "money" : "int"}
                  currency={currency}
                  className="h-7 w-28"
                  value={t.threshold}
                  disabled={readOnly}
                  invalid={!!error}
                  onChange={(v) => set(j, { ...t, threshold: v ?? Number.NaN })}
                />
                <span>{basis === "subtotal" ? currency : "items"}, take</span>
                <NumberInput
                  aria-label={`Tier ${j + 1} discount`}
                  kind={kind === "amount" ? "money" : "decimal"}
                  currency={currency}
                  className="h-7 w-24"
                  value={kind === "amount" ? t.amountMinor : t.percent}
                  disabled={readOnly}
                  onChange={(v) =>
                    set(
                      j,
                      kind === "amount"
                        ? { threshold: t.threshold, amountMinor: req(v) }
                        : { threshold: t.threshold, percent: req(v) },
                    )
                  }
                />
                <Select
                  value={kind}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    v !== kind &&
                    set(
                      j,
                      v === "amount"
                        ? { threshold: t.threshold, amountMinor: Number.NaN }
                        : { threshold: t.threshold, percent: Number.NaN },
                    )
                  }
                >
                  <SelectTrigger size="sm" aria-label={`Tier ${j + 1} discount type`} className="w-28">
                    <SelectValue>{kind === "amount" ? `${currency} off` : "% off"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">% off</SelectItem>
                    <SelectItem value="amount">{currency} off</SelectItem>
                  </SelectContent>
                </Select>
                {!readOnly && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove tier ${j + 1}`}
                    onClick={() => onChange(tiers.filter((_, k) => k !== j))}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </li>
          );
        })}
      </ol>
      {!readOnly && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...tiers, { threshold: Number.NaN, percent: Number.NaN }])}
        >
          <PlusIcon /> Add tier
        </Button>
      )}
    </fieldset>
  );
}
