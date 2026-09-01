"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { createLoanAgreementAction, type AgreementFormState } from "../portalActions";

const initialState: AgreementFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function NewAgreementForm({ clientId }: { clientId: number }) {
  const [state, formAction, pending] = useActionState(createLoanAgreementAction, initialState);

  return (
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

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Creating…" : "Create agreement"}
      </Button>
    </form>
  );
}
