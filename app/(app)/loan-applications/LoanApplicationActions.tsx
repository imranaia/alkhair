"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import { approveLoanApplicationAction, rejectLoanApplicationAction, type LoanApplicationActionState } from "./actions";

const initialState: LoanApplicationActionState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function CheckRow({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm">
      <Checkbox name={name} />
      {label}
    </label>
  );
}

export function LoanApplicationActions({
  id,
  amountRequested,
  tenureWeeksRequested,
  isReturningClient,
}: {
  id: number;
  amountRequested: number;
  tenureWeeksRequested: number | null;
  isReturningClient: boolean;
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
        <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve principal</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="product">Product</Label>
              <Select name="product" required>
                <SelectTrigger id="product" className="w-full">
                  <SelectValue placeholder="Which product is this?" />
                </SelectTrigger>
                <SelectContent>
                  {LOAN_PRODUCTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amountApplied">Amount applied (₦)</Label>
                <Input id="amountApplied" name="amountApplied" type="number" min="0" step="0.01" defaultValue={amountRequested} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recommendedAmount">Recommended (₦)</Label>
                <Input id="recommendedAmount" name="recommendedAmount" type="number" min="0" step="0.01" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="principalAmount">Principal approved (₦)</Label>
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
                max="12"
                step="1"
                defaultValue={tenureWeeksRequested ?? undefined}
                required
              />
              <p className="text-xs text-muted-foreground">Up to 12 weeks maximum.</p>
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

            <div className="space-y-1 border-t border-border pt-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Verification</p>
              <CheckRow name="applicationFormFilled" label="Loan application form filled" />
              <CheckRow name="appraisalReportAttached" label="Appraisal report attached" />
              <CheckRow name="stockAvailabilityChecked" label="Stock availability & valuation checked" />
              {isReturningClient && (
                <>
                  <CheckRow name="supervisionReportAttached" label="Supervision report attached" />
                  <CheckRow name="loanAmountReviewed" label="Principal amount reviewed" />
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankDetails">Bank details</Label>
              <Input id="bankDetails" name="bankDetails" />
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
