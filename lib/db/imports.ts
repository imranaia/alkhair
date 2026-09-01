import "server-only";
import { getDb } from "./client";
import { importBatches, importRows, branches, users, clientTransactions } from "./schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { createClient } from "./clients";
import { createExpense } from "./expenses";
import { saveTransactionRow, isEmptyRow } from "./transactions";
import { createCashBookEntryBulk, recomputeRunningBalances } from "./cashBook";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import type { ParsedClientRow, ParsedExpenseRow, ParsedTransactionRow, ParsedCashBookRow } from "@/lib/services/excelImport";

const PAYMENT_DAY_BY_NAME = new Map(PAYMENT_DAYS.map((d) => [d.label.toLowerCase(), d.value]));

function parsePaymentDay(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const byName = PAYMENT_DAY_BY_NAME.get(trimmed.toLowerCase());
  if (byName) return byName;
  const asNumber = Number(trimmed);
  return Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 6 ? asNumber : undefined;
}

export const IMPORT_TYPE_LABELS: Record<string, string> = {
  clients: "Clients",
  expenses: "Expenses",
  transactions: "Daily Transactions",
  cash_book: "Cash Book",
};

export async function listImportBatches(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      importType: importBatches.importType,
      status: importBatches.status,
      totalRows: importBatches.totalRows,
      successRows: importBatches.successRows,
      errorRows: importBatches.errorRows,
      createdAt: importBatches.createdAt,
      branchName: branches.name,
      uploadedByName: users.fullName,
    })
    .from(importBatches)
    .leftJoin(branches, eq(branches.id, importBatches.branchId))
    .innerJoin(users, eq(users.id, importBatches.uploadedBy))
    .where(params.branchId !== null ? eq(importBatches.branchId, params.branchId) : undefined)
    .orderBy(desc(importBatches.createdAt));
}

export async function getImportBatch(id: number) {
  const db = getDb();
  const [batch] = await db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      importType: importBatches.importType,
      status: importBatches.status,
      totalRows: importBatches.totalRows,
      successRows: importBatches.successRows,
      errorRows: importBatches.errorRows,
      branchId: importBatches.branchId,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.id, id));
  return batch ?? null;
}

export async function getImportBatchRows(batchId: number) {
  const db = getDb();
  return db
    .select({
      id: importRows.id,
      rowNumber: importRows.rowNumber,
      status: importRows.status,
      errorMessage: importRows.errorMessage,
      rawData: importRows.rawData,
      createdClientId: importRows.createdClientId,
      createdExpenseId: importRows.createdExpenseId,
      createdTxnId: importRows.createdTxnId,
      createdCashBookEntryId: importRows.createdCashBookEntryId,
    })
    .from(importRows)
    .where(eq(importRows.importBatchId, batchId))
    .orderBy(asc(importRows.rowNumber));
}

export async function runClientImport(params: {
  branchId: number;
  fileName: string;
  uploadedBy: number;
  rows: ParsedClientRow[];
  collectorsByName: Map<string, number>;
}) {
  const db = getDb();
  const [batch] = await db
    .insert(importBatches)
    .values({
      branchId: params.branchId,
      uploadedBy: params.uploadedBy,
      fileName: params.fileName,
      importType: "clients",
      status: "processing",
      totalRows: params.rows.length,
      startedAt: new Date(),
    })
    .returning();

  let successRows = 0;
  let errorRows = 0;

  try {
    for (const row of params.rows) {
      try {
        if (!row.fullName) throw new Error("Full name is required.");
        if (!row.enrollmentDate || Number.isNaN(Date.parse(row.enrollmentDate))) {
          throw new Error("Enrollment date is missing or invalid.");
        }
        const paymentDay = parsePaymentDay(row.paymentDay);
        if (!paymentDay) {
          throw new Error("Payment Day is missing or invalid — use Monday–Saturday.");
        }

        const loanCollectorId = row.loanCollectorName
          ? params.collectorsByName.get(row.loanCollectorName.toLowerCase())
          : undefined;

        const client = await createClient({
          branchId: params.branchId,
          fullName: row.fullName,
          phone: row.phone || undefined,
          address: row.address || undefined,
          groupName: row.groupName || undefined,
          enrollmentDate: new Date(row.enrollmentDate),
          paymentDay,
          loanCollectorId,
          openingSavings: row.openingSavings || undefined,
          createdByUserId: params.uploadedBy,
        });

        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "success",
          createdClientId: client.id,
        });
        successRows++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "error",
          errorMessage: message,
        });
        errorRows++;
      }
    }
  } finally {
    // Always finalize the batch status, even if something above threw
    // outside the per-row handling — otherwise it's left "processing"
    // forever with no way to tell what actually committed.
    await db
      .update(importBatches)
      .set({ status: "completed", successRows, errorRows, completedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
  }

  return { batchId: batch.id, successRows, errorRows, totalRows: params.rows.length };
}

function toAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export async function runTransactionImport(params: {
  branchId: number;
  fileName: string;
  uploadedBy: number;
  rows: ParsedTransactionRow[];
  clientCodesById: Map<string, number>;
}) {
  const db = getDb();
  const [batch] = await db
    .insert(importBatches)
    .values({
      branchId: params.branchId,
      uploadedBy: params.uploadedBy,
      fileName: params.fileName,
      importType: "transactions",
      status: "processing",
      totalRows: params.rows.length,
      startedAt: new Date(),
    })
    .returning();

  let successRows = 0;
  let errorRows = 0;

  try {
    for (const row of params.rows) {
      try {
        if (!row.clientCode) throw new Error("Client Code is required.");
        const clientId = params.clientCodesById.get(row.clientCode.toLowerCase());
        if (!clientId) throw new Error(`Unknown client code "${row.clientCode}" for this branch.`);
        if (!row.transactionDate || Number.isNaN(Date.parse(row.transactionDate))) {
          throw new Error("Date is missing or invalid.");
        }

        const amounts = {
          loanDisbursement: toAmount(row.loanDisbursement),
          loanRecovery: toAmount(row.loanRecovery),
          profitInterest: toAmount(row.profitInterest),
          serviceCharge: toAmount(row.serviceCharge),
          newSavings: toAmount(row.newSavings),
          savingsRecall: toAmount(row.savingsRecall),
          collateralTransferIn: toAmount(row.collateralTransferIn),
          collateralTransferOut: toAmount(row.collateralTransferOut),
        };
        for (const [key, value] of Object.entries(amounts)) {
          if (Number.isNaN(value) || value < 0) throw new Error(`Invalid amount for ${key}.`);
        }
        if (isEmptyRow({ ...amounts, notes: row.notes })) {
          throw new Error("Row has no activity — every amount is 0.");
        }

        await saveTransactionRow({
          clientId,
          branchId: params.branchId,
          transactionDate: row.transactionDate,
          loanDisbursement: amounts.loanDisbursement.toString(),
          loanRecovery: amounts.loanRecovery.toString(),
          profitInterest: amounts.profitInterest.toString(),
          serviceCharge: amounts.serviceCharge.toString(),
          newSavings: amounts.newSavings.toString(),
          savingsRecall: amounts.savingsRecall.toString(),
          collateralTransferIn: amounts.collateralTransferIn.toString(),
          collateralTransferOut: amounts.collateralTransferOut.toString(),
          notes: row.notes || undefined,
          recordedBy: params.uploadedBy,
        });

        const [txn] = await db
          .select({ id: clientTransactions.id })
          .from(clientTransactions)
          .where(and(eq(clientTransactions.clientId, clientId), eq(clientTransactions.transactionDate, row.transactionDate)));

        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "success",
          createdTxnId: txn?.id,
        });
        successRows++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "error",
          errorMessage: message,
        });
        errorRows++;
      }
    }
  } finally {
    await db
      .update(importBatches)
      .set({ status: "completed", successRows, errorRows, completedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
  }

  return { batchId: batch.id, successRows, errorRows, totalRows: params.rows.length };
}

export async function runCashBookImport(params: {
  branchId: number;
  fileName: string;
  uploadedBy: number;
  rows: ParsedCashBookRow[];
}) {
  const db = getDb();
  const [batch] = await db
    .insert(importBatches)
    .values({
      branchId: params.branchId,
      uploadedBy: params.uploadedBy,
      fileName: params.fileName,
      importType: "cash_book",
      status: "processing",
      totalRows: params.rows.length,
      startedAt: new Date(),
    })
    .returning();

  let successRows = 0;
  let errorRows = 0;
  // Distinct (branch, account) pairs touched by this import — recomputed
  // once each after every row is in, instead of once per row.
  const touchedAccounts = new Set<string | null>();

  try {
    for (const row of params.rows) {
      try {
        if (!row.entryDate || Number.isNaN(Date.parse(row.entryDate))) {
          throw new Error("Date is missing or invalid.");
        }
        const refType = row.refType ? row.refType.trim().toUpperCase() : undefined;
        if (refType && !["OR", "PV", "CQ"].includes(refType)) {
          throw new Error(`Ref Type must be OR, PV, or CQ (got "${row.refType}").`);
        }
        const debit = toAmount(row.debit);
        const credit = toAmount(row.credit);
        if (Number.isNaN(debit) || Number.isNaN(credit) || debit < 0 || credit < 0) {
          throw new Error("Debit and Credit must be non-negative numbers.");
        }
        if (debit === 0 && credit === 0) throw new Error("Enter a debit or credit amount.");

        const accountName = row.accountName || undefined;
        const entry = await createCashBookEntryBulk({
          branchId: params.branchId,
          entryDate: row.entryDate,
          accountName,
          details: row.details || undefined,
          refType,
          debit: debit.toString(),
          credit: credit.toString(),
          recordedBy: params.uploadedBy,
        });
        touchedAccounts.add(accountName ?? null);

        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "success",
          createdCashBookEntryId: entry.id,
        });
        successRows++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "error",
          errorMessage: message,
        });
        errorRows++;
      }
    }

    for (const accountName of touchedAccounts) {
      await db.transaction((tx) => recomputeRunningBalances(tx, params.branchId, accountName));
    }
  } finally {
    // Always finalize the batch status, even if something above threw
    // outside the per-row handling — otherwise it's left "processing"
    // forever with no way to tell what actually committed.
    await db
      .update(importBatches)
      .set({ status: "completed", successRows, errorRows, completedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
  }

  return { batchId: batch.id, successRows, errorRows, totalRows: params.rows.length };
}

export async function runExpenseImport(params: {
  branchId: number;
  fileName: string;
  uploadedBy: number;
  rows: ParsedExpenseRow[];
  categoriesByName: Map<string, number>;
}) {
  const db = getDb();
  const [batch] = await db
    .insert(importBatches)
    .values({
      branchId: params.branchId,
      uploadedBy: params.uploadedBy,
      fileName: params.fileName,
      importType: "expenses",
      status: "processing",
      totalRows: params.rows.length,
      startedAt: new Date(),
    })
    .returning();

  let successRows = 0;
  let errorRows = 0;

  try {
    for (const row of params.rows) {
      try {
        if (!row.category) throw new Error("Category is required.");
        const categoryId = params.categoriesByName.get(row.category.toLowerCase());
        if (!categoryId) throw new Error(`Unknown category "${row.category}".`);
        if (!row.description) throw new Error("Description is required.");
        if (!row.amount || Number.isNaN(Number(row.amount))) throw new Error("Amount is missing or invalid.");
        if (!row.expenseDate || Number.isNaN(Date.parse(row.expenseDate))) {
          throw new Error("Expense date is missing or invalid.");
        }

        const expense = await createExpense({
          branchId: params.branchId,
          categoryId,
          description: row.description,
          amount: row.amount,
          receiptRef: row.receiptRef || undefined,
          expenseDate: row.expenseDate,
          recordedBy: params.uploadedBy,
        });

        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "success",
          createdExpenseId: expense.id,
        });
        successRows++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error.";
        await db.insert(importRows).values({
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.raw,
          status: "error",
          errorMessage: message,
        });
        errorRows++;
      }
    }
  } finally {
    await db
      .update(importBatches)
      .set({ status: "completed", successRows, errorRows, completedAt: new Date() })
      .where(eq(importBatches.id, batch.id));
  }

  return { batchId: batch.id, successRows, errorRows, totalRows: params.rows.length };
}
