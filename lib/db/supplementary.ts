import "server-only";
import { getDb } from "./client";
import { clients, clientTransactions, branches, loanAgreements } from "./schema";
import { eq, and, ne, gte, lte, sql, isNull, or } from "drizzle-orm";

// A "supplementary" payment is one made on a day other than the collection
// day set on the client's *current active loan* (loan_agreements.payment_day
// — set per agreement, since it can differ from one loan to the next, not a
// permanent client attribute) — derived automatically from the transaction
// date, never manually tagged. A client with no active loan has no schedule
// to be off from, so they don't appear here at all (inner join below).
// "early" = collected before their scheduled weekday, "late" = after it.
// Staff can override a false positive (e.g. data entered late for a payment
// actually collected on time) via supplementaryOverride='not_supplementary'.
export async function listSupplementaryPayments(params: {
  branchId: number | null;
  from: string;
  to: string;
  collectorId?: number;
  groupName?: string;
}) {
  const db = getDb();
  const conditions = [
    gte(clientTransactions.transactionDate, params.from),
    lte(clientTransactions.transactionDate, params.to),
    eq(loanAgreements.status, "active"),
    // Only rows where the client actually paid something in — excludes
    // disbursement-only visits, which have no "scheduled payment day" to miss.
    sql`(${clientTransactions.loanRecovery} > 0 OR ${clientTransactions.newSavings} > 0 OR ${clientTransactions.profitInterest} > 0 OR ${clientTransactions.serviceCharge} > 0)`,
    sql`extract(isodow from ${clientTransactions.transactionDate}) <> ${loanAgreements.paymentDay}`,
    or(isNull(clientTransactions.supplementaryOverride), ne(clientTransactions.supplementaryOverride, "not_supplementary")),
  ];
  if (params.branchId !== null) conditions.push(eq(clientTransactions.branchId, params.branchId));
  if (params.collectorId) conditions.push(eq(clients.loanCollectorId, params.collectorId));
  if (params.groupName) conditions.push(eq(clients.groupName, params.groupName));

  const rows = await db
    .select({
      id: clientTransactions.id,
      paymentId: clientTransactions.paymentId,
      transactionDate: clientTransactions.transactionDate,
      clientId: clients.id,
      clientCode: clients.clientCode,
      clientName: clients.fullName,
      groupName: clients.groupName,
      branchName: branches.name,
      assignedDay: loanAgreements.paymentDay,
      actualDay: sql<number>`extract(isodow from ${clientTransactions.transactionDate})::int`,
      loanRecovery: clientTransactions.loanRecovery,
      newSavings: clientTransactions.newSavings,
      profitInterest: clientTransactions.profitInterest,
      serviceCharge: clientTransactions.serviceCharge,
    })
    .from(clientTransactions)
    .innerJoin(clients, eq(clients.id, clientTransactions.clientId))
    .innerJoin(branches, eq(branches.id, clientTransactions.branchId))
    .innerJoin(loanAgreements, eq(loanAgreements.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(clientTransactions.transactionDate);

  return rows.map((r) => ({
    ...r,
    classification: r.actualDay < r.assignedDay ? ("early" as const) : ("late" as const),
  }));
}

export async function getTransactionBranchId(transactionId: number) {
  const db = getDb();
  const [row] = await db
    .select({ branchId: clientTransactions.branchId })
    .from(clientTransactions)
    .where(eq(clientTransactions.id, transactionId));
  return row?.branchId ?? null;
}

export async function setSupplementaryOverride(transactionId: number, notSupplementary: boolean) {
  const db = getDb();
  const [row] = await db
    .update(clientTransactions)
    .set({ supplementaryOverride: notSupplementary ? "not_supplementary" : null, updatedAt: new Date() })
    .where(eq(clientTransactions.id, transactionId))
    .returning({ id: clientTransactions.id, branchId: clientTransactions.branchId });
  return row ?? null;
}
