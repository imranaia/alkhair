"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createCashBookEntryAction, type CashBookFormState } from "./actions";

const initialState: CashBookFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddEntryDialog({ branchId }: { branchId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: CashBookFormState, formData: FormData) => {
    const result = await createCashBookEntryAction(prev, formData);
    if (!result.error) {
      toast.success("Entry recorded.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="size-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add cash book entry</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="branchId" value={branchId} />

          <div className="space-y-1.5">
            <Label htmlFor="entryDate">Date</Label>
            <Input id="entryDate" name="entryDate" type="date" defaultValue={today()} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountName">Account (optional)</Label>
            <Input id="accountName" name="accountName" placeholder="e.g. Operations account, Investment account" />
            <p className="text-xs text-muted-foreground">Leave blank if this branch doesn&apos;t split banked funds across sub-accounts.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="details">Details</Label>
            <Input id="details" name="details" placeholder="e.g. Cash deposit" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refType">Ref. type</Label>
            <Select name="refType">
              <SelectTrigger id="refType" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OR">OR (Receipt)</SelectItem>
                <SelectItem value="PV">PV (Voucher)</SelectItem>
                <SelectItem value="CQ">CQ (Cheque)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">The reference number is generated automatically on save.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="debit">Debit (out)</Label>
              <Input id="debit" name="debit" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credit">Credit (in)</Label>
              <Input id="credit" name="credit" type="number" min="0" step="0.01" />
            </div>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Saving…" : "Save entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
