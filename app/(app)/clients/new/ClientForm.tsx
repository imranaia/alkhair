"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientAction, type ClientFormState } from "../actions";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";

const initialState: ClientFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ClientForm({
  branches,
  collectorsByBranch,
  showBranchSelect,
  defaultBranchId,
}: {
  branches: { id: number; name: string; code: string }[];
  collectorsByBranch: Record<number, { id: number; fullName: string }[]>;
  showBranchSelect: boolean;
  defaultBranchId?: number;
}) {
  const [state, formAction, pending] = useActionState(createClientAction, initialState);
  const [branchId, setBranchId] = useState<string>(defaultBranchId ? String(defaultBranchId) : "");

  const collectors = branchId ? (collectorsByBranch[Number(branchId)] ?? []) : [];

  return (
    <form action={formAction} className="space-y-4">
      {showBranchSelect && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" value={branchId} onValueChange={setBranchId} required>
            <SelectTrigger id="branchId" className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address">Address (optional)</Label>
        <Input id="address" name="address" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="groupName">Group (optional)</Label>
        <Input id="groupName" name="groupName" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessType">Trade / business (optional)</Label>
        <Input id="businessType" name="businessType" placeholder="e.g. Provisions, Food Stuff" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="businessLocation">Business location (optional)</Label>
        <Input id="businessLocation" name="businessLocation" placeholder="e.g. Kubwa Village" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="enrollmentDate">Enrollment date</Label>
        <Input id="enrollmentDate" name="enrollmentDate" type="date" defaultValue={today()} required />
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
          The client&apos;s weekly collection day — this permanently fixes part of their client code.
        </p>
      </div>

      {collectors.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="loanCollectorId">Collections officer (optional)</Label>
          <Select name="loanCollectorId" key={branchId}>
            <SelectTrigger id="loanCollectorId" className="w-full">
              <SelectValue placeholder="Assign later" />
            </SelectTrigger>
            <SelectContent>
              {collectors.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="openingSavings">Opening savings balance (optional)</Label>
        <Input id="openingSavings" name="openingSavings" type="number" min="0" step="0.01" />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Creating…" : "Create client"}
      </Button>
    </form>
  );
}
