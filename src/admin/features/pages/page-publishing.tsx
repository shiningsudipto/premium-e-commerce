"use client";

import { useState } from "react";
import { CopyIcon, ExternalLinkIcon, HistoryIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { fromLocalDateTime, toLocalDateTime } from "../../components/json-schema-form/schema";
import { formatDateTime } from "../../lib/format";
import { notifyError } from "../../lib/notify";
import {
  useGetV1AdminMarketsQuery,
  useGetV1AdminPagesIdVersionsQuery,
  usePostV1AdminPagesIdPreviewLinkMutation,
  usePostV1AdminPagesIdRollbackMutation,
  type GetV1AdminPagesIdApiResponse,
} from "../../store/api.generated";
import { marketSegments, previewPath } from "./block-tree";
import { Section } from "../products/section";

export type AdminPage = GetV1AdminPagesIdApiResponse;

// Publish now, with an optional note kept on the version.
export function PublishDialog({
  page,
  dirty,
  disabled,
  onPublish,
}: {
  page: AdminPage;
  dirty: boolean;
  disabled: boolean;
  onPublish: (note: string | undefined) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setNote("");
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" disabled={disabled}>
            Publish
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              if (await onPublish(note.trim() || undefined)) setOpen(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Publish {page.title}?</DialogTitle>
            <DialogDescription>
              {dirty ? "Your changes are saved first. " : ""}
              The draft becomes version {(page.published?.number ?? 0) + 1}
              {page.kind === "PAGE"
                ? ` and goes live at /pages/${page.handle}`
                : " and shows wherever the section is used"}
              {page.publishAt ? ". This replaces the scheduled publish." : "."}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="publish-note">Note (optional)</FieldLabel>
            <Input
              id="publish-note"
              value={note}
              maxLength={200}
              placeholder="e.g. Summer sale banner"
              onChange={(e) => setNote(e.target.value)}
            />
            <FieldDescription>Shown in the version history.</FieldDescription>
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending}>
              {pending ? "Publishing…" : "Publish now"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Schedule the draft to publish itself later (the API's scheduler picks it up within minutes).
export function ScheduleDialog({
  page,
  disabled,
  onSchedule,
}: {
  page: AdminPage;
  disabled: boolean;
  onSchedule: (publishAt: string | null) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(toLocalDateTime(page.publishAt));
  const [pending, setPending] = useState(false);
  const iso = fromLocalDateTime(when);
  const inFuture = !!iso && new Date(iso) > new Date();
  const run = async (value: string | null) => {
    setPending(true);
    try {
      if (await onSchedule(value)) setOpen(false);
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setWhen(toLocalDateTime(page.publishAt));
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={disabled}>
            {page.publishAt ? "Change schedule" : "Schedule"}
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (inFuture) void run(iso!);
          }}
        >
          <DialogHeader>
            <DialogTitle>Schedule publishing</DialogTitle>
            <DialogDescription>
              The draft as saved now is published automatically at this time (within a few minutes). Scheduling also
              saves your current changes.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={when && !inFuture ? true : undefined}>
            <FieldLabel htmlFor="schedule-at">Publish at (your local time)</FieldLabel>
            <Input
              id="schedule-at"
              type="datetime-local"
              className="w-full sm:w-64"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            {when && !inFuture && <p className="text-sm text-destructive">Choose a time in the future.</p>}
          </Field>
          <DialogFooter>
            {page.publishAt && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => void run(null)}>
                Cancel schedule
              </Button>
            )}
            <Button type="submit" disabled={pending || !inFuture}>
              {pending ? "Saving…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// A shareable, expiring link to the saved draft on the storefront (app/api/preview).
export function PreviewDialog({
  page,
  dirty,
  disabled,
  onSave,
}: {
  page: AdminPage;
  dirty: boolean;
  disabled: boolean;
  onSave: () => Promise<boolean>;
}) {
  const canMarkets = useCan("settings.read");
  const markets = useGetV1AdminMarketsQuery({}, { skip: !canMarkets });
  const segments = marketSegments(markets.data ?? []);
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState<string>("");
  const [hours, setHours] = useState("24");
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [createLink, link] = usePostV1AdminPagesIdPreviewLinkMutation();
  const chosen = segment || segments[0] || "";
  const hoursValue = Number(hours);
  const hoursValid = Number.isInteger(hoursValue) && hoursValue >= 1 && hoursValue <= 168;

  async function generate() {
    if (dirty && !(await onSave())) return;
    createLink({ id: page.id, body: { hours: hoursValue } })
      .unwrap()
      .then((res) => {
        setUrl(new URL(previewPath(res, chosen || null), window.location.origin).toString());
        setExpiresAt(res.expiresAt);
      }, notifyError);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setUrl(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" disabled={disabled}>
            <LinkIcon /> Preview
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview the draft</DialogTitle>
          <DialogDescription>
            Anyone with the link can see the saved draft until it expires. The live page doesn&apos;t change.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {segments.length > 0 && (
            <Field>
              <FieldLabel htmlFor="preview-market">Market</FieldLabel>
              <Select value={chosen} onValueChange={(v) => setSegment(String(v ?? ""))}>
                <SelectTrigger id="preview-market" className="w-full sm:w-56">
                  <SelectValue>{chosen}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {segments.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field data-invalid={hoursValid ? undefined : true}>
            <FieldLabel htmlFor="preview-hours">Expires after (hours)</FieldLabel>
            <Input
              id="preview-hours"
              type="number"
              min={1}
              max={168}
              className="w-full font-mono sm:w-32"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <FieldDescription>1–168 hours.</FieldDescription>
          </Field>
        </FieldGroup>
        {url && (
          <div className="space-y-2 rounded-md border bg-muted/40 p-3">
            <Input readOnly aria-label="Preview link" value={url} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Expires {formatDateTime(expiresAt)}</p>
            <div className="flex flex-wrap gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
                <ExternalLinkIcon /> Open preview
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  navigator.clipboard.writeText(url).then(
                    () => toast.success("Preview link copied"),
                    () => toast.error("Couldn't copy. Select the link and copy it instead."),
                  )
                }
              >
                <CopyIcon /> Copy link
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          {dirty && <p className="self-center text-xs text-muted-foreground">Your changes are saved first.</p>}
          <Button type="button" disabled={link.isLoading || !hoursValid} onClick={() => void generate()}>
            {link.isLoading ? "Creating…" : url ? "Create a new link" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Published versions, newest first; rolling back republishes an earlier one as a new version.
export function VersionsCard({ page, canWrite, dirty }: { page: AdminPage; canWrite: boolean; dirty: boolean }) {
  const versions = useGetV1AdminPagesIdVersionsQuery({ id: page.id });
  const [rollback] = usePostV1AdminPagesIdRollbackMutation();
  return (
    <Section title="Versions" description="Every publish is kept. Roll back to republish an earlier version.">
      {versions.isLoading && <Skeleton className="h-16 w-full" />}
      {versions.data?.length === 0 && <p className="text-sm text-muted-foreground">Not published yet.</p>}
      <ol className="divide-y">
        {versions.data?.map((v) => {
          const current = v.id === page.publishedVersionId;
          return (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  Version {v.number}
                  {current && page.status === "ACTIVE" && <Badge>Live</Badge>}
                  {current && page.status !== "ACTIVE" && <Badge variant="outline">Last published</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(v.createdAt)}
                  {v.title !== page.title ? ` · “${v.title}”` : ""}
                  {v.note ? ` · ${v.note}` : ""}
                </p>
              </div>
              {canWrite && !current && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline">
                      <HistoryIcon /> Roll back
                    </Button>
                  }
                  title={`Roll back to version ${v.number}?`}
                  description={`Version ${v.number} replaces the draft and is published right away as a new version.${
                    dirty ? " Your unsaved changes in the editor are discarded." : ""
                  }`}
                  confirmLabel="Roll back and publish"
                  onConfirm={() =>
                    rollback({ id: page.id, body: { versionId: v.id } })
                      .unwrap()
                      .then(() => toast.success(`Version ${v.number} is live again`), notifyError)
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
