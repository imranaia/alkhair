"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, KeyRound, UserX, UserCheck, Copy, Check } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserAction, resetPasswordAction, toggleUserActiveAction, type UserFormState } from "./actions";

const initialState: UserFormState = { error: null };

type RoleOption = { id: number; name: string };
type BranchOption = { id: number; name: string; code: string };

export type UserRow = {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  roleId: number;
  roleName: string;
  branchId: number | null;
  branchName: string | null;
  isActive: boolean;
};

export function UserCard({
  user,
  roles,
  branches,
  showBranchSelect,
  canEdit,
}: {
  user: UserRow;
  roles: RoleOption[];
  branches: BranchOption[];
  showBranchSelect: boolean;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionPending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(updateUserAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("User updated.");
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  function handleReset() {
    startTransition(async () => {
      const result = await resetPasswordAction(user.id);
      if (result.tempPassword) setTempPassword(result.tempPassword);
    });
  }

  function handleToggleActive() {
    startTransition(() => {
      void toggleUserActiveAction(user.id, !user.isActive);
    });
  }

  async function handleCopy() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Password copied.");
  }

  function handleClose(next: boolean) {
    if (tempPassword && !next) return; // must confirm via Done
    setOpen(next);
    if (!next) {
      setEditing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {user.roleName}
            </Badge>
            {!user.isActive && (
              <Badge variant="outline" className="text-[10px]">
                Inactive
              </Badge>
            )}
          </div>
        </GlassPanel>
      </button>

      <DialogContent
        className="glass-panel-strong border-none sm:max-w-sm"
        showCloseButton={!tempPassword}
        onInteractOutside={(e) => {
          if (tempPassword) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (tempPassword) e.preventDefault();
        }}
      >
        {tempPassword ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Password reset</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Share this temporary password with @{user.username} directly. It will not be shown again once you close this
              dialog.
            </p>
            <div className="flex items-center gap-2">
              <p className="flex-1 select-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm">
                {tempPassword}
              </p>
              <Button type="button" variant="secondary" size="icon" onClick={handleCopy} title="Copy password">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setTempPassword(null);
                setCopied(false);
                setOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        ) : !editing ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {user.fullName}
                <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
              </DialogTitle>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Username</dt>
                <dd className="font-medium">@{user.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{user.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd className="font-medium">{user.roleName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Branch</dt>
                <dd className="font-medium">{user.branchName || "—"}</dd>
              </div>
            </dl>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={actionPending}
                  onClick={handleReset}
                >
                  <KeyRound className="size-3.5" />
                  Reset password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={actionPending}
                  onClick={handleToggleActive}
                >
                  {user.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit @{user.username}</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="userId" value={user.id} />
              <div className="space-y-1.5">
                <Label htmlFor={`username-${user.id}`}>Username</Label>
                <Input id={`username-${user.id}`} name="username" defaultValue={user.username} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`fullName-${user.id}`}>Full name</Label>
                <Input id={`fullName-${user.id}`} name="fullName" defaultValue={user.fullName} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`phone-${user.id}`}>Phone (optional)</Label>
                <Input id={`phone-${user.id}`} name="phone" defaultValue={user.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`email-${user.id}`}>Email (optional)</Label>
                <Input id={`email-${user.id}`} name="email" type="email" defaultValue={user.email ?? ""} placeholder="For notifications" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`roleId-${user.id}`}>Role</Label>
                <Select name="roleId" defaultValue={String(user.roleId)} required>
                  <SelectTrigger id={`roleId-${user.id}`} className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showBranchSelect && (
                <div className="space-y-1.5">
                  <Label htmlFor={`branchId-${user.id}`}>Branch</Label>
                  <Select name="branchId" defaultValue={user.branchId ? String(user.branchId) : undefined}>
                    <SelectTrigger id={`branchId-${user.id}`} className="w-full">
                      <SelectValue placeholder="Select a branch (optional for Super Admin)" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {state.error && (
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={pending} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  {pending ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
