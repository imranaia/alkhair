import "server-only";
import { getDb } from "./client";
import { clients, branches, users, clientTransactions } from "./schema";
import { eq, and, desc, ilike, or, inArray, sql } from "drizzle-orm";
import { generateClientCode, deriveEnrollmentWeekDay } from "@/lib/services/clientCode";
import { getBranch } from "./branches";

export async function listClients(params: { branchId: number | null; search?: string }) {
  const db = getDb();
  const conditions = [];
  if (params.branchId !== null) conditions.push(eq(clients.branchId, params.branchId));
  if (params.search) {
    conditions.push(or(ilike(clients.fullName, `%${params.search}%`), ilike(clients.clientCode, `%${params.search}%`)));
  }

  return db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      phone: clients.phone,
      address: clients.address,
      groupName: clients.groupName,
      businessType: clients.businessType,
      businessLocation: clients.businessLocation,
      status: clients.status,
      branchId: clients.branchId,
      branchName: branches.name,
      enrollmentDate: clients.enrollmentDate,
      loanCollectorId: clients.loanCollectorId,
      loanCollectorName: users.fullName,
    })
    .from(clients)
    .innerJoin(branches, eq(branches.id, clients.branchId))
    .leftJoin(users, eq(users.id, clients.loanCollectorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = getDb();
  const [row] = await db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      phone: clients.phone,
      address: clients.address,
      groupName: clients.groupName,
      businessType: clients.businessType,
      businessLocation: clients.businessLocation,
      status: clients.status,
      branchId: clients.branchId,
      branchName: branches.name,
      enrollmentDate: clients.enrollmentDate,
      loanCollectorId: clients.loanCollectorId,
      loanCollectorName: users.fullName,
    })
    .from(clients)
    .innerJoin(branches, eq(branches.id, clients.branchId))
    .leftJoin(users, eq(users.id, clients.loanCollectorId))
    .where(eq(clients.id, id));
  return row ?? null;
}

export async function listActiveClientsForSelect(branchId: number) {
  const db = getDb();
  return db
    .select({ id: clients.id, clientCode: clients.clientCode, fullName: clients.fullName })
    .from(clients)
    .where(and(eq(clients.branchId, branchId), eq(clients.status, "active")))
    .orderBy(clients.clientCode);
}

export const CLIENT_STATUSES = ["active", "dormant", "inactive"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export async function setClientStatus(id: number, status: ClientStatus) {
  const db = getDb();
  const [row] = await db.update(clients).set({ status, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
  return row;
}

// Dormant = has a savings balance but no transaction activity in the lookback
// window (default 60 days) — the same real-world pattern as the source
// ledger's own "Domant" sheet: clients who finished a loan cycle, didn't
// renew, and stopped showing up, but still have money on account.
export async function listDormantClients(params: { branchId: number | null; inactiveSinceDays?: number }) {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (params.inactiveSinceDays ?? 60));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const branchFilter = params.branchId !== null ? sql`and c.branch_id = ${params.branchId}` : sql``;

  const result = await db.execute<{
    id: number;
    client_code: string;
    full_name: string;
    branch_name: string;
    status: string;
    savings_balance: string;
    last_transaction_date: string | null;
  }>(sql`
    select
      c.id, c.client_code, c.full_name, b.name as branch_name, c.status,
      coalesce(latest.savings_balance_cf, 0) as savings_balance,
      latest.transaction_date as last_transaction_date
    from clients c
    join branches b on b.id = c.branch_id
    left join lateral (
      select ct.savings_balance_cf, ct.transaction_date
      from client_transactions ct
      where ct.client_id = c.id
      order by ct.transaction_date desc
      limit 1
    ) latest on true
    where c.status <> 'inactive' ${branchFilter}
      and (c.status = 'dormant' or latest.transaction_date is null or latest.transaction_date < ${cutoffStr})
    order by latest.transaction_date asc nulls first
  `);

  return result.rows.map((r) => ({
    id: r.id,
    clientCode: r.client_code,
    fullName: r.full_name,
    branchName: r.branch_name,
    status: r.status,
    savingsBalance: r.savings_balance,
    lastTransactionDate: r.last_transaction_date,
  }));
}

export async function filterClientIdsInBranch(clientIds: number[], branchId: number) {
  if (clientIds.length === 0) return new Set<number>();
  const db = getDb();
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(inArray(clients.id, clientIds), eq(clients.branchId, branchId)));
  return new Set(rows.map((r) => r.id));
}

export async function mapClientCodesToIds(branchId: number) {
  const db = getDb();
  const rows = await db.select({ id: clients.id, clientCode: clients.clientCode }).from(clients).where(eq(clients.branchId, branchId));
  return new Map(rows.map((r) => [r.clientCode.toLowerCase(), r.id]));
}

export async function listClientTransactions(clientId: number) {
  const db = getDb();
  return db
    .select()
    .from(clientTransactions)
    .where(eq(clientTransactions.clientId, clientId))
    .orderBy(desc(clientTransactions.transactionDate));
}

export async function createClient(data: {
  branchId: number;
  fullName: string;
  phone?: string;
  address?: string;
  groupName?: string;
  businessType?: string;
  businessLocation?: string;
  enrollmentDate: Date;
  loanCollectorId?: number;
  openingSavings?: string;
  createdByUserId: number;
}) {
  const db = getDb();
  const branch = await getBranch(data.branchId);
  if (!branch) throw new Error("Branch not found.");

  return db.transaction(async (tx) => {
    const { enrollmentWeek, enrollmentDay } = deriveEnrollmentWeekDay(data.enrollmentDate);
    const code = await generateClientCode(tx, branch.code, branch.id, enrollmentDay);

    const [client] = await tx
      .insert(clients)
      .values({
        clientCode: code,
        branchId: data.branchId,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        groupName: data.groupName,
        businessType: data.businessType,
        businessLocation: data.businessLocation,
        enrollmentWeek,
        enrollmentDay,
        enrollmentDate: data.enrollmentDate.toISOString().slice(0, 10),
        loanCollectorId: data.loanCollectorId,
      })
      .returning();

    if (data.openingSavings && Number(data.openingSavings) > 0) {
      await tx.insert(clientTransactions).values({
        clientId: client.id,
        branchId: data.branchId,
        transactionDate: data.enrollmentDate.toISOString().slice(0, 10),
        savingsBalanceBf: "0",
        newSavings: data.openingSavings,
        savingsBalanceCf: data.openingSavings,
        recordedBy: data.createdByUserId,
        notes: "Opening balance",
      });
    }

    return client;
  });
}

// Branch and enrollment date are deliberately excluded — enrollment date
// permanently fixes the client's code (see generateClientCode), and moving
// a client between branches has knock-on effects on collectors/reporting
// that this simple edit form isn't meant to handle.
export async function updateClient(
  id: number,
  data: {
    fullName: string;
    phone?: string;
    address?: string;
    groupName?: string;
    businessType?: string;
    businessLocation?: string;
    loanCollectorId?: number | null;
  },
) {
  const db = getDb();
  const [client] = await db
    .update(clients)
    .set({
      fullName: data.fullName,
      phone: data.phone || null,
      address: data.address || null,
      groupName: data.groupName || null,
      businessType: data.businessType || null,
      businessLocation: data.businessLocation || null,
      loanCollectorId: data.loanCollectorId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id))
    .returning();
  return client ?? null;
}
