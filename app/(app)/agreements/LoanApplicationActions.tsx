"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import {
  approveLoanApplicationAction,
  rejectLoanApplicationAction,
  recommendLoanApplicationAction,
  type LoanApplicationActionState,
} from "./actions";

const initialState: LoanApplicationActionState = { error: null };

// The shape of pendingChanges.proposedChanges for a loan_agreement_application
// row. The simple officer-submitted request only fills amountRequested /
// purpose / tenureWeeksRequested; a branch admin submitting via the full New
// Agreement form fills the rest too, so the approve dialog can be pre-filled
// with what they already entered instead of making the approver retype it.
export type ProposedLoanChanges = {
  amountRequested?: number;
  purpose?: string;
  tenureWeeksRequested?: number;
  recommendedAmount?: number;
  recommendedByName?: string;
  product?: "biz" | "partner";
  principalAmount?: number;
  profitAmount?: number;
  startDate?: string;
  paymentDay?: number;
  amountApplied?: number;
  applicationFormFilled?: boolean;
  appraisalReportAttached?: boolean;
  supervisionReportAttached?: boolean;
  loanAmountReviewed?: boolean;
  stockAvailabilityChecked?: boolean;
  bankDetails?: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function CheckRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm">
      <Checkbox name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

export function LoanApplicationActions({
  id,
  amountRequested,
  isReturningClient,
  canRecommend,
  canApprove,
  proposed,
}: {
  id: number;
  amountRequested: number;
  isReturningClient: boolean;
  canRecommend: boolean;
  canApprove: boolean;
  proposed: ProposedLoanChanges;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"idle" | "rejecting" | "recommending">("idle");
  const [note, setNote] = useState("");
  const suggestedAmount = proposed.recommendedAmount ?? proposed.principalAmount ?? amountRequested;
  const [recommendValue, setRecommendValue] = useState(String(suggestedAmount));
  const [actionPending, startTransition] = useTransition();

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
    startTransition(async () => {
      const { error } = await rejectLoanApplicationAction(id, note || undefined);
      if (error) toast.error(error);
      else toast.success("Application rejected.");
    });
  }

  function recommend() {
    const value = Number(recommendValue);
    startTransition(async () => {
      const { error } = await recommendLoanApplicationAction(id, value);
      if (error) toast.error(error);
      else {
        toast.success("Recommendation saved.");
        setMode("idle");
      }
    });
  }

  if (mode === "rejecting") {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="h-7 w-36 text-xs"
        />
        <Button size="sm" variant="destructive" className="h-7 px-2" disabled={actionPending} onClick={reject}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={actionPending} onClick={() => setMode("idle")}>
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === "recommending") {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="1"
          step="0.01"
          value={recommendValue}
          onChange={(e) => setRecommendValue(e.target.value)}
          placeholder="Amount"
          className="h-7 w-28 text-xs"
        />
        <Button size="sm" variant="secondary" className="h-7 px-2" disabled={actionPending} onClick={recommend}>
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={actionPending} onClick={() => setMode("idle")}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {canRecommend && (
          <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => setMode("recommending")}>
            <ThumbsUp className="size-3.5" />
            Recommend
          </Button>
        )}
        {canApprove && (
          <>
            <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" onClick={() => setOpen(true)}>
              <Check className="size-3.5" />
              Review
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-destructive" onClick={() => setMode("rejecting")}>
              <X className="size-3.5" />
              Reject
            </Button>
          </>
        )}
      </div>

      {canApprove && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Approve principal</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="product">Product</Label>
                <Select name="product" required defaultValue={proposed.product}>
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
                  <Input
                    id="amountApplied"
                    name="amountApplied"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={proposed.amountApplied ?? amountRequested}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recommendedAmount">Recommended (₦)</Label>
                  <Input
                    id="recommendedAmount"
                    name="recommendedAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={proposed.recommendedAmount ?? undefined}
                  />
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
                  defaultValue={suggestedAmount}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profitAmount">Profit (₦)</Label>
                <Input
                  id="profitAmount"
                  name="profitAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={proposed.profitAmount ?? 0}
                  required
                />
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
                  defaultValue={proposed.tenureWeeksRequested ?? undefined}
                  required
                />
                <p className="text-xs text-muted-foreground">Up to 12 weeks maximum.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={proposed.startDate ?? today()} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentDay">Payment day</Label>
                <Select name="paymentDay" required defaultValue={proposed.paymentDay != null ? String(proposed.paymentDay) : undefined}>
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
                <CheckRow name="applicationFormFilled" label="Loan application form filled" defaultChecked={proposed.applicationFormFilled} />
                <CheckRow name="appraisalReportAttached" label="Appraisal report attached" defaultChecked={proposed.appraisalReportAttached} />
                <CheckRow
                  name="stockAvailabilityChecked"
                  label="Stock availability & valuation checked"
                  defaultChecked={proposed.stockAvailabilityChecked}
                />
                {isReturningClient && (
                  <>
                    <CheckRow
                      name="supervisionReportAttached"
                      label="Supervision report attached"
                      defaultChecked={proposed.supervisionReportAttached}
                    />
                    <CheckRow name="loanAmountReviewed" label="Principal amount reviewed" defaultChecked={proposed.loanAmountReviewed} />
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankDetails">Bank details</Label>
                <Input id="bankDetails" name="bankDetails" defaultValue={proposed.bankDetails ?? ""} />
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
      )}
    </>
  );
}
