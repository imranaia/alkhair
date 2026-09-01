import "server-only";
import { getDb } from "./client";
import { pendingChanges, clients, clientTransactions, users } from "./schema";
import { eq, and, or, ne, asc, sql } from "drizzle-orm";

export type PendingEntityType = "client" | "client_transaction" | "loan_agreement_application";

export async function submitForApproval(params: {
  entityType: PendingEntityType;
  entityId: number;
  branchId: number;
  proposedChanges: Record<string, unknown>;
  requestedBy: number;
}) {
  const db = getDb();
  const [row] = await db
    .insert(pendingChanges)
    .values({
      entityType: params.entityType,
      entityId: params.entityId,
      branchId: params.branchId,
      proposedChanges: params.proposedChanges,
      requestedBy: params.requestedBy,
    })
    .returning();
  return row;
}

export async function listPendingChanges(branchId: number | null) {
  const db = getDb();
  const requester = users;
  return db
    .select({
      id: pendingChanges.id,
      entityType: pendingChanges.entityType,
      entityId: pendingChanges.entityId,
      branchId: pendingChanges.branchId,
      proposedChanges: pendingChanges.proposedChanges,
      requestedAt: pendingChanges.requestedAt,
      requestedByName: requester.fullName,
      clientCode: clients.clientCode,
      clientFullName: clients.fullName,
    })
    .from(pendingChanges)
    .innerJoin(requester, eq(requester.id, pendingChanges.requestedBy))
    .leftJoin(
      clientTransactions,
      and(eq(pendingChanges.entityType, "client_transaction"), eq(clientTransactions.id, pendingChanges.entityId)),
    )
    .leftJoin(
      clients,
      or(
        and(eq(pendingChanges.entityType, "client"), eq(clients.id, pendingChanges.entityId)),
        and(eq(pendingChanges.entityType, "client_transaction"), eq(clients.id, clientTransactions.clientId)),
      ),
    )
    .where(
      branchId !== null
        ? and(
            eq(pendingChanges.status, "pending"),
            eq(pendingChanges.branchId, branchId),
            ne(pendingChanges.entityType, "loan_agreement_application"),
          )
        : and(eq(pendingChanges.status, "pending"), ne(pendingChanges.entityType, "loan_agreement_application")),
    )
    // Oldest request first and staying there — admins work the queue in the order it came in.
    .orderBy(asc(pendingChanges.requestedAt));
}

// Loan applications get their own dedicated review page rather than the
// generic Approvals queue above — entityId here is the clientId the
// application is for (a real, existing row; there's no loan_agreements row
// yet at request time, so there's nothing else for it to reference).
export async function listPendingLoanApplications(branchId: number | null) {
  const db = getDb();
  return db
    .select({
      id: pendingChanges.id,
      clientId: pendingChanges.entityId,
      branchId: pendingChanges.branchId,
      proposedChanges: pendingChanges.proposedChanges,
      requestedAt: pendingChanges.requestedAt,
      requestedByName: users.fullName,
      clientCode: clients.clientCode,
      clientFullName: clients.fullName,
      clientPhone: clients.phone,
      clientBusinessType: clients.businessType,
      // Whether this client has any loan agreement already — decides
      // whether the approval dialog shows the returning-client-only
      // checklist items (supervision report, principal amount reviewed).
      isReturningClient: sql<boolean>`exists(select 1 from loan_agreements la where la.client_id = ${pendingChanges.entityId})`,
    })
    .from(pendingChanges)
    .innerJoin(users, eq(users.id, pendingChanges.requestedBy))
    .innerJoin(clients, eq(clients.id, pendingChanges.entityId))
    .where(
      branchId !== null
        ? and(
            eq(pendingChanges.status, "pending"),
            eq(pendingChanges.entityType, "loan_agreement_application"),
            eq(pendingChanges.branchId, branchId),
          )
        : and(eq(pendingChanges.status, "pending"), eq(pendingChanges.entityType, "loan_agreement_application")),
    )
    // Oldest request first and staying there — admins work the queue in the order it came in.
    .orderBy(asc(pendingChanges.requestedAt));
}

export async function getPendingChangeById(id: number) {
  const db = getDb();
  const [row] = await db.select().from(pendingChanges).where(eq(pendingChanges.id, id));
  return row ?? null;
}

// Branch admin's "recommend" step on a pending loan application — merges a
// recommended amount (and who set it) into the request's proposed_changes
// without touching its status, so it stays pending for the actual approver.
// Not a claim: unlike approval, two people recommending in quick succession
// isn't a correctness problem, so this is a plain conditional update rather
// than an atomic claim-or-fail.
export async function recommendLoanApplicationAmount(id: number, recommendedAmount: number, recommendedByName: string) {
  const db = getDb();
  const existing = await getPendingChangeById(id);
  if (!existing || existing.status !== "pending") return null;

  const proposedChanges = { ...(existing.proposedChanges as Record<string, unknown>), recommendedAmount, recommendedByName };
  const [row] = await db
    .update(pendingChanges)
    .set({ proposedChanges })
    .where(and(eq(pendingChanges.id, id), eq(pendingChanges.status, "pending")))
    .returning();
  return row ?? null;
}

// For rendering a before/after diff on the approvals page. entityId for a
// 'client_transaction' pending change is the client_transactions row's own
// primary key (known at submission time, since a non-admin edit can only
// target a row that already exists).
export async function getCurrentClientTransactionRow(id: number) {
  const db = getDb();
  const [row] = await db.select().from(clientTransactions).where(eq(clientTransactions.id, id));
  return row ?? null;
}

// Atomically transitions a pending change to 'approved'/'rejected' only if
// it's still 'pending' — a single UPDATE...WHERE...RETURNING is row-locked
// by Postgres, so if two admins approve the same request within moments of
// each other (or a double-click fires the action twice), only the first
// actually matches the WHERE clause; the second gets zero rows back and
// must treat it as already handled instead of re-applying the request.
// Returns null when another request already claimed it.
export async function claimPendingChangeApproval(id: number, reviewedBy: number) {
  const db = getDb();
  const [row] = await db
    .update(pendingChanges)
    .set({ status: "approved", reviewedBy, reviewedAt: new Date() })
    .where(and(eq(pendingChanges.id, id), eq(pendingChanges.status, "pending")))
    .returning();
  return row ?? null;
}

export async function claimPendingChangeRejection(id: number, reviewedBy: number, reviewNote?: string) {
  const db = getDb();
  const [row] = await db
    .update(pendingChanges)
    .set({ status: "rejected", reviewedBy, reviewedAt: new Date(), reviewNote })
    .where(and(eq(pendingChanges.id, id), eq(pendingChanges.status, "pending")))
    .returning();
  return row ?? null;
}

// If work that has to happen *after* a successful claim (e.g. creating the
// loan agreement it approves) fails partway through, put the request back
// to 'pending' rather than leaving it stuck 'approved' with nothing to show
// for it — the admin can just retry instead of the request silently vanishing.
export async function revertPendingChangeToPending(id: number) {
  const db = getDb();
  await db
    .update(pendingChanges)
    .set({ status: "pending", reviewedBy: null, reviewedAt: null })
    .where(eq(pendingChanges.id, id));
}
