"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { approveLoanApplicationAction, rejectLoanApplicationAction, type LoanApplicationActionState } from "./actions";

const initialState: LoanApplicationActionState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanApplicationActions({
  id,
  amountRequested,
  tenureWeeksRequested,
}: {
  id: number;
  amountRequested: number;
  tenureWeeksRequested: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [rejectPending, startRejectTransition] = useTransition();
  const boundApprove = approveLoanApplicationAction.bind(null, id);
  const [state, formAction, pending] = useActionState(async (prev: LoanApplicationActionState, formData: FormData) => {
    const result = await boundApprove(prev, formData);
    if (!result.error) {
      toast.success("Principal agreement created.");
      setOpen(false);
    }
    return result;
  }, initialState);

  function reject() {
    startRejectTransition(async () => {
      const { error } = await rejectLoanApplicationAction(id, note || undefined);
      if (error) toast.error(error);
      else toast.success("Application rejected.");
    });
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="h-7 w-36 text-xs"
        />
        <Button size="sm" variant="destructive" className="h-7 px-2" disabled={rejectPending} onClick={reject}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={rejectPending} onClick={() => setRejecting(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => setOpen(true)}>
          <Check className="size-3.5" />
          Review
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-destructive" onClick={() => setRejecting(true)}>
          <X className="size-3.5" />
          Reject
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve principal</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="principalAmount">Principal (₦)</Label>
              <Input
                id="principalAmount"
                name="principalAmount"
                type="number"
                min="1"
                step="0.01"
                defaultValue={amountRequested}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profitAmount">Profit (₦)</Label>
              <Input id="profitAmount" name="profitAmount" type="number" min="0" step="0.01" defaultValue={0} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tenureWeeks">Tenure (weeks)</Label>
              <Input
                id="tenureWeeks"
                name="tenureWeeks"
                type="number"
                min="1"
                step="1"
                defaultValue={tenureWeeksRequested ?? undefined}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={today()} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentDay">Payment day</Label>
              <Select name="paymentDay" required>
                <SelectTrigger id="paymentDay" className="w-full">
                  <SelectValue placeholder="Which day will they pay?" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_DAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
                {pending ? "Creating…" : "Approve and create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
