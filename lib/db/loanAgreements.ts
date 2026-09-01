import "server-only";
import { getDb } from "./client";
import { loanAgreements, clientTransactions, clients } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { saveTransactionRow, getTransactionRow } from "./transactions";
import { computeTotals, computeSchedule, nextDueInstallment } from "@/lib/services/loanAgreement";
import { generateLoanId } from "@/lib/services/clientCode";

export class OutstandingLoanError extends Error {}

// Throws if the client's most recent agreement still has an outstanding
// balance — call before creating a new one, whether direct-created by an
// admin or produced by approving a loan application.
export async function assertNoOutstandingLoan(clientId: number) {
  const active = await getActiveLoanSummary(clientId);
  if (active) {
    throw new OutstandingLoanError(
      `This client has an outstanding principal of ₦${active.remainingBalance.toLocaleString()} remaining on the principal started ${active.agreement.startDate}. A new principal cannot be issued until it is fully repaid.`,
    );
  }
}

export type LoanProduct = "biz" | "partner" | "lease";

export async function createLoanAgreement(data: {
  clientId: number;
  branchId: number;
  principalAmount: number;
  profitAmount: number;
  tenureWeeks: number;
  startDate: string;
  paymentDay: number;
  product: LoanProduct;
  purpose?: string;
  amountApplied?: number;
  recommendedAmount?: number;
  applicationFormFilled?: boolean;
  appraisalReportAttached?: boolean;
  supervisionReportAttached?: boolean;
  loanAmountReviewed?: boolean;
  stockAvailabilityChecked?: boolean;
  bankDetails?: string;
  createdBy: number;
}) {
  await assertNoOutstandingLoan(data.clientId);

  const db = getDb();
  const { totalRepayable, installmentAmount } = computeTotals(data);

  // A recovery amount already recorded for this client on the start date —
  // typically the previous loan's closing payment on a same-day renewal —
  // must be excluded from this new agreement's own recovered total (see
  // openingRecoveryOffset on the schema and getActiveLoanSummary below).
  const existing = await getTransactionRow(data.clientId, data.startDate);
  const openingRecoveryOffset = existing?.loanRecovery ?? "0";

  const agreement = await db.transaction(async (tx) => {
    const [client] = await tx.select({ clientCode: clients.clientCode }).from(clients).where(eq(clients.id, data.clientId));
    if (!client) throw new Error("Client not found.");
    const loanId = await generateLoanId(tx, data.clientId, client.clientCode);

    // Any other row still flagged active for this client must, per the
    // guard above, already be fully repaid — self-heal it here rather than
    // leaving a stale duplicate "active" row behind (see getActiveLoanSummary).
    await tx
      .update(loanAgreements)
      .set({ status: "completed" })
      .where(and(eq(loanAgreements.clientId, data.clientId), eq(loanAgreements.status, "active")));

    const [row] = await tx
      .insert(loanAgreements)
      .values({
        clientId: data.clientId,
        branchId: data.branchId,
        loanId,
        principalAmount: data.principalAmount.toFixed(2),
        profitAmount: data.profitAmount.toFixed(2),
        totalRepayable: totalRepayable.toFixed(2),
        tenureWeeks: data.tenureWeeks,
        installmentAmount: installmentAmount.toFixed(2),
        startDate: data.startDate,
        paymentDay: data.paymentDay,
        openingRecoveryOffset,
        purpose: data.purpose,
        product: data.product,
        amountApplied: data.amountApplied?.toFixed(2),
        recommendedAmount: data.recommendedAmount?.toFixed(2),
        applicationFormFilled: data.applicationFormFilled ?? false,
        appraisalReportAttached: data.appraisalReportAttached ?? false,
        supervisionReportAttached: data.supervisionReportAttached,
        loanAmountReviewed: data.loanAmountReviewed,
        stockAvailabilityChecked: data.stockAvailabilityChecked ?? false,
        bankDetails: data.bankDetails,
        createdBy: data.createdBy,
      })
      .returning();
    return row;
  });

  // Keep the existing ledger/reports consistent — the disbursement still
  // flows through Week Summary/Portfolio Tracker exactly as a manually
  // entered one would. saveTransactionRow's upsert sets every field, so any
  // other figure already recorded for this client/date is merged in rather
  // than overwritten.
  const newDisbursement = (Number(existing?.loanDisbursement ?? 0) + data.principalAmount).toFixed(2);
  await saveTransactionRow({
    clientId: data.clientId,
    branchId: data.branchId,
    transactionDate: data.startDate,
    loanDisbursement: newDisbursement,
    loanRecovery: existing?.loanRecovery ?? "0",
    profitInterest: existing?.profitInterest ?? "0",
    serviceCharge: existing?.serviceCharge ?? "0",
    newSavings: existing?.newSavings ?? "0",
    savingsRecall: existing?.savingsRecall ?? "0",
    collateralTransferIn: existing?.collateralTransferIn ?? "0",
    collateralTransferOut: existing?.collateralTransferOut ?? "0",
    notes: existing?.notes ?? undefined,
    recordedBy: data.createdBy,
  });

  return agreement;
}

export async function listLoanAgreementsForClient(clientId: number) {
  const db = getDb();
  return db.select().from(loanAgreements).where(eq(loanAgreements.clientId, clientId)).orderBy(desc(loanAgreements.startDate));
}

// The client's single most recent agreement, self-healed against actual
// recorded repayments rather than trusted from the stored `status` column —
// nothing else in the app ever updates that column, so treating remaining
// balance as the source of truth (and writing status back into sync when it
// drifts) is what keeps "does this client have an outstanding loan" correct
// without a cron job. Returns null when the client has no agreement at all,
// or their most recent one is already fully repaid.
export async function getActiveLoanSummary(clientId: number) {
  const db = getDb();
  const [agreement] = await db
    .select()
    .from(loanAgreements)
    .where(eq(loanAgreements.clientId, clientId))
    .orderBy(desc(loanAgreements.startDate))
    .limit(1);
  if (!agreement) return null;

  const [recovered] = await db
    .select({ total: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)` })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), sql`${clientTransactions.transactionDate} >= ${agreement.startDate}`));

  // Exclude whatever recovery was already sitting on the start-date row
  // before this agreement existed (see openingRecoveryOffset) — otherwise a
  // same-day renewal double-counts the previous loan's closing payment as
  // progress against this one too.
  const recoveredTotal = Math.max(0, Number(recovered?.total ?? 0) - Number(agreement.openingRecoveryOffset ?? 0));
  const totalRepayable = Number(agreement.totalRepayable);
  const remainingBalance = Math.max(0, totalRepayable - recoveredTotal);
  const isActive = remainingBalance > 0;
  const healedStatus = isActive ? "active" : "completed";
  if (agreement.status !== healedStatus) {
    await db.update(loanAgreements).set({ status: healedStatus }).where(eq(loanAgreements.id, agreement.id));
  }

  if (!isActive) return null;

  const schedule = computeSchedule({ ...agreement, totalRepayable });
  const nextDue = nextDueInstallment(schedule);

  return { agreement, schedule, nextDue, remainingBalance };
}
