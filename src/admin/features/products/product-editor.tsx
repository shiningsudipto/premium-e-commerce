"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArchiveIcon, ArrowLeftIcon, EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminCategoriesQuery,
  useGetV1AdminChannelsQuery,
  useGetV1AdminCustomFieldsQuery,
  useGetV1AdminProductTypesQuery,
  useGetV1AdminProductsIdQuery,
  useGetV1AdminTaxClassesQuery,
  usePatchV1AdminProductsIdMutation,
  usePostV1AdminProductsIdStatusMutation,
  usePostV1AdminProductsMutation,
  type PostV1AdminProductsApiArg,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { SchemaField } from "../../components/json-schema-form/schema-field";
import { emptyValue, validate } from "../../components/json-schema-form/schema";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { MediaCard } from "./product-media";
import { VariantsCard } from "./product-variants";
import {
  cleanSeo,
  customFieldSchema,
  fromLocalInput,
  PUBLISH_LABEL,
  publishState,
  readOptions,
  readSeo,
  splitList,
  toLocalInput,
  type Product,
  type Seo,
} from "./product-form";
import { Section } from "./section";
import { STATE_BADGE } from "./products-screen";

type ProductBody = PostV1AdminProductsApiArg["body"];
type Oversell = NonNullable<ProductBody["oversellPolicy"]>;

const NONE = "__none";

const OVERSELL: { value: Oversell; label: string }[] = [
  { value: "DENY", label: "Stop selling when out of stock" },
  { value: "BACKORDER", label: "Allow backorders" },
  { value: "PREORDER", label: "Take preorders" },
];

function BackLink() {
  return (
    <Link
      href="/admin/products"
      className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
    >
      <ArrowLeftIcon className="size-3.5" aria-hidden /> Products
    </Link>
  );
}

export function NewProductScreen() {
  return (
    <>
      <BackLink />
      <PageHeader
        title="New product"
        description="It's saved as a draft. Add variants, prices and media once it exists, then publish it."
      />
      <ProductForm product={null} />
    </>
  );
}

// Product editor (spec §6.2): details, options, SEO and custom fields, publishing and scheduling,
// the variant matrix and media.
export function ProductEditScreen({ id }: { id: string }) {
  const product = useGetV1AdminProductsIdQuery({ id });
  if (product.error) {
    return (
      <>
        <BackLink />
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(product.error)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!product.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  const p = product.data;
  const state = publishState(p);
  return (
    <>
      <BackLink />
      <PageHeader
        title={p.title}
        description={`/${p.handle} · updated ${formatDateTime(p.updatedAt)}`}
        actions={<StatusActions product={p} />}
      />
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Badge variant={STATE_BADGE[state]}>{PUBLISH_LABEL[state]}</Badge>
        {state === "scheduled" && (
          <span className="text-muted-foreground">Goes live {formatDateTime(p.publishAt)}</span>
        )}
        {state === "active" && p.publishedAt && (
          <span className="text-muted-foreground">Live since {formatDateTime(p.publishedAt)}</span>
        )}
      </div>
      <div className="space-y-6">
        {/* a new version (after any save) resets the form to what the API stored */}
        <ProductForm key={p.version} product={p} />
        <VariantsCard product={p} refetch={product.refetch} />
        <MediaCard product={p} />
      </div>
    </>
  );
}

// Publish / unpublish / archive. Publishing keeps a future publishAt: the product stays hidden
// until the scheduler reaches that time.
function StatusActions({ product }: { product: Product }) {
  const canPublish = useCan("products.publish");
  const [setStatus, status] = usePostV1AdminProductsIdStatusMutation();
  if (!canPublish) return null;
  const run = (next: "DRAFT" | "ACTIVE" | "ARCHIVED", message: string) =>
    setStatus({ id: product.id, body: { status: next } })
      .unwrap()
      .then(() => notifySaved(message), notifyError);
  const future = product.publishAt && new Date(product.publishAt) > new Date();
  return (
    <>
      {product.status === "DRAFT" && (
        <Button
          size="sm"
          disabled={status.isLoading}
          onClick={() =>
            run(
              "ACTIVE",
              future
                ? `${product.title} is scheduled for ${formatDateTime(product.publishAt)}`
                : `${product.title} is live`,
            )
          }
        >
          <EyeIcon /> {future ? "Schedule" : "Publish"}
        </Button>
      )}
      {product.status === "ACTIVE" && (
        <Button
          size="sm"
          variant="outline"
          disabled={status.isLoading}
          onClick={() => run("DRAFT", `${product.title} is hidden from the storefront`)}
        >
          <EyeOffIcon /> Unpublish
        </Button>
      )}
      {product.status === "ARCHIVED" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={status.isLoading}
          onClick={() => run("DRAFT", `${product.title} restored as a draft`)}
        >
          Restore as draft
        </Button>
      ) : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost">
              <ArchiveIcon /> Archive
            </Button>
          }
          title={`Archive ${product.title}?`}
          description="It disappears from the storefront and from lists by default. Orders keep their history, and you can restore it as a draft later."
          confirmLabel="Archive product"
          destructive
          onConfirm={() => run("ARCHIVED", `${product.title} archived`)}
        />
      )}
    </>
  );
}

type OptionDraft = { name: string; values: string };

function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const canWrite = useCan("products.write");
  const categories = useGetV1AdminCategoriesQuery({});
  // these lists need settings.read; without it the pickers are simply left out
  const channels = useGetV1AdminChannelsQuery({});
  const taxClasses = useGetV1AdminTaxClassesQuery({});
  const productTypes = useGetV1AdminProductTypesQuery({});
  const customFieldDefs = useGetV1AdminCustomFieldsQuery({ entityType: "PRODUCT" });

  const initialDescription = typeof product?.description === "string" ? product.description : "";
  const richDescription = product?.description != null && typeof product.description !== "string";
  const [title, setTitle] = useState(product?.title ?? "");
  const [handle, setHandle] = useState(product?.handle ?? "");
  const [description, setDescription] = useState(initialDescription);
  const [vendor, setVendor] = useState(product?.vendor ?? "");
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [productTypeId, setProductTypeId] = useState(product?.productTypeId ?? NONE);
  const [taxClassId, setTaxClassId] = useState(product?.taxClassId ?? NONE);
  const [oversell, setOversell] = useState<Oversell>(product?.oversellPolicy ?? "DENY");
  const [lowStock, setLowStock] = useState(product?.lowStockThreshold?.toString() ?? "");
  const [publishAt, setPublishAt] = useState(toLocalInput(product?.publishAt));
  const [categoryIds, setCategoryIds] = useState<string[]>(product?.categories.map((c) => c.categoryId) ?? []);
  const [channelIds, setChannelIds] = useState<string[] | null>(
    product ? product.channels.map((c) => c.channelId) : null,
  );
  const [options, setOptions] = useState<OptionDraft[]>(
    readOptions(product?.options).map((o) => ({ name: o.name, values: o.values.join(", ") })),
  );
  const [seo, setSeo] = useState<Seo>(readSeo(product?.seo));
  const [customFields, setCustomFields] = useState<Record<string, unknown>>(
    (product?.customFields as Record<string, unknown> | undefined) ?? {},
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showErrors, setShowErrors] = useState(false);

  const [createProduct, create] = usePostV1AdminProductsMutation();
  const [updateProduct, update] = usePatchV1AdminProductsIdMutation();
  const saving = create.isLoading || update.isLoading;
  const readOnly = !canWrite;

  const defs = customFieldDefs.data ?? [];
  const customErrors = Object.fromEntries(
    defs.map((d) => {
      const schema = customFieldSchema(d);
      return [d.key, validate(schema, customFields[d.key] ?? emptyValue(schema))[""]];
    }),
  );
  const lowStockValue = lowStock.trim() === "" ? null : Number(lowStock);
  const localErrors: Record<string, string> = {
    ...(title.trim() ? {} : { title: "Enter a title" }),
    ...(handle && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)
      ? { handle: "Lowercase letters, numbers and dashes" }
      : {}),
    ...(lowStockValue !== null && (!Number.isInteger(lowStockValue) || lowStockValue < 0)
      ? { lowStockThreshold: "Enter a whole number" }
      : {}),
    ...(options.some((o) => !o.name.trim() || splitList(o.values).length === 0)
      ? { options: "Every option needs a name and at least one value" }
      : {}),
  };
  const invalid = Object.keys(localErrors).length > 0 || Object.values(customErrors).some(Boolean);
  const errorFor = (key: string) => (showErrors ? localErrors[key] : undefined) ?? errors[key]?.[0];

  function submit() {
    setShowErrors(true);
    if (invalid) return;
    const body: ProductBody = {
      title: title.trim(),
      ...(handle ? { handle } : {}),
      ...(description !== initialDescription ? { description: description.trim() || null } : {}),
      vendor: vendor.trim() || null,
      tags: splitList(tags),
      productTypeId: productTypeId === NONE ? null : productTypeId,
      taxClassId: taxClassId === NONE ? null : taxClassId,
      oversellPolicy: oversell,
      lowStockThreshold: lowStockValue,
      publishAt: fromLocalInput(publishAt),
      categoryIds,
      ...(channelIds ? { channelIds } : {}),
      options: options.map((o) => ({ name: o.name.trim(), values: splitList(o.values) })),
      seo: cleanSeo(seo),
      ...(defs.length
        ? {
            customFields: Object.fromEntries(
              defs.map((d) => [d.key, customFields[d.key] ?? emptyValue(customFieldSchema(d))]),
            ),
          }
        : {}),
    };
    const onError = (error: unknown) => {
      setErrors(fieldErrors(error));
      notifyError(error);
    };
    if (!product) {
      createProduct({ body })
        .unwrap()
        .then((created) => {
          notifySaved(`${created.title} created as a draft`);
          router.push(`/admin/products/${created.id}`);
        }, onError);
    } else {
      updateProduct({ id: product.id, body: { ...body, version: product.version } })
        .unwrap()
        .then((saved) => {
          setErrors({});
          notifySaved(`${saved.title} saved`);
        }, onError);
    }
  }

  const toggle = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Section title="Details">
        <div className="grid gap-6 lg:grid-cols-2">
          <FieldGroup>
            <Field data-invalid={errorFor("title") ? true : undefined}>
              <FieldLabel htmlFor="product-title">Title</FieldLabel>
              <Input
                id="product-title"
                value={title}
                disabled={readOnly}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={250}
              />
              <FieldError>{errorFor("title")}</FieldError>
            </Field>
            <Field data-invalid={errorFor("handle") ? true : undefined}>
              <FieldLabel htmlFor="product-handle">Handle</FieldLabel>
              <Input
                id="product-handle"
                value={handle}
                disabled={readOnly}
                className="font-mono"
                placeholder={product ? undefined : "Made from the title if left empty"}
                onChange={(e) => setHandle(e.target.value.trim())}
              />
              <FieldDescription>
                {product
                  ? "Part of the product URL. Changing it redirects the old URL to the new one."
                  : "Part of the product URL."}
              </FieldDescription>
              <FieldError>{errorFor("handle")}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="product-description">Description</FieldLabel>
              <Textarea
                id="product-description"
                rows={6}
                value={description}
                disabled={readOnly}
                onChange={(e) => setDescription(e.target.value)}
              />
              {richDescription && (
                <FieldDescription>
                  This product has rich content from an import. Typing here replaces it with plain text.
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="product-vendor">Vendor</FieldLabel>
                <Input
                  id="product-vendor"
                  value={vendor}
                  disabled={readOnly}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="product-tags">Tags</FieldLabel>
                <Input
                  id="product-tags"
                  value={tags}
                  disabled={readOnly}
                  placeholder="sale, new-in"
                  onChange={(e) => setTags(e.target.value)}
                />
                <FieldDescription>Separate with commas.</FieldDescription>
              </Field>
              {productTypes.data && (
                <Field>
                  <FieldLabel htmlFor="product-type">Product type</FieldLabel>
                  <Select
                    value={productTypeId}
                    onValueChange={(v) => setProductTypeId(String(v ?? NONE))}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="product-type" className="w-full">
                      <SelectValue>{productTypes.data.find((t) => t.id === productTypeId)?.name ?? "None"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {productTypes.data.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {taxClasses.data && (
                <Field>
                  <FieldLabel htmlFor="product-tax">Tax class</FieldLabel>
                  <Select
                    value={taxClassId}
                    onValueChange={(v) => setTaxClassId(String(v ?? NONE))}
                    disabled={readOnly}
                  >
                    <SelectTrigger id="product-tax" className="w-full">
                      <SelectValue>
                        {taxClasses.data.find((t) => t.id === taxClassId)?.name ?? "Standard (no class)"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Standard (no class)</SelectItem>
                      {taxClasses.data.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="product-oversell">When out of stock</FieldLabel>
                <Select value={oversell} onValueChange={(v) => setOversell(v as Oversell)} disabled={readOnly}>
                  <SelectTrigger id="product-oversell" className="w-full">
                    <SelectValue>{OVERSELL.find((o) => o.value === oversell)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {OVERSELL.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={errorFor("lowStockThreshold") ? true : undefined}>
                <FieldLabel htmlFor="product-low-stock">Low-stock threshold</FieldLabel>
                <Input
                  id="product-low-stock"
                  inputMode="numeric"
                  value={lowStock}
                  disabled={readOnly}
                  placeholder="Store default"
                  onChange={(e) => setLowStock(e.target.value)}
                />
                <FieldError>{errorFor("lowStockThreshold")}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="product-publish-at">Publish date (optional)</FieldLabel>
              <Input
                id="product-publish-at"
                type="datetime-local"
                className="w-full sm:w-64"
                value={publishAt}
                disabled={readOnly}
                onChange={(e) => setPublishAt(e.target.value)}
              />
              <FieldDescription>
                With a future date, a published product stays hidden until then and goes live automatically within a few
                minutes of that time. Leave empty to go live as soon as it&apos;s published.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      </Section>

      <Section title="Organization" description="Where the product appears in the storefront.">
        <div className="grid gap-6 lg:grid-cols-2">
          <FieldSet>
            <FieldLegend variant="label">Categories</FieldLegend>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              {categories.isLoading && <Skeleton className="h-5 w-40" />}
              {categories.data?.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
              {categories.data?.map((c) => (
                <Field key={c.id} orientation="horizontal">
                  <Checkbox
                    id={`product-cat-${c.id}`}
                    checked={categoryIds.includes(c.id)}
                    disabled={readOnly}
                    onCheckedChange={(on) => setCategoryIds((list) => toggle(list, c.id, !!on))}
                  />
                  <FieldLabel htmlFor={`product-cat-${c.id}`} className="font-normal">
                    {c.name}
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>
          {channels.data && (
            <FieldSet>
              <FieldLegend variant="label">Sales channels</FieldLegend>
              <FieldDescription>Channels where the product can be sold.</FieldDescription>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {channels.data.map((c) => (
                  <Field key={c.id} orientation="horizontal" className="w-auto">
                    <Checkbox
                      id={`product-channel-${c.id}`}
                      checked={(channelIds ?? []).includes(c.id)}
                      disabled={readOnly}
                      onCheckedChange={(on) => setChannelIds((list) => toggle(list ?? [], c.id, !!on))}
                    />
                    <FieldLabel htmlFor={`product-channel-${c.id}`} className="font-normal">
                      {c.name}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </FieldSet>
          )}
        </div>
      </Section>

      <Section
        title="Options"
        description="Up to three, such as Color or Size. Variants are combinations of their values."
        actions={
          !readOnly &&
          options.length < 3 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOptions((list) => [...list, { name: "", values: "" }])}
            >
              <PlusIcon /> Add option
            </Button>
          )
        }
      >
        {options.length === 0 && (
          <p className="text-sm text-muted-foreground">No options: the product has a single variant.</p>
        )}
        <div className="space-y-3">
          {options.map((o, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
              <Field>
                <FieldLabel htmlFor={`option-name-${i}`}>Name</FieldLabel>
                <Input
                  id={`option-name-${i}`}
                  value={o.name}
                  disabled={readOnly}
                  maxLength={50}
                  onChange={(e) =>
                    setOptions((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`option-values-${i}`}>Values</FieldLabel>
                <Input
                  id={`option-values-${i}`}
                  value={o.values}
                  disabled={readOnly}
                  placeholder="Red, Blue, Green"
                  onChange={(e) =>
                    setOptions((list) => list.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))
                  }
                />
              </Field>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove option ${o.name || i + 1}`}
                  onClick={() => setOptions((list) => list.filter((_, j) => j !== i))}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          ))}
          {errorFor("options") && <p className="text-sm text-destructive">{errorFor("options")}</p>}
        </div>
      </Section>

      <Section title="Search engines" description="How the product shows up in search results and when shared.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="seo-title">Page title</FieldLabel>
            <Input
              id="seo-title"
              value={seo.title ?? ""}
              maxLength={200}
              disabled={readOnly}
              placeholder={title}
              onChange={(e) => setSeo({ ...seo, title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="seo-canonical">Canonical URL</FieldLabel>
            <Input
              id="seo-canonical"
              value={seo.canonical ?? ""}
              disabled={readOnly}
              onChange={(e) => setSeo({ ...seo, canonical: e.target.value })}
            />
          </Field>
          <Field className="lg:col-span-2">
            <FieldLabel htmlFor="seo-description">Meta description</FieldLabel>
            <Textarea
              id="seo-description"
              rows={2}
              maxLength={500}
              value={seo.description ?? ""}
              disabled={readOnly}
              onChange={(e) => setSeo({ ...seo, description: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="seo-og">Share image URL</FieldLabel>
            <Input
              id="seo-og"
              value={seo.ogImage ?? ""}
              disabled={readOnly}
              onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })}
            />
          </Field>
          <Field orientation="horizontal" className="self-end">
            <Switch
              id="seo-noindex"
              checked={!!seo.noindex}
              disabled={readOnly}
              onCheckedChange={(on) => setSeo({ ...seo, noindex: on })}
            />
            <FieldLabel htmlFor="seo-noindex">Hide from search engines</FieldLabel>
          </Field>
        </div>
      </Section>

      {defs.length > 0 && (
        <Section title="Custom fields" description="Extra product data defined in Settings.">
          <FieldGroup className="grid gap-4 lg:grid-cols-2">
            {defs.map((d) => {
              const schema = customFieldSchema(d);
              const error = showErrors ? customErrors[d.key] : (errors[`customFields.${d.key}`]?.[0] ?? undefined);
              return (
                <SchemaField
                  key={d.id}
                  schema={schema}
                  label={d.label}
                  description={d.storefrontVisible ? "Shown on the storefront" : undefined}
                  value={customFields[d.key] ?? emptyValue(schema)}
                  onChange={(v) => setCustomFields((cf) => ({ ...cf, [d.key]: v }))}
                  errors={error ? { "": error } : {}}
                  disabled={readOnly}
                />
              );
            })}
          </FieldGroup>
        </Section>
      )}

      {errors._form && (
        <Alert variant="destructive">
          <AlertDescription>{errors._form[0]}</AlertDescription>
        </Alert>
      )}
      {!readOnly && (
        <div className="flex justify-end gap-2">
          {showErrors && invalid && <p className="self-center text-sm text-destructive">Fix the highlighted fields.</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : product ? "Save product" : "Create draft"}
          </Button>
        </div>
      )}
    </form>
  );
}
