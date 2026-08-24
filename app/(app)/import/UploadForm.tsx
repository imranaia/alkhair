"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  importClientsAction,
  importExpensesAction,
  importTransactionsAction,
  importCashBookAction,
  type ImportFormState,
} from "./actions";

const initialState: ImportFormState = { error: null };

type ImportKind = "clients" | "expenses" | "transactions" | "cash_book";

const KIND_LABEL: Record<ImportKind, string> = {
  clients: "Clients",
  expenses: "Expenses",
  transactions: "Daily Transactions",
  cash_book: "Cash Book",
};
const KIND_HINT: Record<ImportKind, string> = {
  clients:
    "Upload an .xlsx file with columns: Full Name, Phone, Address, Group, Enrollment Date, Payment Day, Collections Officer, Opening Savings.",
  expenses: "Upload an .xlsx file with columns: Category, Description, Amount, Expense Date, Receipt Ref.",
  transactions:
    "Upload an .xlsx file with columns: Client Code, Date, Principal Disbursement, Principal Recovery, Profit, Service Charge, New Savings, Savings Recall, Collateral In, Collateral Out, Notes.",
  cash_book: "Upload an .xlsx file with columns: Date, Account, Details, Ref Type (OR/PV/CQ), Debit, Credit.",
};

export function UploadForm({
  branches,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  showBranchSelect: boolean;
}) {
  const [kind, setKind] = useState<ImportKind>("clients");
  const [clientState, clientFormAction, clientPending] = useActionState(importClientsAction, initialState);
  const [expenseState, expenseFormAction, expensePending] = useActionState(importExpensesAction, initialState);
  const [txnState, txnFormAction, txnPending] = useActionState(importTransactionsAction, initialState);
  const [cashBookState, cashBookFormAction, cashBookPending] = useActionState(importCashBookAction, initialState);

  const { state, formAction, pending } = {
    clients: { state: clientState, formAction: clientFormAction, pending: clientPending },
    expenses: { state: expenseState, formAction: expenseFormAction, pending: expensePending },
    transactions: { state: txnState, formAction: txnFormAction, pending: txnPending },
    cash_book: { state: cashBookState, formAction: cashBookFormAction, pending: cashBookPending },
  }[kind];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="importKind">What are you importing?</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as ImportKind)}>
          <SelectTrigger id="importKind" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clients">Clients</SelectItem>
            <SelectItem value="expenses">Expenses</SelectItem>
            <SelectItem value="transactions">Daily Transactions</SelectItem>
            <SelectItem value="cash_book">Cash Book</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{KIND_HINT[kind]}</p>
        <Button asChild variant="secondary" size="sm" className="shrink-0 gap-1.5">
          <Link href={`/import/template?type=${kind}`}>
            <Download className="size-4" />
            Template
          </Link>
        </Button>
      </div>

      <form key={kind} action={formAction} className="space-y-4">
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
          <Label htmlFor="file">Excel file</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          {pending ? "Importing…" : `Import ${KIND_LABEL[kind].toLowerCase()}`}
        </Button>
      </form>
    </div>
  );
}
