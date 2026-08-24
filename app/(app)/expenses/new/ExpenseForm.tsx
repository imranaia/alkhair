"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpenseAction, type ExpenseFormState } from "../actions";

const initialState: ExpenseFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({
  branches,
  categories,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  categories: { id: number; name: string }[];
  showBranchSelect: boolean;
}) {
  const [state, formAction, pending] = useActionState(createExpenseAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {showBranchSelect && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" required>
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
        <Label htmlFor="categoryId">Category</Label>
        <Select name="categoryId" required>
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="receiptRef">Receipt ref. (optional)</Label>
        <Input id="receiptRef" name="receiptRef" placeholder="e.g. PV-0231" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expenseDate">Expense date</Label>
        <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today()} required />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        {pending ? "Saving…" : "Save expense"}
      </Button>
    </form>
  );
}
