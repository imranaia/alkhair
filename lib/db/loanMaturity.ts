import "server-only";
import { getDb } from "./client";
import { loanMaturityEvents, clients, branches, users } from "./schema";
import { eq, desc } from "drizzle-orm";

export async function listLoanMaturityEvents(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: loanMaturityEvents.id,
      clientId: loanMaturityEvents.clientId,
      clientCode: clients.clientCode,
      clientName: clients.fullName,
      branchName: branches.name,
      maturedAt: loanMaturityEvents.maturedAt,
      renewed: loanMaturityEvents.renewed,
      amountWithClient: loanMaturityEvents.amountWithClient,
      notes: loanMaturityEvents.notes,
      recordedByName: users.fullName,
    })
    .from(loanMaturityEvents)
    .innerJoin(clients, eq(clients.id, loanMaturityEvents.clientId))
    .innerJoin(branches, eq(branches.id, loanMaturityEvents.branchId))
    .innerJoin(users, eq(users.id, loanMaturityEvents.recordedBy))
    .where(params.branchId !== null ? eq(loanMaturityEvents.branchId, params.branchId) : undefined)
    .orderBy(desc(loanMaturityEvents.maturedAt));
}

export async function createLoanMaturityEvent(data: {
  clientId: number;
  branchId: number;
  maturedAt: string;
  renewed: boolean;
  amountWithClient?: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = getDb();
  const [row] = await db.insert(loanMaturityEvents).values(data).returning();
  return row;
}
