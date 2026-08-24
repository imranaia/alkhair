"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReconciliationAction, getExpectedBookBalanceAction, type ReconciliationFormState } from "../actions";

const initialState: ReconciliationFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ReconciliationForm({
  branches,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  showBranchSelect: boolean;
}) {
  const [state, formAction, pending] = useActionState(createReconciliationAction, initialState);
  const [bankBalance, setBankBalance] = useState("");
  const [cashBalance, setCashBalance] = useState("");
  const [bookBalance, setBookBalance] = useState("");
  const [reconDate, setReconDate] = useState(today());
  const [branchId, setBranchId] = useState("");
  const [autoCalcPending, startAutoCalc] = useTransition();

  const variance = Number(bankBalance || 0) + Number(cashBalance || 0) - Number(bookBalance || 0);

  function autoCalculateBookBalance() {
    startAutoCalc(async () => {
      const result = await getExpectedBookBalanceAction({
        branchId: branchId ? Number(branchId) : undefined,
        reconDate,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.value !== null) {
        setBookBalance(result.value);
      }
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {showBranchSelect && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" required onValueChange={setBranchId}>
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
        <Label htmlFor="reconDate">Date</Label>
        <Input
          id="reconDate"
          name="reconDate"
          type="date"
          value={reconDate}
          onChange={(e) => setReconDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountName">Account (optional)</Label>
        <Input id="accountName" name="accountName" placeholder="e.g. Operations account, Investment account" />
        <p className="text-xs text-muted-foreground">
          Leave blank for the branch&apos;s single/main account. Auto-calculate only applies to the main account.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bankBalance">Bank balance</Label>
        <Input
          id="bankBalance"
          name="bankBalance"
          type="number"
          step="0.01"
          required
          value={bankBalance}
          onChange={(e) => setBankBalance(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cashBalance">Cash balance</Label>
        <Input
          id="cashBalance"
          name="cashBalance"
          type="number"
          step="0.01"
          required
          value={cashBalance}
          onChange={(e) => setCashBalance(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="bookBalance">Book balance</Label>
          <button
            type="button"
            onClick={autoCalculateBookBalance}
            disabled={autoCalcPending}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
          >
            <Wand2 className="size-3" />
            {autoCalcPending ? "Calculating…" : "Auto-calculate"}
          </button>
        </div>
        <Input
          id="bookBalance"
          name="bookBalance"
          type="number"
          step="0.01"
          required
          value={bookBalance}
          onChange={(e) => setBookBalance(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Calculated from your last reconciliation plus everything recorded since — adjust if your physical count differs.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        Variance:{" "}
        <span className={variance === 0 ? "font-semibold" : "font-semibold text-destructive"}>
          {variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
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

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Saving…" : "Save reconciliation"}
      </Button>
    </form>
  );
}
