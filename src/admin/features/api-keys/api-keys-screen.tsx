"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { BanIcon, PlusIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  useGetV1AdminApiKeysQuery,
  useGetV1AdminPermissionsQuery,
  usePostV1AdminApiKeysIdRevokeMutation,
  usePostV1AdminApiKeysMutation,
} from "../../store/api.generated";
import { useMe } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { humanize } from "../../components/json-schema-form/schema";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";
import { ALL } from "../../lib/permissions";
import {
  confirmsRevoke,
  EXPIRY_CHOICES,
  groupState,
  KEY_STATUS,
  keyBody,
  keyStatus,
  MAX_NAME,
  scopeGroups,
  toggleScope,
  toggleScopeGroup,
  validateKey,
  type ApiKey,
  type ExpiryChoice,
  type KeyErrors,
  type KeyForm,
} from "./api-key-logic";
import { OneTimeSecretDialog } from "./one-time-secret";

// API keys (spec §11.4): for integrations (a 3PL, an ERP). Each key carries a subset of staff
// permissions as scopes; the full key is shown once, only its prefix afterwards.
export function ApiKeysScreen() {
  const keys = useGetV1AdminApiKeysQuery({});
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; secret: string } | null>(null);

  const columns: ColumnDef<ApiKey>[] = [
    {
      header: "Key",
      cell: ({ row: { original: k } }) => (
        <div className="space-y-0.5">
          <p className="font-medium">{k.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{k.prefix}…</p>
        </div>
      ),
    },
    {
      header: "Scopes",
      cell: ({ row: { original: k } }) => (
        <div className="flex max-w-xs flex-wrap gap-1" title={k.scopes.join(", ")}>
          {k.scopes.slice(0, 3).map((s) => (
            <Badge key={s} variant="outline" className="font-mono text-[0.7rem]">
              {s}
            </Badge>
          ))}
          {k.scopes.length > 3 && <span className="text-xs text-muted-foreground">+{k.scopes.length - 3} more</span>}
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: k } }) => {
        const status = KEY_STATUS[keyStatus(k)];
        return (
          <div className="space-y-0.5">
            <Badge variant={status.variant}>{status.label}</Badge>
            {k.revokedAt && <p className="text-xs text-muted-foreground">{formatDateTime(k.revokedAt)}</p>}
          </div>
        );
      },
    },
    { header: "Created", cell: ({ row: { original: k } }) => <DateCell value={k.createdAt} /> },
    { header: "Last used", cell: ({ row: { original: k } }) => <DateCell value={k.lastUsedAt} empty="Never" /> },
    { header: "Expires", cell: ({ row: { original: k } }) => <DateCell value={k.expiresAt} empty="Never" /> },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: k } }) => (k.revokedAt ? null : <RevokeKey apiKey={k} />),
    },
  ];

  return (
    <>
      <PageHeader
        title="API keys"
        description="Keys for integrations calling the admin API. Each key can do only what its scopes allow, and never more than the person who created it."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon /> New key
          </Button>
        }
      />
      <DataTable
        tableKey="api-keys"
        columns={columns}
        data={keys.data}
        loading={keys.isLoading}
        error={keys.error}
        getRowId={(k) => k.id}
        renderExpanded={(k) => (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">All scopes</p>
            <ul className="flex flex-wrap gap-1">
              {k.scopes.map((s) => (
                <li key={s}>
                  <Badge variant="outline" className="font-mono text-[0.7rem]">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        emptyMessage="No API keys yet."
      />
      {creating && (
        <CreateKeyDialog
          onClose={() => setCreating(false)}
          onCreated={(name, secret) => {
            setCreating(false);
            setRevealed({ name, secret });
          }}
        />
      )}
      {revealed && (
        <OneTimeSecretDialog
          title={`${revealed.name} created`}
          description="Send it as a bearer token: Authorization: Bearer <key>."
          label="API key"
          secret={revealed.secret}
          onClose={() => setRevealed(null)}
        />
      )}
    </>
  );
}

function DateCell({ value, empty = "—" }: { value: string | null; empty?: string }) {
  return (
    <span className="text-xs whitespace-nowrap text-muted-foreground">{value ? formatDateTime(value) : empty}</span>
  );
}

function CreateKeyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string, secret: string) => void;
}) {
  const me = useMe();
  // the catalog needs staff.read; without it, offer the creator's own permissions
  const catalog = useGetV1AdminPermissionsQuery({});
  const granted = me.data?.permissions;
  const scopes = catalog.data?.staff ?? (granted ?? []).filter((p) => p !== ALL);
  const groups = scopeGroups(scopes, granted);
  const [form, setForm] = useState<KeyForm>({ name: "", scopes: [], expiry: "never", customDate: "" });
  const [errors, setErrors] = useState<KeyErrors>({});
  const [create, creating] = usePostV1AdminApiKeysMutation();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const found = validateKey(form);
            setErrors(found);
            if (Object.keys(found).length) return;
            create({ body: keyBody(form) })
              .unwrap()
              .then((res) => {
                notifySaved(`${res.key.name} created`);
                onCreated(res.key.name, res.secret);
              }, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>New API key</DialogTitle>
            <DialogDescription>Give it only the scopes the integration needs.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="key-name">Name</FieldLabel>
                <Input
                  id="key-name"
                  value={form.name}
                  maxLength={MAX_NAME}
                  placeholder="e.g. Warehouse 3PL"
                  aria-invalid={errors.name ? true : undefined}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>
              <Field>
                <FieldLabel htmlFor="key-expiry">Expiry</FieldLabel>
                <Select
                  items={EXPIRY_CHOICES}
                  value={form.expiry}
                  onValueChange={(v) => v && setForm({ ...form, expiry: v as ExpiryChoice })}
                >
                  <SelectTrigger id="key-expiry" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_CHOICES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.expiry !== "custom" && errors.expiry && <FieldError>{errors.expiry}</FieldError>}
              </Field>
            </div>
            {form.expiry === "custom" && (
              <Field className="sm:w-1/2">
                <FieldLabel htmlFor="key-expiry-date">Expires at the end of</FieldLabel>
                <Input
                  id="key-expiry-date"
                  type="date"
                  value={form.customDate}
                  aria-invalid={errors.expiry ? true : undefined}
                  onChange={(e) => setForm({ ...form, customDate: e.target.value })}
                />
                {errors.expiry && <FieldError>{errors.expiry}</FieldError>}
              </Field>
            )}
            <FieldSet>
              <FieldLegend variant="label">Scopes</FieldLegend>
              <FieldDescription>
                Scopes are staff permissions. Ones you don&apos;t hold yourself can&apos;t be given to a key.
                {catalog.isError && " (Showing your own permissions: the full catalog needs staff.read.)"}
              </FieldDescription>
              {errors.scopes && <FieldError>{errors.scopes}</FieldError>}
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {groups.map(([group, options]) => {
                  const state = groupState(form.scopes, options);
                  const groupId = `scope-group-${group}`;
                  const anyHeld = options.some((o) => o.held);
                  return (
                    <div key={group} className="space-y-1.5" role="group" aria-labelledby={groupId}>
                      <Field orientation="horizontal">
                        <Checkbox
                          id={`${groupId}-all`}
                          checked={state === "checked"}
                          indeterminate={state === "mixed"}
                          disabled={!anyHeld}
                          onCheckedChange={(on) =>
                            setForm({ ...form, scopes: toggleScopeGroup(form.scopes, options, !!on) })
                          }
                        />
                        <FieldLabel
                          id={groupId}
                          htmlFor={`${groupId}-all`}
                          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                        >
                          {humanize(group)}
                        </FieldLabel>
                      </Field>
                      {options.map((o) => (
                        <Field
                          key={o.scope}
                          orientation="horizontal"
                          className="pl-5"
                          data-disabled={!o.held || undefined}
                        >
                          <Checkbox
                            id={`scope-${o.scope}`}
                            checked={form.scopes.includes(o.scope)}
                            disabled={!o.held}
                            onCheckedChange={(on) =>
                              setForm({ ...form, scopes: toggleScope(form.scopes, o.scope, !!on) })
                            }
                          />
                          <FieldLabel htmlFor={`scope-${o.scope}`} className="font-mono text-xs font-normal">
                            {o.scope}
                            {!o.held && (
                              <span className="font-sans text-muted-foreground"> (you don&apos;t hold this)</span>
                            )}
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                  );
                })}
              </div>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <span className="mr-auto self-center text-xs text-muted-foreground" aria-live="polite">
              {form.scopes.length} scope{form.scopes.length === 1 ? "" : "s"} selected
            </span>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating.isLoading}>
              Create key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevokeKey({ apiKey }: { apiKey: ApiKey }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [revoke, revoking] = usePostV1AdminApiKeysIdRevokeMutation();
  const matches = confirmsRevoke(typed, apiKey);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => (setTyped(""), setOpen(true))}
        aria-label={`Revoke ${apiKey.name}`}
      >
        <BanIcon /> Revoke
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!matches) return;
              revoke({ id: apiKey.id })
                .unwrap()
                .then(() => {
                  notifySaved(`${apiKey.name} revoked`);
                  setOpen(false);
                }, notifyError);
            }}
          >
            <DialogHeader>
              <DialogTitle>Revoke {apiKey.name}?</DialogTitle>
              <DialogDescription>
                Requests with this key fail straight away. This can&apos;t be undone; the integration will need a new
                key.
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive">
              <AlertDescription>
                Key {apiKey.prefix}… · {apiKey.scopes.length} scope{apiKey.scopes.length === 1 ? "" : "s"} · last used{" "}
                {apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : "never"}
              </AlertDescription>
            </Alert>
            <Field>
              <FieldLabel htmlFor={`revoke-${apiKey.id}`}>
                Type <span className="font-mono">{apiKey.name}</span> to confirm
              </FieldLabel>
              <Input
                id={`revoke-${apiKey.id}`}
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={!matches || revoking.isLoading}>
                Revoke key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
