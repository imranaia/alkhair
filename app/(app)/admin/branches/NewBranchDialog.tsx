"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createBranchAction, type BranchFormState } from "./actions";

const initialState: BranchFormState = { error: null };

export function NewBranchDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: BranchFormState, formData: FormData) => {
    const result = await createBranchAction(prev, formData);
    if (!result.error) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Add Branch
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add branch</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Branch code</Label>
            <Input id="code" name="code" placeholder="e.g. YOL" maxLength={10} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Branch name</Label>
            <Input id="name" name="name" placeholder="e.g. Yola Branch" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" name="address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Creating…" : "Create branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
