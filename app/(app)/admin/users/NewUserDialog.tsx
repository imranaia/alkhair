"use client";

import { useActionState, useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUserAction, type UserFormState } from "./actions";

const initialState: UserFormState = { error: null };

type RoleOption = { id: number; name: string };
type BranchOption = { id: number; name: string; code: string };

export function NewUserDialog({
  roles,
  branches,
  showBranchSelect,
}: {
  roles: RoleOption[];
  branches: BranchOption[];
  showBranchSelect: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: UserFormState, formData: FormData) => {
    const result = await createUserAction(prev, formData);
    if (result.tempPassword) setSuccessPassword(result.tempPassword);
    return result;
  }, initialState);

  function handleClose(next: boolean) {
    // Once a password is showing, only the explicit "Done" button (which also
    // clears successPassword) may close the dialog — an admin who fat-fingers
    // Escape or clicks outside must not lose it before it's copied.
    if (successPassword && !next) return;
    setOpen(next);
  }

  function handleDone() {
    setSuccessPassword(null);
    setCopied(false);
    setOpen(false);
  }

  async function handleCopy() {
    if (!successPassword) return;
    await navigator.clipboard.writeText(successPassword);
    setCopied(true);
    toast.success("Password copied.");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent
        className="glass-panel-strong border-none sm:max-w-sm"
        showCloseButton={!successPassword}
        onInteractOutside={(e) => {
          if (successPassword) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (successPassword) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{successPassword ? "User created" : "Add user"}</DialogTitle>
        </DialogHeader>

        {successPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with the staff member directly. It will not be shown again once you close this
              dialog.
            </p>
            <div className="flex items-center gap-2">
              <p className="flex-1 select-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm">
                {successPassword}
              </p>
              <Button type="button" variant="secondary" size="icon" onClick={handleCopy} title="Copy password">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button className="w-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={handleDone}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" name="email" type="email" placeholder="For notifications" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleId">Role</Label>
              <Select name="roleId" required>
                <SelectTrigger id="roleId" className="w-full">
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
                <Label htmlFor="branchId">Branch</Label>
                <Select name="branchId">
                  <SelectTrigger id="branchId" className="w-full">
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
            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                {pending ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
