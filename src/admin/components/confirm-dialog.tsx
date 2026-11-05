"use client";

import { useState, type ReactElement } from "react";
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

// Asks before an action that's hard to undo; stays open while the action runs.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setPending(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
