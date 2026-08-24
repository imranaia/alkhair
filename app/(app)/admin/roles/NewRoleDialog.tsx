"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createRoleAction, type RoleFormState } from "./actions";

const initialState: RoleFormState = { error: null };

export function NewRoleDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: RoleFormState, formData: FormData) => {
    const result = await createRoleAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Add Role
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add role</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Role name</Label>
            <Input id="name" name="name" placeholder="e.g. Regional Auditor" required />
          </div>
          <p className="text-xs text-muted-foreground">
            You&apos;ll choose which modules this role can access on the next screen.
          </p>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
