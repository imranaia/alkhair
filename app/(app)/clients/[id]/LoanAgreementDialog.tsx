"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createLoanAgreementAction, type AgreementFormState } from "./portalActions";

const initialState: AgreementFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanAgreementDialog({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  // Side effect lives in the action itself (runs once per successful submit)
  // rather than in a useEffect reacting to state changes, which would fire on
  // every render where the dependencies happen to match and cascade renders.
  const [state, formAction, pending] = useActionState(async (prev: AgreementFormState, formData: FormData) => {
    const result = await createLoanAgreementAction(prev, formData);
    if (!result.error) {
      toast.success("Principal agreement created.");
      setOpen(false);
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
          New principal agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New principal agreement</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="space-y-1.5">
            <Label htmlFor="principalAmount">Principal (₦)</Label>
            <Input id="principalAmount" name="principalAmount" type="number" min="1" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profitAmount">Profit (₦)</Label>
            <Input id="profitAmount" name="profitAmount" type="number" min="0" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenureWeeks">Tenure (weeks)</Label>
            <Input id="tenureWeeks" name="tenureWeeks" type="number" min="1" step="1" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={today()} required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
