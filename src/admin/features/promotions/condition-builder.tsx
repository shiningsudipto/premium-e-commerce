"use client";

import { ArrowDownIcon, ArrowUpIcon, BracesIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addChild,
  blankCondition,
  CONDITION_TYPES,
  conditionLabel,
  isGroup,
  MAX_GROUP_CONDITIONS,
  moveNode,
  pathKey,
  removeNode,
  summarizeConditions,
  updateNode,
  wrapInGroup,
  type Condition,
  type ConditionType,
  type GroupCondition,
  type LeafCondition,
  type NodePath,
} from "./promotion-rules";
import { FilterEditor, NumberInput, TokenListInput, useRuleOptions } from "./rule-inputs";

// Deeper nesting is allowed by the API but stops being readable.
const MAX_DEPTH = 4;

type Ctx = {
  root: GroupCondition;
  onChange: (root: GroupCondition) => void;
  errors: Record<string, string>;
  readOnly: boolean;
};

// Visual editor for the condition tree: nested all/any groups of conditions (spec §8.3).
export function ConditionBuilder({ root, onChange, errors, readOnly }: Ctx) {
  const options = useRuleOptions();
  return (
    <div className="space-y-3">
      <GroupNode ctx={{ root, onChange, errors, readOnly }} group={root} path={[]} />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground">Applies when: </span>
        {summarizeConditions(root, options.currency, options.names)}
      </p>
    </div>
  );
}

function NodeControls({
  ctx,
  path,
  siblings,
  label,
  wrappable,
}: {
  ctx: Ctx;
  path: NodePath;
  siblings: number;
  label: string;
  wrappable: boolean;
}) {
  if (ctx.readOnly || path.length === 0) return null;
  const index = path[path.length - 1]!;
  return (
    <span className="ml-auto flex shrink-0 gap-0.5">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => ctx.onChange(moveNode(ctx.root, path, -1))}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={`Move ${label} down`}
        disabled={index === siblings - 1}
        onClick={() => ctx.onChange(moveNode(ctx.root, path, 1))}
      >
        <ArrowDownIcon />
      </Button>
      {wrappable && path.length < MAX_DEPTH && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={`Put ${label} in a group`}
          title="Put in a group"
          onClick={() => ctx.onChange(wrapInGroup(ctx.root, path, "any"))}
        >
          <BracesIcon />
        </Button>
      )}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label={`Remove ${label}`}
        onClick={() => ctx.onChange(removeNode(ctx.root, path))}
      >
        <Trash2Icon />
      </Button>
    </span>
  );
}

function GroupNode({
  ctx,
  group,
  path,
  siblings = 1,
}: {
  ctx: Ctx;
  group: GroupCondition;
  path: NodePath;
  siblings?: number;
}) {
  const key = pathKey(path) || "root";
  const label = path.length === 0 ? "all conditions" : `group ${path.map((i) => i + 1).join(".")}`;
  const error = ctx.errors[pathKey(path)];
  const full = group.conditions.length >= MAX_GROUP_CONDITIONS;

  return (
    <fieldset
      className={path.length === 0 ? "space-y-2" : "space-y-2 rounded-md border border-dashed bg-muted/30 p-3"}
      aria-label={path.length === 0 ? "Conditions" : `Condition group ${path.map((i) => i + 1).join(".")}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>{path.length === 0 ? "Apply when" : "Group: "}</span>
        <Select
          value={group.type}
          disabled={ctx.readOnly}
          onValueChange={(v) =>
            ctx.onChange(updateNode(ctx.root, path, (g) => ({ ...(g as GroupCondition), type: v as "all" | "any" })))
          }
        >
          <SelectTrigger size="sm" aria-label={`Match for ${label}`} className="w-24">
            <SelectValue>{group.type === "all" ? "all" : "any"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="any">any</SelectItem>
          </SelectContent>
        </Select>
        <span>of these {path.length === 0 ? "conditions are met" : "are met"}</span>
        <NodeControls ctx={ctx} path={path} siblings={siblings} label={label} wrappable={false} />
      </div>

      {group.conditions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {path.length === 0 ? "No conditions: every cart qualifies." : "Empty group: it's left out when saved."}
        </p>
      ) : (
        <ol className="space-y-2">
          {group.conditions.map((child, i) => (
            <li key={`${i}-${child.type}`} className="relative">
              {i > 0 && (
                <span className="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {group.type === "all" ? "and" : "or"}
                </span>
              )}
              {isGroup(child) ? (
                <GroupNode ctx={ctx} group={child} path={[...path, i]} siblings={group.conditions.length} />
              ) : (
                <LeafNode ctx={ctx} node={child} path={[...path, i]} siblings={group.conditions.length} />
              )}
            </li>
          ))}
        </ol>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!ctx.readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={null}
            disabled={full}
            onValueChange={(v) => v && ctx.onChange(addChild(ctx.root, path, blankCondition(v as ConditionType)))}
          >
            <SelectTrigger size="sm" aria-label={`Add a condition to ${label}`} id={`cond-add-${key}`}>
              <PlusIcon className="size-3.5" aria-hidden />
              <SelectValue placeholder="Add condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex flex-col">
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {path.length < MAX_DEPTH - 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={full}
              onClick={() =>
                ctx.onChange(addChild(ctx.root, path, blankCondition(group.type === "all" ? "any" : "all")))
              }
            >
              <BracesIcon /> Add group
            </Button>
          )}
        </div>
      )}
    </fieldset>
  );
}

function LeafNode({ ctx, node, path, siblings }: { ctx: Ctx; node: LeafCondition; path: NodePath; siblings: number }) {
  const label = `condition ${path.map((i) => i + 1).join(".")}`;
  const error = ctx.errors[pathKey(path)];
  const set = (next: Condition) => ctx.onChange(updateNode(ctx.root, path, () => next));
  return (
    <div
      className="space-y-2 rounded-md border bg-card p-3"
      role="group"
      aria-label={`${conditionLabel(node.type)} (${label})`}
      data-invalid={error ? true : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{conditionLabel(node.type)}</span>
        <NodeControls ctx={ctx} path={path} siblings={siblings} label={label} wrappable />
      </div>
      <LeafFields node={node} onChange={set} id={`cond-${pathKey(path)}`} readOnly={ctx.readOnly} invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

type TriValue = "any" | "yes" | "no";
const toTri = (v: boolean | undefined): TriValue => (v === undefined ? "any" : v ? "yes" : "no");
const fromTri = (v: TriValue) => (v === "any" ? undefined : v === "yes");

function TriSelect({
  id,
  label,
  value,
  labels,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: boolean | undefined;
  labels: Record<TriValue, string>;
  onChange: (value: boolean | undefined) => void;
  disabled: boolean;
}) {
  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <Select value={toTri(value)} disabled={disabled} onValueChange={(v) => onChange(fromTri(v as TriValue))}>
        <SelectTrigger id={id} size="sm" className="w-48">
          <SelectValue>{labels[toTri(value)]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(labels) as TriValue[]).map((k) => (
            <SelectItem key={k} value={k}>
              {labels[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function RangeFields({
  id,
  node,
  onChange,
  kind,
  unit,
  readOnly,
  invalid,
}: {
  id: string;
  node: { min?: number; max?: number };
  onChange: (patch: { min?: number; max?: number }) => void;
  kind: "int" | "money";
  unit?: string;
  readOnly: boolean;
  invalid: boolean;
}) {
  const { currency } = useRuleOptions();
  return (
    <div className="flex flex-wrap gap-4">
      {(["min", "max"] as const).map((k) => (
        <Field key={k} className="w-auto gap-1.5">
          <FieldLabel htmlFor={`${id}-${k}`} className="text-xs">
            {k === "min" ? "At least" : "At most"}
            {kind === "money" ? ` (${currency})` : unit ? ` (${unit})` : ""}
          </FieldLabel>
          <NumberInput
            id={`${id}-${k}`}
            kind={kind}
            currency={currency}
            value={node[k]}
            disabled={readOnly}
            invalid={invalid}
            placeholder="No limit"
            onChange={(v) => onChange({ ...node, [k]: v })}
          />
        </Field>
      ))}
    </div>
  );
}

function LeafFields({
  node,
  onChange,
  id,
  readOnly,
  invalid,
}: {
  node: LeafCondition;
  onChange: (node: Condition) => void;
  id: string;
  readOnly: boolean;
  invalid: boolean;
}) {
  const options = useRuleOptions();
  switch (node.type) {
    case "subtotal":
      return (
        <RangeFields
          id={id}
          node={node}
          kind="money"
          readOnly={readOnly}
          invalid={invalid}
          onChange={(p) => onChange({ ...node, ...p })}
        />
      );
    case "item_count":
      return (
        <RangeFields
          id={id}
          node={node}
          kind="int"
          unit="items"
          readOnly={readOnly}
          invalid={invalid}
          onChange={(p) => onChange({ ...node, ...p })}
        />
      );
    case "weight":
      return (
        <RangeFields
          id={id}
          node={node}
          kind="int"
          unit="grams"
          readOnly={readOnly}
          invalid={invalid}
          onChange={(p) => onChange({ ...node, ...p })}
        />
      );
    case "contains":
      return (
        <div className="space-y-3">
          <FilterEditor
            idPrefix={`${id}-filter`}
            title="Items that count"
            filter={node.filter}
            disabled={readOnly}
            defaultOpen={!readOnly}
            onChange={(filter) => onChange({ ...node, filter })}
          />
          <div className="flex flex-wrap gap-4">
            <Field className="w-auto gap-1.5">
              <FieldLabel htmlFor={`${id}-qty`} className="text-xs">
                At least this many
              </FieldLabel>
              <NumberInput
                id={`${id}-qty`}
                value={node.minQuantity}
                disabled={readOnly}
                placeholder="1"
                onChange={(minQuantity) => onChange({ ...node, minQuantity })}
              />
            </Field>
            <Field className="w-auto gap-1.5">
              <FieldLabel htmlFor={`${id}-amount`} className="text-xs">
                Worth at least ({options.currency})
              </FieldLabel>
              <NumberInput
                id={`${id}-amount`}
                kind="money"
                currency={options.currency}
                value={node.minAmountMinor}
                disabled={readOnly}
                placeholder="Any amount"
                onChange={(minAmountMinor) => onChange({ ...node, minAmountMinor })}
              />
            </Field>
          </div>
        </div>
      );
    case "customer":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <TriSelect
            id={`${id}-logged-in`}
            label="Account"
            value={node.loggedIn}
            disabled={readOnly}
            labels={{ any: "Signed in or guest", yes: "Signed in", no: "Guest" }}
            onChange={(loggedIn) => onChange({ ...node, loggedIn })}
          />
          <TriSelect
            id={`${id}-first-order`}
            label="Order history"
            value={node.firstOrder}
            disabled={readOnly}
            labels={{ any: "Any", yes: "First order only", no: "Returning customers only" }}
            onChange={(firstOrder) => onChange({ ...node, firstOrder })}
          />
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${id}-groups`} className="text-xs">
              In any of these customer groups
            </FieldLabel>
            <TokenListInput
              id={`${id}-groups`}
              label="Customer groups"
              values={node.groupIds ?? []}
              options={options.groups}
              names={options.names}
              disabled={readOnly}
              onChange={(groupIds) => onChange({ ...node, groupIds })}
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${id}-segments`} className="text-xs">
              In any of these segments
            </FieldLabel>
            <TokenListInput
              id={`${id}-segments`}
              label="Segments"
              values={node.segmentIds ?? []}
              options={options.segments}
              names={options.names}
              disabled={readOnly}
              onChange={(segmentIds) => onChange({ ...node, segmentIds })}
            />
          </Field>
        </div>
      );
    case "currency":
    case "country":
    case "channel": {
      const meta = {
        currency: { label: "Currencies", options: options.currencies, upper: true, placeholder: "e.g. BDT" },
        country: { label: "Countries", options: options.countries, upper: true, placeholder: "e.g. BD" },
        channel: { label: "Channels", options: options.channels, upper: false, placeholder: undefined },
      }[node.type];
      return (
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${id}-in`} className="text-xs">
            Is any of
          </FieldLabel>
          <TokenListInput
            id={`${id}-in`}
            label={meta.label}
            values={node.in}
            options={meta.options}
            names={options.names}
            disabled={readOnly}
            invalid={invalid}
            placeholder={meta.placeholder}
            normalize={(v) => (meta.upper ? v.trim().toUpperCase() : v.trim())}
            onChange={(values) => onChange({ ...node, in: values })}
          />
        </Field>
      );
    }
    case "shipping_method":
      return (
        <Field className="gap-1.5">
          <FieldLabel htmlFor={`${id}-rates`} className="text-xs">
            Shipping rate is any of
          </FieldLabel>
          <TokenListInput
            id={`${id}-rates`}
            label="Shipping rates"
            values={node.rateIds}
            options={options.rates}
            names={options.names}
            disabled={readOnly}
            invalid={invalid}
            onChange={(rateIds) => onChange({ ...node, rateIds })}
          />
        </Field>
      );
    case "affiliate":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field className="gap-1.5">
            <FieldLabel htmlFor={`${id}-attributed`} className="text-xs">
              Referral
            </FieldLabel>
            <Select
              value={node.attributed ? "yes" : "no"}
              disabled={readOnly}
              onValueChange={(v) =>
                onChange({ ...node, attributed: v === "yes", tierIds: v === "yes" ? node.tierIds : undefined })
              }
            >
              <SelectTrigger id={`${id}-attributed`} size="sm" className="w-56">
                <SelectValue>{node.attributed ? "Referred by an affiliate" : "Not referred"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Referred by an affiliate</SelectItem>
                <SelectItem value="no">Not referred</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {node.attributed && (
            <Field className="gap-1.5">
              <FieldLabel htmlFor={`${id}-tiers`} className="text-xs">
                Only these affiliate tiers (optional)
              </FieldLabel>
              <TokenListInput
                id={`${id}-tiers`}
                label="Affiliate tiers"
                values={node.tierIds ?? []}
                options={options.tiers}
                names={options.names}
                disabled={readOnly}
                onChange={(tierIds) => onChange({ ...node, tierIds })}
              />
            </Field>
          )}
        </div>
      );
  }
}
