"use client";

import { useState } from "react";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteV1AdminAffiliateProgramAssetsIdMutation,
  useGetV1AdminAffiliateProgramAssetsAnalyticsQuery,
  useGetV1AdminAffiliateProgramAssetsQuery,
  usePostV1AdminAffiliateProgramAssetsMutation,
  usePutV1AdminAffiliateProgramAssetsIdMutation,
  type GetV1AdminAffiliateProgramAssetsAnalyticsApiResponse,
  type GetV1AdminAffiliateProgramAssetsApiResponse,
} from "../../store/api.generated";
import { errorMessage } from "../../store/api-errors";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { formatDateTime } from "../../lib/format";
import { DEFAULT_CURRENCY, formatMoney } from "../../lib/money";
import { notifyError, notifySaved } from "../../lib/notify";
import { FormDialog, firstError } from "../affiliates/affiliate-dialogs";
import { MediaPicker } from "./media-picker";
import { AffiliateOpsNav } from "./ops-nav";
import { ASSET_KIND_LABELS, buildAsset, percent, type AssetForm, type AssetKind } from "./ops-logic";

type Asset = GetV1AdminAffiliateProgramAssetsApiResponse[number];
type Stats = GetV1AdminAffiliateProgramAssetsAnalyticsApiResponse[number];

const toForm = (a?: Asset): AssetForm => ({
  title: a?.title ?? "",
  kind: a?.kind ?? "banner",
  mediaId: a?.mediaId ?? "",
  body: a?.body ?? "",
  productId: a?.productId ?? "",
  isActive: a?.isActive ?? true,
});

function AssetDialog({ asset }: { asset?: Asset }) {
  const [create] = usePostV1AdminAffiliateProgramAssetsMutation();
  const [update] = usePutV1AdminAffiliateProgramAssetsIdMutation();
  const [form, setForm] = useState<AssetForm>(() => toForm(asset));
  const [preview, setPreview] = useState<string | null>(asset?.media?.url ?? null);
  const set = (patch: Partial<AssetForm>) => setForm((f) => ({ ...f, ...patch }));
  const idp = asset ? `asset-${asset.id}` : "asset-new";
  return (
    <FormDialog
      wide
      trigger={
        asset ? (
          <Button size="xs" variant="outline" aria-label={`Edit ${asset.title}`}>
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon data-icon="inline-start" /> New asset
          </Button>
        )
      }
      title={asset ? `Edit ${asset.title}` : "New marketing asset"}
      description="Affiliates download assets from their dashboard; each download comes with their tracked link."
      submitLabel={asset ? "Save asset" : "Create asset"}
      onOpen={() => {
        setForm(toForm(asset));
        setPreview(asset?.media?.url ?? null);
      }}
      onSubmit={() => {
        const result = buildAsset(form);
        if (!result.ok) return result.errors;
        const run = asset ? update({ id: asset.id, body: result.body }) : create({ body: result.body });
        return run.unwrap().then(() => notifySaved(asset ? "Asset saved" : "Asset created"));
      }}
    >
      {(errors) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" data-invalid={firstError(errors, "title") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-title`}>Title</FieldLabel>
            <Input
              id={`${idp}-title`}
              value={form.title}
              maxLength={200}
              required
              onChange={(e) => set({ title: e.target.value })}
            />
            <FieldError>{firstError(errors, "title")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idp}-kind`}>Type</FieldLabel>
            <Select value={form.kind} onValueChange={(v) => set({ kind: (v as AssetKind | null) ?? "banner" })}>
              <SelectTrigger id={`${idp}-kind`} className="w-full">
                <SelectValue>{ASSET_KIND_LABELS[form.kind]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ASSET_KIND_LABELS) as AssetKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {ASSET_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={firstError(errors, "productId") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-product`}>Product ID (optional)</FieldLabel>
            <Input
              id={`${idp}-product`}
              className="font-mono"
              value={form.productId}
              onChange={(e) => set({ productId: e.target.value })}
            />
            <FieldDescription>Links from this asset open the product instead of the home page.</FieldDescription>
            <FieldError>{firstError(errors, "productId")}</FieldError>
          </Field>
          <div className="sm:col-span-2">
            <MediaPicker
              value={form.mediaId}
              preview={preview}
              error={firstError(errors, "mediaId")}
              onChange={(mediaId, url) => {
                set({ mediaId });
                setPreview(url);
              }}
            />
          </div>
          <Field className="sm:col-span-2" data-invalid={firstError(errors, "body") ? true : undefined}>
            <FieldLabel htmlFor={`${idp}-body`}>Copy{form.kind === "copy" ? "" : " (optional)"}</FieldLabel>
            <Textarea
              id={`${idp}-body`}
              rows={4}
              maxLength={5000}
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
            />
            <FieldDescription>Suggested text for posts and emails.</FieldDescription>
            <FieldError>{firstError(errors, "body")}</FieldError>
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Switch id={`${idp}-active`} checked={form.isActive} onCheckedChange={(v) => set({ isActive: v })} />
            <FieldLabel htmlFor={`${idp}-active`}>Show to affiliates</FieldLabel>
          </Field>
        </div>
      )}
    </FormDialog>
  );
}

function AssetCard({ asset, stats, canWrite }: { asset: Asset; stats: Stats | undefined; canWrite: boolean }) {
  const [remove] = useDeleteV1AdminAffiliateProgramAssetsIdMutation();
  return (
    <Card size="sm">
      <div className="aspect-[16/9] overflow-hidden border-b bg-muted">
        {asset.media ? (
          // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
          <img src={asset.media.url} alt="" className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-start gap-2 overflow-hidden p-3 text-xs text-muted-foreground">
            <FileTextIcon className="size-4 shrink-0" aria-hidden />
            <p className="line-clamp-5">{asset.body ?? "No preview"}</p>
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="truncate">{asset.title}</span>
          <Badge variant={asset.isActive ? "secondary" : "outline"}>{asset.isActive ? "Shown" : "Hidden"}</Badge>
        </CardTitle>
        <CardDescription>
          {ASSET_KIND_LABELS[asset.kind]}
          {asset.media?.width && asset.media.height ? ` · ${asset.media.width}×${asset.media.height}` : ""} · Updated{" "}
          {formatDateTime(asset.updatedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-4 gap-2 text-center text-xs" aria-label="Last 30 days">
          <div>
            <dt className="text-muted-foreground">Downloads</dt>
            <dd className="font-medium tabular-nums">{stats?.downloads ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Clicks</dt>
            <dd className="font-medium tabular-nums">{stats?.clicks ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Orders</dt>
            <dd className="font-medium tabular-nums">{stats?.conversions ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Conversion</dt>
            <dd className="font-medium tabular-nums">{percent(stats?.conversionRate ?? 0)}</dd>
          </div>
        </dl>
        {!!stats?.revenueMinor && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {formatMoney(stats.revenueMinor, DEFAULT_CURRENCY)} in attributed sales
          </p>
        )}
      </CardContent>
      {canWrite && (
        <CardFooter className="justify-end gap-2">
          <AssetDialog asset={asset} />
          <ConfirmDialog
            trigger={
              <Button size="xs" variant="outline" aria-label={`Delete ${asset.title}`}>
                <Trash2Icon data-icon="inline-start" /> Delete
              </Button>
            }
            title={`Delete ${asset.title}?`}
            description="Affiliates can't download it any more and its numbers disappear from these stats. Links they already shared keep working. To keep the history, edit it and hide it instead."
            confirmLabel="Delete asset"
            destructive
            onConfirm={() =>
              remove({ id: asset.id })
                .unwrap()
                .then(() => notifySaved("Asset deleted"), notifyError)
            }
          />
        </CardFooter>
      )}
    </Card>
  );
}

// Marketing asset library (spec §7.7): banners, product images and copy for affiliates, with
// downloads, clicks and conversions over the last 30 days.
export function AssetsScreen() {
  const canWrite = useCan("affiliates.assets.write");
  const assets = useGetV1AdminAffiliateProgramAssetsQuery({});
  const analytics = useGetV1AdminAffiliateProgramAssetsAnalyticsQuery({});
  return (
    <>
      <PageHeader
        title="Marketing assets"
        description="Banners, product images and ready-made copy affiliates can use. Numbers cover the last 30 days."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <AffiliateOpsNav current="assets" />
            {canWrite && <AssetDialog />}
          </div>
        }
      />
      {assets.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(assets.error)}</AlertDescription>
        </Alert>
      ) : !assets.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : assets.data.length === 0 ? (
        <p className="rounded-lg border bg-card py-10 text-center text-sm text-muted-foreground">
          No marketing assets yet.
        </p>
      ) : (
        <>
          {analytics.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Asset statistics couldn&apos;t be loaded: {errorMessage(analytics.error)}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.data.map((a) => (
              <AssetCard key={a.id} asset={a} stats={analytics.data?.find((s) => s.id === a.id)} canWrite={canWrite} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
