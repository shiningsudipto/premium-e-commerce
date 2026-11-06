"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { ArchiveIcon, ArrowDownIcon, ArrowUpIcon, PlusIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fieldErrors } from "../../store/api-errors";
import {
  useDeleteV1AdminCollectionsIdMutation,
  useGetV1AdminAttributesQuery,
  useGetV1AdminCollectionsQuery,
  useGetV1AdminProductTypesQuery,
  useGetV1AdminProductsQuery,
  usePostV1AdminCollectionsMutation,
  usePutV1AdminCollectionsIdMutation,
  usePutV1AdminCollectionsIdProductsMutation,
  type GetV1AdminCollectionsApiResponse,
  type PostV1AdminCollectionsApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { cleanSeo, moveItem, readSeo, slug, type Seo } from "../products/product-form";
import {
  blankCondition,
  normalizeRules,
  opsFor,
  RULE_FIELDS,
  summarizeRules,
  toRulesInput,
  validateRules,
  type RuleCondition,
  type Rules,
} from "./rules";

type Collection = GetV1AdminCollectionsApiResponse[number];
type CollectionType = PostV1AdminCollectionsApiArg["body"]["type"];

const columns: ColumnDef<Collection>[] = [
  {
    header: "Collection",
    cell: ({ row: { original: c } }) => (
      <div className="space-y-0.5">
        <p className="font-medium">{c.title}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{c.handle}</p>
      </div>
    ),
  },
  {
    header: "Type",
    cell: ({ row: { original: c } }) => (
      <Badge variant="secondary">{c.type === "MANUAL" ? "Manual" : "Rule-based"}</Badge>
    ),
  },
  {
    header: "Products",
    cell: ({ row: { original: c } }) => (
      <span className="line-clamp-2 max-w-sm text-xs whitespace-normal">
        {c.type === "MANUAL"
          ? `${c.products.length} product${c.products.length === 1 ? "" : "s"}`
          : summarizeRules(normalizeRules(c.rules))}
      </span>
    ),
  },
  {
    header: "Visible",
    cell: ({ row: { original: c } }) =>
      c.isPublished ? <Badge>Published</Badge> : <Badge variant="outline">Hidden</Badge>,
  },
  {
    header: "Updated",
    cell: ({ row: { original: c } }) => (
      <span className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(c.updatedAt)}</span>
    ),
  },
];

// Collections (spec §6.2): hand-picked products in a set order, or every product matching rules.
export function CollectionsScreen() {
  const collections = useGetV1AdminCollectionsQuery({});
  const canWrite = useCan("collections.write");
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="Collections"
        description="Manual collections list chosen products in your order. Rule-based ones include every product that matches their conditions, and stay up to date on their own."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon /> New collection
            </Button>
          )
        }
      />
      <DataTable
        tableKey="collections"
        columns={columns}
        data={collections.data}
        loading={collections.isLoading}
        error={collections.error}
        getRowId={(c) => c.id}
        renderExpanded={(c) => <CollectionEditor key={c.version} collection={c} readOnly={!canWrite} />}
        emptyMessage="No collections yet."
      />
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>It starts hidden. Add products or rules, then publish it.</DialogDescription>
          </DialogHeader>
          <CollectionEditor collection={null} readOnly={false} onCreated={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollectionEditor({
  collection,
  readOnly,
  onCreated,
}: {
  collection: Collection | null;
  readOnly: boolean;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState(collection?.title ?? "");
  const [handle, setHandle] = useState(collection?.handle ?? "");
  const [type, setType] = useState<CollectionType>(collection?.type ?? "MANUAL");
  const [isPublished, setPublished] = useState(collection?.isPublished ?? false);
  const [seo, setSeo] = useState<Seo>(readSeo(collection?.seo));
  const [rules, setRules] = useState<Rules>(() => {
    const stored = normalizeRules(collection?.rules);
    return stored.conditions.length ? stored : { ...stored, conditions: [blankCondition()] };
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [createCollection, create] = usePostV1AdminCollectionsMutation();
  const [updateCollection, update] = usePutV1AdminCollectionsIdMutation();
  const [archive] = useDeleteV1AdminCollectionsIdMutation();

  const handleValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle);
  const ruleErrors = type === "RULE" ? validateRules(rules) : {};
  const invalid = !title.trim() || !handleValid || Object.keys(ruleErrors).length > 0;

  function submit() {
    setShowErrors(true);
    if (invalid) return;
    const body: PostV1AdminCollectionsApiArg["body"] = {
      title: title.trim(),
      handle,
      type,
      isPublished,
      seo: cleanSeo(seo),
      // a manual collection keeps no rules
      rules: type === "RULE" ? toRulesInput(rules) : {},
    };
    const onError = (error: unknown) => {
      setErrors(fieldErrors(error));
      notifyError(error);
    };
    if (collection) {
      updateCollection({ id: collection.id, body: { ...body, version: collection.version } })
        .unwrap()
        .then(() => notifySaved(`${body.title} saved`), onError);
    } else {
      createCollection({ body })
        .unwrap()
        .then(() => {
          notifySaved(`${body.title} created`);
          onCreated?.();
        }, onError);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field data-invalid={showErrors && !title.trim() ? true : undefined}>
            <FieldLabel htmlFor={`collection-title-${collection?.id ?? "new"}`}>Title</FieldLabel>
            <Input
              id={`collection-title-${collection?.id ?? "new"}`}
              value={title}
              maxLength={200}
              disabled={readOnly}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!collection && (!handle || handle === slug(title))) setHandle(slug(e.target.value));
              }}
            />
          </Field>
          <Field data-invalid={(handle && !handleValid) || errors.handle ? true : undefined}>
            <FieldLabel htmlFor={`collection-handle-${collection?.id ?? "new"}`}>Handle</FieldLabel>
            <Input
              id={`collection-handle-${collection?.id ?? "new"}`}
              value={handle}
              className="font-mono"
              disabled={readOnly}
              onChange={(e) => setHandle(e.target.value.trim())}
            />
            <FieldError>
              {handle && !handleValid ? "Lowercase letters, numbers and dashes" : errors.handle?.[0]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={`collection-type-${collection?.id ?? "new"}`}>Type</FieldLabel>
            <Select value={type} onValueChange={(v) => setType(v as CollectionType)} disabled={readOnly}>
              <SelectTrigger id={`collection-type-${collection?.id ?? "new"}`} className="w-full">
                <SelectValue>
                  {type === "MANUAL" ? "Manual: pick products" : "Rule-based: match conditions"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual: pick products</SelectItem>
                <SelectItem value="RULE">Rule-based: match conditions</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field orientation="horizontal" className="self-end">
            <Switch
              id={`collection-published-${collection?.id ?? "new"}`}
              checked={isPublished}
              disabled={readOnly}
              onCheckedChange={setPublished}
            />
            <FieldLabel htmlFor={`collection-published-${collection?.id ?? "new"}`}>
              Visible on the storefront
            </FieldLabel>
          </Field>
          <Field>
            <FieldLabel htmlFor={`collection-seo-title-${collection?.id ?? "new"}`}>SEO title</FieldLabel>
            <Input
              id={`collection-seo-title-${collection?.id ?? "new"}`}
              value={seo.title ?? ""}
              maxLength={200}
              disabled={readOnly}
              onChange={(e) => setSeo({ ...seo, title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`collection-seo-description-${collection?.id ?? "new"}`}>Meta description</FieldLabel>
            <Input
              id={`collection-seo-description-${collection?.id ?? "new"}`}
              value={seo.description ?? ""}
              maxLength={500}
              disabled={readOnly}
              onChange={(e) => setSeo({ ...seo, description: e.target.value })}
            />
          </Field>
        </div>

        {type === "RULE" && (
          <RuleBuilder rules={rules} onChange={setRules} errors={showErrors ? ruleErrors : {}} readOnly={readOnly} />
        )}
        {errors._form && <p className="text-sm text-destructive">{errors._form[0]}</p>}

        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {collection && (
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="ghost" className="mr-auto">
                    <ArchiveIcon /> Archive
                  </Button>
                }
                title={`Archive ${collection.title}?`}
                description="It leaves the storefront and this list. Menus that link to it should be updated."
                confirmLabel="Archive collection"
                destructive
                onConfirm={() =>
                  archive({ id: collection.id })
                    .unwrap()
                    .then(() => notifySaved(`${collection.title} archived`), notifyError)
                }
              />
            )}
            <Button type="submit" size="sm" disabled={create.isLoading || update.isLoading}>
              {collection ? "Save collection" : "Create collection"}
            </Button>
          </div>
        )}
      </form>

      {collection?.type === "MANUAL" && type === "MANUAL" && (
        <ManualProducts collection={collection} readOnly={readOnly} />
      )}
      {collection && collection.type !== type && (
        <p className="text-sm text-muted-foreground">
          Save the new type to manage its {type === "MANUAL" ? "products" : "rules"}.
        </p>
      )}
    </div>
  );
}

function RuleBuilder({
  rules,
  onChange,
  errors,
  readOnly,
}: {
  rules: Rules;
  onChange: (rules: Rules) => void;
  errors: Record<string, string>;
  readOnly: boolean;
}) {
  const attributes = useGetV1AdminAttributesQuery({});
  const productTypes = useGetV1AdminProductTypesQuery({});
  const setCondition = (i: number, patch: Partial<RuleCondition>) =>
    onChange({ ...rules, conditions: rules.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <FieldSet>
      <FieldLegend variant="label">Conditions</FieldLegend>
      <div className="flex items-center gap-2 text-sm">
        Products must match
        <Select
          value={rules.match}
          onValueChange={(v) => onChange({ ...rules, match: v as Rules["match"] })}
          disabled={readOnly}
        >
          <SelectTrigger aria-label="Match" size="sm" className="w-24">
            <SelectValue>{rules.match === "all" ? "all" : "any"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="any">any</SelectItem>
          </SelectContent>
        </Select>
        of these conditions:
      </div>
      <ol className="space-y-2">
        {rules.conditions.map((c, i) => (
          <li key={i} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={c.field}
                disabled={readOnly}
                onValueChange={(v) => {
                  const field = v as RuleCondition["field"];
                  setCondition(i, {
                    field,
                    op: opsFor(field).some((o) => o.value === c.op) ? c.op : "eq",
                    value: "",
                    attribute: undefined,
                  });
                }}
              >
                <SelectTrigger aria-label={`Condition ${i + 1} field`} size="sm" className="w-36">
                  <SelectValue>{RULE_FIELDS.find((f) => f.value === c.field)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RULE_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {c.field === "attribute" && (
                <Select
                  value={c.attribute ?? ""}
                  disabled={readOnly}
                  onValueChange={(v) => setCondition(i, { attribute: String(v), value: "" })}
                >
                  <SelectTrigger aria-label={`Condition ${i + 1} attribute`} size="sm" className="w-40">
                    <SelectValue>
                      {attributes.data?.find((a) => a.handle === c.attribute)?.label ?? c.attribute ?? "Attribute"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {attributes.data?.map((a) => (
                      <SelectItem key={a.id} value={a.handle}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={c.op}
                disabled={readOnly}
                onValueChange={(v) => setCondition(i, { op: v as RuleCondition["op"] })}
              >
                <SelectTrigger aria-label={`Condition ${i + 1} operator`} size="sm" className="w-28">
                  <SelectValue>{opsFor(c.field).find((o) => o.value === c.op)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {opsFor(c.field).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {c.field === "product_type" && productTypes.data?.length ? (
                <Select
                  value={c.value}
                  disabled={readOnly}
                  onValueChange={(v) => setCondition(i, { value: String(v) })}
                >
                  <SelectTrigger aria-label={`Condition ${i + 1} value`} size="sm" className="w-44">
                    <SelectValue>
                      {productTypes.data.find((t) => t.handle === c.value)?.name ?? "Product type"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.data.map((t) => (
                      <SelectItem key={t.id} value={t.handle}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  aria-label={`Condition ${i + 1} value`}
                  aria-invalid={errors[i] ? true : undefined}
                  className="h-7 w-48"
                  value={c.value}
                  disabled={readOnly}
                  onChange={(e) => setCondition(i, { value: e.target.value })}
                />
              )}
              {!readOnly && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove condition ${i + 1}`}
                  onClick={() => onChange({ ...rules, conditions: rules.conditions.filter((_, j) => j !== i) })}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
            {errors[i] && <p className="text-xs text-destructive">{errors[i]}</p>}
          </li>
        ))}
      </ol>
      {errors._form && <FieldError>{errors._form}</FieldError>}
      {!readOnly && rules.conditions.length < 20 && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={() => onChange({ ...rules, conditions: [...rules.conditions, blankCondition()] })}
        >
          <PlusIcon /> Add condition
        </Button>
      )}
      <FieldDescription>{summarizeRules(rules)}</FieldDescription>
    </FieldSet>
  );
}

type PickedProduct = { productId: string; title: string; handle: string; status: string };

function ManualProducts({ collection, readOnly }: { collection: Collection; readOnly: boolean }) {
  const saved: PickedProduct[] = collection.products.map((p) => ({ productId: p.productId, ...p.product }));
  const [items, setItems] = useState(saved);
  const [query, setQuery] = useState("");
  const search = useGetV1AdminProductsQuery({ q: query.trim(), limit: 8 }, { skip: query.trim().length < 2 });
  const [saveProducts, save] = usePutV1AdminCollectionsIdProductsMutation();
  const dirty = JSON.stringify(items.map((i) => i.productId)) !== JSON.stringify(saved.map((i) => i.productId));

  return (
    <FieldGroup className="border-t pt-5">
      <FieldSet>
        <FieldLegend variant="label">Products, in display order</FieldLegend>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
        <ol className="divide-y rounded-md border bg-background">
          {items.map((item, i) => (
            <li key={item.productId} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="w-6 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.status !== "ACTIVE" && (
                <Badge variant="outline" className="text-[10px]">
                  {item.status.toLowerCase()}
                </Badge>
              )}
              {!readOnly && (
                <span className="flex gap-0.5">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${item.title} up`}
                    disabled={i === 0}
                    onClick={() => setItems(moveItem(items, i, i - 1))}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Move ${item.title} down`}
                    disabled={i === items.length - 1}
                    onClick={() => setItems(moveItem(items, i, i + 1))}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => setItems(items.filter((x) => x.productId !== item.productId))}
                  >
                    <XIcon />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ol>
      </FieldSet>
      {!readOnly && (
        <div className="space-y-2">
          <div className="relative max-w-sm">
            <SearchIcon
              className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Find products to add"
              placeholder="Find products to add"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query.trim().length >= 2 && (
            <ul className="max-w-sm divide-y rounded-md border bg-background text-sm">
              {search.data?.items.length === 0 && <li className="px-3 py-2 text-muted-foreground">No matches.</li>}
              {search.data?.items.map((p) => {
                const added = items.some((i) => i.productId === p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={added}
                      className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted disabled:opacity-50"
                      onClick={() =>
                        setItems([...items, { productId: p.id, title: p.title, handle: p.handle, status: p.status }])
                      }
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="text-xs text-muted-foreground">{added ? "Added" : "Add"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setItems(saved)}>
                Discard
              </Button>
            )}
            <Button
              size="sm"
              disabled={!dirty || save.isLoading}
              onClick={() =>
                saveProducts({ id: collection.id, body: { productIds: items.map((i) => i.productId) } })
                  .unwrap()
                  .then(() => notifySaved(`${collection.title}: ${items.length} products saved`), notifyError)
              }
            >
              {save.isLoading ? "Saving…" : "Save products"}
            </Button>
          </div>
        </div>
      )}
    </FieldGroup>
  );
}
