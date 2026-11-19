"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Shows a secret the API returns only once (an API key, a webhook signing secret). It can't be
// dismissed by accident: closing needs the "I've stored it" box ticked. Generic, so the webhooks
// console uses it too.
export function OneTimeSecretDialog({
  title,
  description,
  label,
  secret,
  onClose,
}: {
  title: string;
  description: string;
  label: string;
  secret: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [stored, setStored] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && stored && onClose()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Alert>
          <TriangleAlertIcon aria-hidden />
          <AlertDescription>
            Copy it now and keep it somewhere safe. You won&apos;t see it again; if it&apos;s lost, issue a new one.
          </AlertDescription>
        </Alert>
        <Field>
          <FieldLabel htmlFor="one-time-secret">{label}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="one-time-secret"
              readOnly
              value={secret}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copied ? "Copied to the clipboard" : ""}
          </span>
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="one-time-secret-stored" checked={stored} onCheckedChange={(on) => setStored(!!on)} />
          <FieldLabel htmlFor="one-time-secret-stored" className="font-normal">
            I&apos;ve stored it safely
          </FieldLabel>
        </Field>
        <DialogFooter>
          <Button type="button" disabled={!stored} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
