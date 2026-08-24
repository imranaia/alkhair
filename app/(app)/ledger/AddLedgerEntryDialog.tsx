"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createLedgerEntryAction, type LedgerFormState } from "./actions";

const initialState: LedgerFormState = { error: null };

type Section = { key: string; label: string; side: "debit" | "credit"; suggestions: readonly string[] };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddLedgerEntryDialog({ branchId, sections }: { branchId: number; sections: Section[] }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("");
  const [state, formAction, pending] = useActionState(async (prev: LedgerFormState, formData: FormData) => {
    const result = await createLedgerEntryAction(prev, formData);
    if (!result.error) {
      toast.success("Ledger entry recorded.");
      setOpen(false);
      setSection("");
    }
    return result;
  }, initialState);

  const selected = sections.find((s) => s.key === section);

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
          <DialogTitle>Add ledger entry</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="branchId" value={branchId} />

          <div className="space-y-1.5">
            <Label htmlFor="section">Section</Label>
            <Select name="section" value={section} onValueChange={setSection} required>
              <SelectTrigger id="section" className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="label">Description</Label>
            <Input id="label" name="label" list="ledger-label-suggestions" placeholder="e.g. Motor Vehicle" required />
            <datalist id="ledger-label-suggestions">
              {(selected?.suggestions ?? []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entryDate">Date</Label>
            <Input id="entryDate" name="entryDate" type="date" defaultValue={today()} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" />
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
