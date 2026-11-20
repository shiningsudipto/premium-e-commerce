"use client";

import Link from "next/link";
import { useState, type ReactElement } from "react";
import { Trash2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "../../store/api-errors";
import { useDeleteV1AdminPagesIdMutation, useGetV1AdminPagesIdUsageQuery } from "../../store/api.generated";
import { notifyError, notifySaved } from "../../lib/notify";

type PageRef = { id: string; handle: string; title: string; kind: "PAGE" | "SECTION"; status: string };

// Permanent delete of a page or global section. It first checks what still uses it (menus linking
// to it, pages including the section) and lists those to fix; otherwise the handle must be typed
// to confirm, since the page, its versions and translations can't be brought back.
export function DeletePageDialog({
  page,
  trigger,
  onDeleted,
}: {
  page: PageRef;
  trigger: ReactElement;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        {open && (
          <DeleteBody
            page={page}
            onDone={() => {
              setOpen(false);
              onDeleted?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteBody({ page, onDone }: { page: PageRef; onDone: () => void }) {
  const usage = useGetV1AdminPagesIdUsageQuery({ id: page.id }, { refetchOnMountOrArgChange: true });
  const [deletePage, del] = useDeleteV1AdminPagesIdMutation();
  const [typed, setTyped] = useState("");
  const what = page.kind === "SECTION" ? "section" : "page";
  const inUse = !!usage.data && (usage.data.menus.length > 0 || usage.data.pages.length > 0);
  const confirmed = typed.trim() === page.handle;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete {page.title}?</DialogTitle>
        <DialogDescription>
          The {what}, all its published versions and its translations are deleted permanently. This can&apos;t be
          undone. To take it offline but keep it, use Unpublish or Archive instead.
        </DialogDescription>
      </DialogHeader>

      {usage.isLoading && <Skeleton className="h-16 w-full" />}
      {usage.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(usage.error)}</AlertDescription>
        </Alert>
      )}

      {inUse && (
        <Alert variant="destructive">
          <AlertTitle>Still in use</AlertTitle>
          <AlertDescription>
            <p>Remove these links first, or visitors would hit a missing {what}:</p>
            <ul className="mt-1 list-disc pl-5">
              {usage.data!.menus.map((m) => (
                <li key={m.handle}>
                  Menu{" "}
                  <Link href="/admin/menus" className="underline">
                    {m.name}
                  </Link>
                </li>
              ))}
              {usage.data!.pages.map((p) => (
                <li key={p.id}>
                  Page{" "}
                  <Link href={`/admin/pages/${p.id}`} className="underline">
                    {p.title}
                  </Link>{" "}
                  (includes this section)
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {usage.data && !inUse && (
        <div className="space-y-4">
          {page.kind === "PAGE" && page.status === "ACTIVE" && (
            <p className="text-sm text-muted-foreground">
              It&apos;s live now. Old links to <code className="rounded bg-muted px-1">/pages/{page.handle}</code> will
              show “Page not found” unless you add a redirect in{" "}
              <Link href="/admin/redirects" className="underline">
                Redirects
              </Link>
              .
            </p>
          )}
          <Field>
            <FieldLabel htmlFor={`delete-${page.id}`}>
              Type <span className="font-mono">{page.handle}</span> to confirm
            </FieldLabel>
            <Input
              id={`delete-${page.id}`}
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
            <FieldDescription>This makes sure the right {what} is deleted.</FieldDescription>
          </Field>
        </div>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline">Cancel</Button>} />
        <Button
          variant="destructive"
          disabled={!usage.data || inUse || !confirmed || del.isLoading}
          onClick={() =>
            deletePage({ id: page.id })
              .unwrap()
              .then(() => {
                notifySaved(`${page.title} deleted`);
                onDone();
              }, notifyError)
          }
        >
          <Trash2Icon /> {del.isLoading ? "Deleting…" : `Delete ${what}`}
        </Button>
      </DialogFooter>
    </>
  );
}
