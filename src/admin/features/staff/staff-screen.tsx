"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { CopyIcon, MoreHorizontalIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { fieldErrors } from "../../store/api-errors";
import {
  useGetV1AdminRolesQuery,
  useGetV1AdminStaffQuery,
  usePatchV1AdminStaffIdMutation,
  usePostV1AdminStaffIdResetMfaMutation,
  usePostV1AdminStaffMutation,
  type GetV1AdminRolesApiResponse,
  type GetV1AdminStaffApiResponse,
} from "../../store/api.generated";
import { useCan } from "../../components/can";
import { PageHeader } from "../../components/console-shell";
import { DataTable } from "../../components/data-table/data-table";
import { useCursorPages } from "../../components/data-table/use-cursor-pages";
import { formatDateTime } from "../../lib/format";
import { notifyError, notifySaved } from "../../lib/notify";

type StaffUser = GetV1AdminStaffApiResponse["items"][number];
type Role = GetV1AdminRolesApiResponse[number];

const PAGE_SIZE = 25;

// Staff users (spec §4.5): invite, change roles, disable, reset two-step verification.
export function StaffScreen() {
  const pages = useCursorPages();
  const staff = useGetV1AdminStaffQuery({ limit: PAGE_SIZE, ...(pages.cursor ? { cursor: pages.cursor } : {}) });
  const roles = useGetV1AdminRolesQuery({});
  const canManage = useCan("staff.manage");
  const canInvite = useCan("staff.invite");
  const [patchStaff] = usePatchV1AdminStaffIdMutation();
  const staffRoles = (roles.data ?? []).filter((r) => r.audience === "STAFF");

  const setStatus = async (users: StaffUser[], status: StaffUser["status"]) => {
    const results = await Promise.allSettled(
      users.map((u) => patchStaff({ id: u.id, body: { version: u.version, status } }).unwrap()),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) notifyError((failed[0] as PromiseRejectedResult).reason);
    if (failed.length < users.length)
      notifySaved(`${users.length - failed.length} ${status === "DISABLED" ? "disabled" : "enabled"}`);
  };

  const columns: ColumnDef<StaffUser>[] = [
    {
      header: "Person",
      cell: ({ row: { original: u } }) => (
        <div className="space-y-0.5">
          <p className="font-medium">{u.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      header: "Roles",
      cell: ({ row: { original: u } }) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <Badge key={r.id} variant="secondary">
              {r.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row: { original: u } }) => (
        <Badge variant={u.status === "ACTIVE" ? "outline" : "destructive"}>
          {u.status === "ACTIVE" ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      header: "2-step",
      cell: ({ row: { original: u } }) => <span className="text-xs">{u.mfaEnabled ? "On" : "Off"}</span>,
    },
    {
      header: "Last sign-in",
      cell: ({ row: { original: u } }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(u.lastLoginAt)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row: { original: u } }) =>
        canManage && <StaffActions user={u} roles={staffRoles} onStatus={(s) => setStatus([u], s)} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="People who can sign in to this back office. What each person can do comes from their roles."
        actions={canInvite && <InviteDialog roles={staffRoles} />}
      />
      <DataTable
        tableKey="staff"
        columns={columns}
        data={staff.data?.items}
        loading={staff.isFetching}
        error={staff.error}
        getRowId={(u) => u.id}
        bulkActions={
          canManage
            ? [
                { label: "Disable", destructive: true, run: (rows) => setStatus(rows, "DISABLED") },
                { label: "Enable", run: (rows) => setStatus(rows, "ACTIVE") },
              ]
            : []
        }
        pagination={{
          page: pages.page,
          hasNext: !!staff.data?.nextCursor,
          hasPrevious: pages.hasPrevious,
          onNext: () => pages.next(staff.data?.nextCursor),
          onPrevious: pages.previous,
        }}
      />
    </>
  );
}

function RoleChecklist({
  roles,
  selected,
  onChange,
}: {
  roles: Role[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Roles</FieldLegend>
      <div className="grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <Field key={r.id} orientation="horizontal">
            <Checkbox
              id={`role-${r.id}`}
              checked={selected.includes(r.id)}
              onCheckedChange={(on) => onChange(on ? [...selected, r.id] : selected.filter((id) => id !== r.id))}
            />
            <FieldLabel htmlFor={`role-${r.id}`} className="font-normal">
              {r.name}
              {r.mfaRequired && <span className="text-xs text-muted-foreground"> · 2-step</span>}
            </FieldLabel>
          </Field>
        ))}
      </div>
    </FieldSet>
  );
}

function InviteDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string | null } | null>(null);
  const [inviteStaff, invite] = usePostV1AdminStaffMutation();
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setCreated(null);
      setRoleIds([]);
      setErrors({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger
        render={
          <Button size="sm">
            <UserPlusIcon /> Invite staff
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{created.email} can sign in</DialogTitle>
              <DialogDescription>Share the temporary password privately. It isn&apos;t shown again.</DialogDescription>
            </DialogHeader>
            {created.temporaryPassword && (
              <Alert>
                <AlertTitle>Temporary password</AlertTitle>
                <AlertDescription className="flex items-center gap-2">
                  <code className="font-mono text-sm select-all" data-testid="temporary-password">
                    {created.temporaryPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Copy password"
                    onClick={() =>
                      navigator.clipboard.writeText(created.temporaryPassword!).then(() => toast.success("Copied"))
                    }
                  >
                    <CopyIcon />
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (!roleIds.length) {
                setErrors({ roleIds: ["Choose at least one role"] });
                return;
              }
              const password = String(form.get("password") ?? "");
              inviteStaff({
                body: {
                  email: String(form.get("email")).trim(),
                  name: String(form.get("name")).trim() || undefined,
                  roleIds,
                  ...(password ? { password } : {}),
                },
              })
                .unwrap()
                .then(
                  (res) => setCreated({ email: res.user.email, temporaryPassword: res.temporaryPassword }),
                  (error) => {
                    setErrors(fieldErrors(error));
                    notifyError(error);
                  },
                );
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite staff</DialogTitle>
              <DialogDescription>
                Roles that require two-step verification ask for it at first sign-in.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field data-invalid={errors.email ? true : undefined}>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input id="invite-email" name="email" type="email" required />
                <FieldError>{errors.email?.[0]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-name">Name</FieldLabel>
                <Input id="invite-name" name="name" />
              </Field>
              <RoleChecklist roles={roles} selected={roleIds} onChange={setRoleIds} />
              <FieldError>{errors.roleIds?.[0]}</FieldError>
              <Field data-invalid={errors.password ? true : undefined}>
                <FieldLabel htmlFor="invite-password">Password (optional)</FieldLabel>
                <Input
                  id="invite-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                />
                <FieldDescription>Leave empty to generate a temporary password.</FieldDescription>
                <FieldError>{errors.password?.[0]}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={invite.isLoading}>
                Invite
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffActions({
  user,
  roles,
  onStatus,
}: {
  user: StaffUser;
  roles: Role[];
  onStatus: (status: StaffUser["status"]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmMfa, setConfirmMfa] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [roleIds, setRoleIds] = useState(user.roles.map((r) => r.id));
  const [updateStaff, update] = usePatchV1AdminStaffIdMutation();
  const [resetStaffMfa, resetMfa] = usePostV1AdminStaffIdResetMfaMutation();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.email}`}>
              <MoreHorizontalIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Edit name and roles</DropdownMenuItem>
          <DropdownMenuItem disabled={!user.mfaEnabled} onClick={() => setConfirmMfa(true)}>
            Reset two-step verification
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.status === "ACTIVE" ? (
            <DropdownMenuItem variant="destructive" onClick={() => onStatus("DISABLED")}>
              Disable
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onStatus("ACTIVE")}>Enable</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateStaff({ id: user.id, body: { version: user.version, name: name.trim() || null, roleIds } })
                .unwrap()
                .then(() => {
                  notifySaved(`${user.email} updated`);
                  setEditing(false);
                }, notifyError);
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit {user.email}</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`name-${user.id}`}>Name</FieldLabel>
                <Input id={`name-${user.id}`} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <RoleChecklist roles={roles} selected={roleIds} onChange={setRoleIds} />
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={update.isLoading || !roleIds.length}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmMfa} onOpenChange={setConfirmMfa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset two-step verification?</DialogTitle>
            <DialogDescription>
              {user.email} sets up a new authenticator at the next sign-in. Sessions already open stay open; disable the
              account as well if the old device may be in the wrong hands. Do this only after confirming who is asking.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmMfa(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetMfa.isLoading}
              onClick={() =>
                resetStaffMfa({ id: user.id })
                  .unwrap()
                  .then(() => {
                    notifySaved(`${user.email} sets up two-step verification again at next sign-in`);
                    setConfirmMfa(false);
                  }, notifyError)
              }
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
