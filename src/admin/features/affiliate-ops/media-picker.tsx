"use client";

import { useId, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetV1AdminMediaQuery } from "../../store/api.generated";
import { useCan } from "../../components/can";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";

type Picked = { id: string; url: string; alt: string | null };

// A media ID, typed or picked from the library (browsing the library needs products.read).
// Same approach as the page editor's media field.
export function MediaPicker({
  value,
  preview,
  onChange,
  error,
}: {
  value: string;
  preview: string | null;
  onChange: (id: string, url: string | null) => void;
  error?: string;
}) {
  const id = useId();
  const canBrowse = useCan("products.read");
  const [open, setOpen] = useState(false);
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>File</FieldLabel>
      <div className="flex items-center gap-2">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host
          <img src={preview} alt="" className="size-9 shrink-0 rounded-md border object-cover" />
        )}
        <Input
          id={id}
          className="font-mono"
          value={value}
          placeholder="Media ID"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value.trim(), null)}
        />
        {canBrowse && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button type="button" variant="outline" size="sm">
                  <ImageIcon /> Choose
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choose from the media library</DialogTitle>
                <DialogDescription>Upload new files from a product&apos;s media section.</DialogDescription>
              </DialogHeader>
              {open && (
                <MediaGrid
                  selected={value}
                  onPick={(m) => {
                    onChange(m.id, m.url);
                    setOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>
      <FieldDescription>
        {canBrowse ? "Pick an image, or paste a media ID." : "Paste the ID of an item in the media library."}
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}

function MediaGrid({ selected, onPick }: { selected: string; onPick: (m: Picked) => void }) {
  const pages = useCursorPages();
  const media = useGetV1AdminMediaQuery({ limit: 24, ...(pages.cursor ? { cursor: pages.cursor } : {}) });
  const images = media.data?.items.filter((m) => m.mimeType.startsWith("image/"));
  return (
    <>
      {media.isLoading && <Skeleton className="h-40 w-full" />}
      {images?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No images here.</p>}
      <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
        {images?.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={`${m.alt ?? m.key}${m.id === selected ? " (selected)" : ""}`}
            aria-pressed={m.id === selected}
            onClick={() => onPick({ id: m.id, url: m.url, alt: m.alt })}
            className="aspect-square overflow-hidden rounded-md border outline-none hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- media URLs come from any storage host */}
            <img src={m.url} alt="" className="size-full object-cover" />
          </button>
        ))}
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
    </>
  );
}
