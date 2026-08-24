"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createDefaultAction, type DefaultFormState } from "./actions";

const initialState: DefaultFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddDefaultDialog({
  clients,
  branchId,
}: {
  clients: { id: number; clientCode: string; fullName: string }[];
  branchId: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: DefaultFormState, formData: FormData) => {
    const result = await createDefaultAction(prev, formData);
    if (!result.error) {
      toast.success("Default recorded.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Record Default
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record client default</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="branchId" value={branchId} />

          <div className="space-y-1.5">
            <Label htmlFor="clientId">Client</Label>
            <Select name="clientId" required>
              <SelectTrigger id="clientId" className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.clientCode} — {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultedAmount">Outstanding amount</Label>
            <Input id="defaultedAmount" name="defaultedAmount" type="number" min="0" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultedAt">Date</Label>
            <Input id="defaultedAt" name="defaultedAt" type="date" defaultValue={today()} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Saving…" : "Record default"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
