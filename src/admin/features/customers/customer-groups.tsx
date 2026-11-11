"use client";

import { useState } from "react";
import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, fieldErrors } from "../../store/api-errors";
import { useGetV1AdminCustomerGroupsQuery, usePostV1AdminCustomerGroupsMutation } from "../../store/api.generated";
import { useCan } from "../../components/can";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { slug } from "../products/product-form";

const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Customer groups (spec §6.6): price lists and segments target them. The API lists and creates
// groups; renaming and deleting aren't available yet.
export function CustomerGroupsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UsersIcon /> Groups
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer groups</DialogTitle>
            <DialogDescription>
              Put customers in a group to give them a price list or target them in segments.
            </DialogDescription>
          </DialogHeader>
          <CustomerGroups />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerGroups() {
  const groups = useGetV1AdminCustomerGroupsQuery({});
  const canWrite = useCan("customers.write");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [createGroup, create] = usePostV1AdminCustomerGroupsMutation();
  const handleValid = HANDLE.test(handle);

  return (
    <div className="space-y-4">
      {groups.error ? (
        <p className="text-sm text-destructive">{errorMessage(groups.error)}</p>
      ) : groups.isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : groups.data?.length ? (
        <ul aria-label="Groups" className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
          {groups.data.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{g.name}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">{g.handle}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">Added {formatDateTime(g.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      )}

      {canWrite && (
        <form
          aria-label="New group"
          className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            setShowErrors(true);
            if (!name.trim() || !handleValid) return;
            createGroup({ body: { name: name.trim(), handle } })
              .unwrap()
              .then(
                (g) => {
                  notifySaved(`${g.name} created`);
                  setName("");
                  setHandle("");
                  setShowErrors(false);
                  setErrors({});
                },
                (error: unknown) => {
                  setErrors(fieldErrors(error));
                  notifyError(error);
                },
              );
          }}
        >
          <Field data-invalid={showErrors && !name.trim() ? true : undefined}>
            <FieldLabel htmlFor="group-name">Group name</FieldLabel>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => {
                if (!handle || handle === slug(name)) setHandle(slug(e.target.value));
                setName(e.target.value);
              }}
            />
            {showErrors && !name.trim() && <FieldError>Enter a name</FieldError>}
          </Field>
          <Field data-invalid={(showErrors && !handleValid) || errors.handle ? true : undefined}>
            <FieldLabel htmlFor="group-handle">Handle</FieldLabel>
            <Input
              id="group-handle"
              value={handle}
              className="font-mono"
              onChange={(e) => setHandle(e.target.value.trim())}
            />
            <FieldError>
              {showErrors && !handleValid ? "Lowercase letters, numbers and dashes" : errors.handle?.[0]}
            </FieldError>
          </Field>
          <Button type="submit" size="sm" className="sm:mt-6" disabled={create.isLoading}>
            Add group
          </Button>
        </form>
      )}
    </div>
  );
}
