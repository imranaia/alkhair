"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Power } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateBranchAction, toggleBranchActiveAction, type BranchFormState } from "./actions";

const initialState: BranchFormState = { error: null };

export type BranchRow = {
  id: number;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

export function BranchCard({ branch, canEdit }: { branch: BranchRow; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [togglePending, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(updateBranchAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("Branch updated.");
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  function handleToggleActive() {
    startTransition(async () => {
      await toggleBranchActiveAction(branch.id, !branch.isActive);
      toast.success(branch.isActive ? "Branch deactivated." : "Branch activated.");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditing(false);
      }}
    >
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{branch.name}</p>
          <p className="text-xs text-muted-foreground">{branch.code}</p>
          <Badge variant={branch.isActive ? "default" : "secondary"} className="w-fit">
            {branch.isActive ? "Active" : "Inactive"}
          </Badge>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        {!editing ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {branch.name}
                <Badge variant={branch.isActive ? "default" : "secondary"}>{branch.isActive ? "Active" : "Inactive"}</Badge>
              </DialogTitle>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Code</dt>
                <dd className="font-medium">{branch.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{branch.phone || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd className="font-medium">{branch.address || "—"}</dd>
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
                  disabled={togglePending}
                  onClick={handleToggleActive}
                >
                  <Power className="size-3.5" />
                  {branch.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit {branch.code}</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="branchId" value={branch.id} />
              <div className="space-y-1.5">
                <Label htmlFor={`name-${branch.id}`}>Name</Label>
                <Input id={`name-${branch.id}`} name="name" defaultValue={branch.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`phone-${branch.id}`}>Phone</Label>
                <Input id={`phone-${branch.id}`} name="phone" defaultValue={branch.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`address-${branch.id}`}>Address</Label>
                <Input id={`address-${branch.id}`} name="address" defaultValue={branch.address ?? ""} />
              </div>
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
