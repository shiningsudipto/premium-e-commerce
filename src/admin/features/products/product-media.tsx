"use client";

import { useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, ImagePlusIcon, UploadIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { errorCode } from "../../store/api-errors";
import {
  useGetV1AdminMediaQuery,
  usePostV1AdminMediaMutation,
  usePostV1AdminMediaUploadUrlMutation,
  usePutV1AdminProductsIdMediaMutation,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { notifyError, notifySaved } from "../../lib/notify";
import { moveItem, type Product } from "./product-form";
import { Section } from "./section";

type Item = { mediaId: string; url: string; alt: string | null; mimeType: string; variantIds: string[] };

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml,video/mp4,video/webm";

function Thumb({ url, alt, mimeType }: { url: string; alt: string | null; mimeType: string }) {
  if (!mimeType.startsWith("image/")) {
    return (
      <span className="grid size-full place-items-center bg-muted text-xs text-muted-foreground">
        {mimeType.split("/")[1]}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
  return <img src={url} alt={alt ?? ""} className="size-full object-cover" />;
}

// Image dimensions for the media record, read in the browser before upload.
function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return Promise.resolve({});
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Product media (spec §3.9): ordered, the first one is the main image. Files upload straight to
// storage through a signed URL; without storage configured, media already in the library can
// still be added and reordered.
export function MediaCard({ product }: { product: Product }) {
  const canWrite = useCan("products.write");
  const canUpload = useCan("media.write");
  const saved: Item[] = product.media.map((m) => ({
    mediaId: m.media.id,
    url: m.media.url,
    alt: m.media.alt,
    mimeType: m.media.mimeType,
    variantIds: m.variantIds,
  }));
  const savedKey = JSON.stringify(saved.map((i) => i.mediaId));
  const [draft, setDraft] = useState<{ key: string; items: Item[] }>({ key: savedKey, items: saved });
  // a refetch (after saving here or elsewhere) replaces an untouched draft
  const items = draft.key === savedKey ? draft.items : saved;
  const setItems = (next: Item[]) => setDraft({ key: savedKey, items: next });
  const dirty = JSON.stringify(items.map((i) => i.mediaId)) !== savedKey;

  const [storageMissing, setStorageMissing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [getUploadUrl] = usePostV1AdminMediaUploadUrlMutation();
  const [recordMedia] = usePostV1AdminMediaMutation();
  const [saveMedia, save] = usePutV1AdminProductsIdMediaMutation();

  const add = (item: Item) => {
    if (!items.some((i) => i.mediaId === item.mediaId)) setItems([...items, item]);
  };

  async function upload(file: File) {
    setUploading(true);
    try {
      const target = await getUploadUrl({
        body: { filename: file.name, mimeType: file.type, sizeBytes: file.size },
      }).unwrap();
      // the file goes to storage, not to the API
      const put = await fetch(target.uploadUrl, { method: "PUT", headers: target.headers, body: file });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      const media = await recordMedia({
        body: { key: target.key, mimeType: file.type, sizeBytes: file.size, ...(await imageSize(file)) },
      }).unwrap();
      add({ mediaId: media.id, url: media.url, alt: media.alt, mimeType: media.mimeType, variantIds: [] });
      notifySaved(`${file.name} uploaded. Save media to attach it.`);
    } catch (error) {
      if (errorCode(error) === "STORAGE_NOT_CONFIGURED") setStorageMissing(true);
      else notifyError(error instanceof Error ? { data: { code: "UPLOAD", message: error.message } } : error);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Section
      title="Media"
      description="The first item is the main image on listings and the product page."
      actions={
        canWrite && (
          <>
            <LibraryPicker onPick={add} selected={items.map((i) => i.mediaId)} />
            {canUpload && !storageMissing && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  aria-label="Upload a file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInput.current?.click()}>
                  <UploadIcon /> {uploading ? "Uploading…" : "Upload"}
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {storageMissing && (
        <Alert className="mb-4">
          <AlertTitle>File uploads aren&apos;t available</AlertTitle>
          <AlertDescription>
            Storage isn&apos;t configured for this environment. You can still pick and reorder media already in the
            library.
          </AlertDescription>
        </Alert>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item, i) => (
            <li key={item.mediaId} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-md border">
                <Thumb {...item} />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                    Main
                  </span>
                )}
              </div>
              {canWrite && (
                <div className="flex justify-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Move earlier"
                    disabled={i === 0}
                    onClick={() => setItems(moveItem(items, i, i - 1))}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Move later"
                    disabled={i === items.length - 1}
                    onClick={() => setItems(moveItem(items, i, i + 1))}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Remove from product"
                    onClick={() => setItems(items.filter((x) => x.mediaId !== item.mediaId))}
                  >
                    <XIcon />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {canWrite && dirty && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setItems(saved)}>
            Discard
          </Button>
          <Button
            size="sm"
            disabled={save.isLoading}
            onClick={() =>
              saveMedia({
                id: product.id,
                body: { items: items.map((i) => ({ mediaId: i.mediaId, variantIds: i.variantIds })) },
              })
                .unwrap()
                .then(() => notifySaved("Media saved"), notifyError)
            }
          >
            {save.isLoading ? "Saving…" : "Save media"}
          </Button>
        </div>
      )}
    </Section>
  );
}

function LibraryPicker({ onPick, selected }: { onPick: (item: Item) => void; selected: string[] }) {
  const [open, setOpen] = useState(false);
  const pages = useCursorPages();
  const media = useGetV1AdminMediaQuery(
    { limit: 24, ...(pages.cursor ? { cursor: pages.cursor } : {}) },
    { skip: !open },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <ImagePlusIcon /> Add from library
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Pick items to add to this product, then save media.</DialogDescription>
        </DialogHeader>
        {media.isLoading && <Skeleton className="h-40 w-full" />}
        {media.data?.items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            <ImageIcon className="mx-auto mb-2 size-5" aria-hidden />
            The library is empty.
          </p>
        )}
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {media.data?.items.map((m) => {
            const picked = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                disabled={picked}
                aria-label={picked ? `${m.alt ?? m.key} (added)` : `Add ${m.alt ?? m.key}`}
                onClick={() => onPick({ mediaId: m.id, url: m.url, alt: m.alt, mimeType: m.mimeType, variantIds: [] })}
                className="aspect-square overflow-hidden rounded-md border outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <Thumb url={m.url} alt={m.alt} mimeType={m.mimeType} />
              </button>
            );
          })}
        </div>
        {(pages.hasPrevious || media.data?.nextCursor) && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={!pages.hasPrevious} onClick={pages.previous}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!media.data?.nextCursor}
              onClick={() => pages.next(media.data?.nextCursor)}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
