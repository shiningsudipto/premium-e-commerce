"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetV1AdminCustomerGroupsQuery,
  useGetV1AdminCustomersIdExportQuery,
  usePatchV1AdminCustomersIdMutation,
  usePostV1AdminCustomersIdAnonymizeMutation,
  type GetV1AdminCustomersIdApiResponse,
} from "../../store/api.generated";
import { notifyError, notifySaved } from "../../lib/notify";
import { addTags, confirmationMatches, confirmationPhrase, exportFileName, MAX_TAG_LENGTH, sameTags } from "./tags";

type Customer = GetV1AdminCustomersIdApiResponse;

const NO_GROUP = "none";

// Tags and customer group (spec §6.6), for staff with customers.write. Saved together with the
// customer's version, so a concurrent edit is reported instead of overwritten.
export function CustomerTagsGroup({ customer }: { customer: Customer }) {
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const [tags, setTags] = useState(customer.tags);
  const [groupId, setGroupId] = useState<string>(customer.groupId ?? NO_GROUP);
  const [typed, setTyped] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [patch, patching] = usePatchV1AdminCustomersIdMutation();
  const dirty = !sameTags(tags, customer.tags) || (groupId === NO_GROUP ? null : groupId) !== customer.groupId;
  const groupName = (id: string) =>
    id === NO_GROUP ? "No group" : (groups.data?.find((g) => g.id === id)?.name ?? "Unknown group");

  function commitTyped() {
    if (!typed.trim()) return;
    const result = addTags(tags, typed);
    setTags(result.tags);
    setTyped("");
    setTagError(
      result.rejected.length
        ? `Not added: ${result.rejected.join(", ")} (tags are up to ${MAX_TAG_LENGTH} characters, 50 at most)`
        : null,
    );
  }

  function save() {
    const pending = typed.trim() ? addTags(tags, typed).tags : tags;
    patch({
      id: customer.id,
      body: { version: customer.version, tags: pending, groupId: groupId === NO_GROUP ? null : groupId },
    })
      .unwrap()
      .then(() => {
        setTyped("");
        notifySaved("Tags and group saved");
      }, notifyError);
  }

  return (
    <section aria-labelledby="customer-segmenting" className="space-y-3 rounded-lg border bg-card p-4">
      <h2 id="customer-segmenting" className="text-sm font-medium">
        Tags and group
      </h2>
      <Field>
        <FieldLabel htmlFor="customer-group">Customer group</FieldLabel>
        <Select value={groupId} onValueChange={(v) => setGroupId(String(v ?? NO_GROUP))}>
          <SelectTrigger id="customer-group" className="w-full">
            <SelectValue>{groupName(groupId)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_GROUP}>No group</SelectItem>
            {groups.data?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Groups decide which price list applies.</FieldDescription>
      </Field>
      <Field data-invalid={tagError ? true : undefined}>
        <FieldLabel htmlFor="customer-tag-input">Tags</FieldLabel>
        {tags.length > 0 && (
          <ul aria-label="Current tags" className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <li key={t}>
                <Badge variant="outline" className="gap-0.5 pr-0.5">
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove tag ${t}`}
                    className="rounded-sm p-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <Input
          id="customer-tag-input"
          value={typed}
          placeholder="Add tags, separated by commas"
          aria-describedby="customer-tag-hint"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTyped();
            }
          }}
          onBlur={commitTyped}
        />
        <FieldDescription id="customer-tag-hint">Press Enter to add. Segments can match on tags.</FieldDescription>
        <FieldError>{tagError}</FieldError>
      </Field>
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTags(customer.tags);
              setGroupId(customer.groupId ?? NO_GROUP);
              setTagError(null);
            }}
          >
            Discard
          </Button>
        )}
        <Button size="sm" disabled={(!dirty && !typed.trim()) || patching.isLoading} onClick={save}>
          {patching.isLoading ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}

function downloadJson(data: unknown, fileName: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Data subject requests (spec §5.8, §12.4): export everything held about the customer, or
// anonymize them now. Anonymizing can't be undone, so it asks for the email to be typed.
export function CustomerPrivacy({ customer }: { customer: Customer }) {
  const [requested, setRequested] = useState(false);
  const exported = useGetV1AdminCustomersIdExportQuery(
    { id: customer.id },
    { skip: !requested, refetchOnMountOrArgChange: true },
  );
  // set by a click; only a result fetched for a click is downloaded (not background refetches
  // after other customer edits)
  const pending = useRef(false);
  const downloadedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!pending.current || exported.isFetching) return;
    if (exported.isError) {
      pending.current = false;
      notifyError(exported.error);
      return;
    }
    if (!exported.data || exported.fulfilledTimeStamp === downloadedAt.current) return;
    pending.current = false;
    downloadedAt.current = exported.fulfilledTimeStamp;
    downloadJson(exported.data, exportFileName(customer.id));
    notifySaved("Customer data exported");
  }, [exported.data, exported.isFetching, exported.isError, exported.error, exported.fulfilledTimeStamp, customer.id]);

  return (
    <section aria-labelledby="customer-privacy" className="space-y-3 rounded-lg border bg-card p-4">
      <h2 id="customer-privacy" className="text-sm font-medium">
        Privacy
      </h2>
      <p className="text-xs text-muted-foreground">
        For data requests: export everything the store holds about this customer as JSON, or remove their personal data.
        Orders are kept for accounting either way.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={exported.isFetching}
          onClick={() => {
            pending.current = true;
            if (requested) exported.refetch();
            else setRequested(true);
          }}
        >
          <DownloadIcon /> {exported.isFetching ? "Exporting…" : "Export data"}
        </Button>
        {!customer.anonymizedAt && <AnonymizeDialog customer={customer} />}
      </div>
    </section>
  );
}

function AnonymizeDialog({ customer }: { customer: Customer }) {
  const phrase = confirmationPhrase(customer.email);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [anonymize, anonymizing] = usePostV1AdminCustomersIdAnonymizeMutation();
  const confirmed = confirmationMatches(typed, phrase);
  const reasonValid = reason.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTyped("");
          setReason("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="destructive">
            <ShieldAlertIcon /> Anonymize
          </Button>
        }
      />
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmed || !reasonValid) return;
            anonymize({ id: customer.id, body: { reason: reason.trim() } })
              .unwrap()
              .then(() => {
                notifySaved("Customer anonymized");
                setOpen(false);
              }, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>Anonymize this customer?</DialogTitle>
            <DialogDescription>
              Their name, email, phone, addresses and account are removed for good and they&apos;re signed out. Orders
              stay, without personal details. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={reason && !reasonValid ? true : undefined}>
            <FieldLabel htmlFor="anonymize-reason">Reason</FieldLabel>
            <Textarea
              id="anonymize-reason"
              value={reason}
              rows={2}
              maxLength={500}
              placeholder="e.g. Deletion request by email on 3 March"
              onChange={(e) => setReason(e.target.value)}
            />
            <FieldDescription>Recorded in the audit log.</FieldDescription>
            {reason && !reasonValid && <FieldError>At least 3 characters</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="anonymize-confirm">
              Type <span className="font-mono font-semibold">{phrase}</span> to confirm
            </FieldLabel>
            <Input
              id="anonymize-confirm"
              value={typed}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" variant="destructive" disabled={!confirmed || !reasonValid || anonymizing.isLoading}>
              {anonymizing.isLoading ? "Anonymizing…" : "Anonymize customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
