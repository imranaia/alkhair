"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import { createLoanAgreementAction, type AgreementFormState } from "../portalActions";

const initialState: AgreementFormState = { error: null };

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

export function NewAgreementForm({
  clientId,
  isReturning,
  isSuperAdmin,
}: {
  clientId: number;
  isReturning: boolean;
  isSuperAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(createLoanAgreementAction, initialState);
  const [instantApprove, setInstantApprove] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={clientId} />

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

      <div className="space-y-3 border-t border-border pt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amountApplied">Amount applied (₦)</Label>
            <Input id="amountApplied" name="amountApplied" type="number" min="0" step="0.01" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recommendedAmount">Recommended (₦)</Label>
            <Input id="recommendedAmount" name="recommendedAmount" type="number" min="0" step="0.01" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="principalAmount">Principal approved (₦)</Label>
          <Input id="principalAmount" name="principalAmount" type="number" min="1" step="0.01" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profitAmount">Profit (₦)</Label>
          <Input id="profitAmount" name="profitAmount" type="number" min="0" step="0.01" required />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="space-y-1.5">
          <Label htmlFor="tenureWeeks">Tenure (weeks)</Label>
          <Input id="tenureWeeks" name="tenureWeeks" type="number" min="1" max="12" step="1" required />
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
          <p className="text-xs text-muted-foreground">
            This loan&apos;s weekly collection day — can differ from their previous loan&apos;s.
          </p>
        </div>
      </div>

      <div className="space-y-1 border-t border-border pt-3">
        <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Verification</p>
        <CheckRow name="applicationFormFilled" label="Loan application form filled" />
        <CheckRow name="appraisalReportAttached" label="Appraisal report attached" />
        <CheckRow name="stockAvailabilityChecked" label="Stock availability & valuation checked" />
        {isReturning && (
          <>
            <CheckRow name="supervisionReportAttached" label="Supervision report attached" />
            <CheckRow name="loanAmountReviewed" label="Principal amount reviewed" />
          </>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <Label htmlFor="bankDetails">Bank details</Label>
        <Input id="bankDetails" name="bankDetails" />
      </div>

      {isSuperAdmin && (
        <div className="space-y-1 border-t border-border pt-3">
          <label className="flex items-center gap-2.5 py-1 text-sm">
            <Checkbox
              name="instantApprove"
              checked={instantApprove}
              onCheckedChange={(v) => setInstantApprove(v === true)}
            />
            Approve and create immediately, skipping the review queue
          </label>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Submitting…" : instantApprove ? "Approve and create" : "Submit for review"}
      </Button>
    </form>
  );
}
