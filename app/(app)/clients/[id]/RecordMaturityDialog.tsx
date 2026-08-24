"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { recordLoanMaturityAction, type MaturityFormState } from "../actions";

const initialState: MaturityFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordMaturityDialog({ clientId, branchId }: { clientId: number; branchId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: MaturityFormState, formData: FormData) => {
    const result = await recordLoanMaturityAction(prev, formData);
    if (!result.error) {
      toast.success("Principal maturity recorded.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Record principal maturity
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record principal maturity</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="branchId" value={branchId} />

          <div className="space-y-1.5">
            <Label htmlFor="maturedAt">Date</Label>
            <Input id="maturedAt" name="maturedAt" type="date" defaultValue={today()} required />
          </div>

          <div className="space-y-1.5">
            <Label>Renewing their principal?</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="renewed" value="yes" defaultChecked /> Yes, renewed
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="renewed" value="no" /> No, not renewing
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amountWithClient">Amount still with client (optional)</Label>
            <Input id="amountWithClient" name="amountWithClient" type="number" min="0" step="0.01" />
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
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
