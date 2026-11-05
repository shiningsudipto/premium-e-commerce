"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteV1AdminRolesIdMutation,
  useGetV1AdminPermissionsQuery,
  useGetV1AdminRolesQuery,
  usePatchV1AdminRolesIdMutation,
  usePostV1AdminRolesMutation,
  type GetV1AdminRolesApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { humanize } from "../../components/json-schema-form/schema";
import { notifyError, notifySaved } from "../../lib/notify";
import { ALL } from "../../lib/permissions";

type Role = GetV1AdminRolesApiResponse[number];
type Audience = Role["audience"];

// "orders.refund" → grouped under "orders"
export function groupPermissions(permissions: readonly string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const p of permissions) {
    const group = p.split(".")[0]!;
    groups.set(group, [...(groups.get(group) ?? []), p]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// Roles and their permission bundles (spec §4). System roles can be tuned but not deleted.
export function RolesScreen() {
  const roles = useGetV1AdminRolesQuery({});
  const canManage = useCan("roles.manage");
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [removeRole] = useDeleteV1AdminRolesIdMutation();

  const columns: ColumnDef<Role>[] = [
    {
      header: "Role",
      cell: ({ row: { original: r } }) => (
        <div className="max-w-sm space-y-0.5 whitespace-normal">
          <p className="flex items-center gap-2 font-medium">
            {r.name}
            {r.isSystem && <Badge variant="outline">System</Badge>}
          </p>
          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
        </div>
      ),
    },
    {
      header: "For",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs">{r.audience === "STAFF" ? "Staff" : "Storefront accounts"}</span>
      ),
    },
    {
      header: "Permissions",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs">{r.permissions.includes(ALL) ? "Everything" : r.permissions.length}</span>
      ),
    },
    {
      header: "2-step",
      cell: ({ row: { original: r } }) => <span className="text-xs">{r.mfaRequired ? "Required" : "Optional"}</span>,
    },
    {
      header: "Session limit",
      cell: ({ row: { original: r } }) => (
        <span className="text-xs">{r.sessionTtlMinutes ? `${r.sessionTtlMinutes} min` : "Default"}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: r } }) =>
        canManage && (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
              <PencilIcon />
            </Button>
            {!r.isSystem && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.name}`}>
                    <Trash2Icon />
                  </Button>
                }
                title={`Delete ${r.name}?`}
                description="Staff who hold only this role lose access to everything it granted."
                confirmLabel="Delete role"
                destructive
                onConfirm={() =>
                  removeRole({ id: r.id })
                    .unwrap()
                    .then(() => notifySaved("Role deleted"), notifyError)
                }
              />
            )}
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a named set of permissions. Code checks permissions, never role names, so roles can be reshaped safely."
        actions={
          canManage && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <PlusIcon /> New role
            </Button>
          )
        }
      />
      <DataTable
        tableKey="roles"
        columns={columns}
        data={roles.data}
        loading={roles.isLoading}
        error={roles.error}
        getRowId={(r) => r.id}
      />
      {editing && <RoleDialog role={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function RoleDialog({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const catalog = useGetV1AdminPermissionsQuery({});
  const [audience, setAudience] = useState<Audience>(role?.audience ?? "STAFF");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [mfaRequired, setMfaRequired] = useState(role?.mfaRequired ?? false);
  const everything = permissions.includes(ALL);
  const groups = useMemo(
    () => groupPermissions(audience === "STAFF" ? (catalog.data?.staff ?? []) : (catalog.data?.storefront ?? [])),
    [audience, catalog.data],
  );

  const done = () => {
    notifySaved(role ? `${role.name} updated` : "Role created");
    onClose();
  };
  const [createRole, create] = usePostV1AdminRolesMutation();
  const [updateRole, update] = usePatchV1AdminRolesIdMutation();
  const toggle = (p: string, on: boolean) =>
    setPermissions((current) => (on ? [...current, p] : current.filter((x) => x !== p)));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const ttl = String(form.get("ttl") ?? "").trim();
            const common = {
              name: String(form.get("name")).trim(),
              description: String(form.get("description")).trim() || undefined,
              permissions,
              mfaRequired,
              sessionTtlMinutes: ttl ? Number(ttl) : null,
            };
            const saved = role
              ? updateRole({ id: role.id, body: { ...common, version: role.version } })
              : createRole({ body: { ...common, audience } });
            saved.unwrap().then(done, notifyError);
          }}
        >
          <DialogHeader>
            <DialogTitle>{role ? `Edit ${role.name}` : "New role"}</DialogTitle>
            {role?.isSystem && (
              <DialogDescription>
                A system role: its permissions can change, but it can&apos;t be deleted.
              </DialogDescription>
            )}
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="role-name">Name</FieldLabel>
                <Input id="role-name" name="name" defaultValue={role?.name} required maxLength={100} />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-audience">For</FieldLabel>
                <Select
                  value={audience}
                  onValueChange={(v) => v && (setAudience(v as Audience), setPermissions([]))}
                  disabled={!!role}
                >
                  <SelectTrigger id="role-audience" className="w-full">
                    <SelectValue>{audience === "STAFF" ? "Staff" : "Storefront accounts"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="STOREFRONT">Storefront accounts</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="role-description">Description</FieldLabel>
              <Textarea
                id="role-description"
                name="description"
                rows={2}
                defaultValue={role?.description ?? ""}
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field orientation="horizontal">
                <Switch id="role-mfa" checked={mfaRequired} onCheckedChange={setMfaRequired} />
                <FieldLabel htmlFor="role-mfa">Require two-step verification</FieldLabel>
              </Field>
              <Field>
                <FieldLabel htmlFor="role-ttl">Session limit (minutes)</FieldLabel>
                <Input
                  id="role-ttl"
                  name="ttl"
                  type="number"
                  min={5}
                  defaultValue={role?.sessionTtlMinutes ?? ""}
                  className="font-mono"
                />
                <FieldDescription>Empty uses the default.</FieldDescription>
              </Field>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Permissions</FieldLegend>
              {everything ? (
                <FieldDescription>This role holds every permission (Owner).</FieldDescription>
              ) : (
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {groups.map(([group, perms]) => (
                    <div key={group} className="space-y-1.5">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {humanize(group)}
                      </p>
                      {perms.map((p) => (
                        <Field key={p} orientation="horizontal">
                          <Checkbox
                            id={`perm-${p}`}
                            checked={permissions.includes(p)}
                            onCheckedChange={(on) => toggle(p, !!on)}
                          />
                          <FieldLabel htmlFor={`perm-${p}`} className="font-mono text-xs font-normal">
                            {p}
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isLoading || update.isLoading}>
              {role ? "Save role" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
