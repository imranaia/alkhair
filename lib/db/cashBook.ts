import "server-only";
import { getDb } from "./client";
import type { DbTx } from "./client";
import { cashBookEntries, users } from "./schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { generatePaymentId } from "@/lib/services/paymentId";

export async function listCashBookEntries(params: { branchId: number; accountName?: string }) {
  const db = getDb();
  const conditions = [eq(cashBookEntries.branchId, params.branchId)];
  if (params.accountName) conditions.push(eq(cashBookEntries.accountName, params.accountName));

  return db
    .select({
      id: cashBookEntries.id,
      entryDate: cashBookEntries.entryDate,
      code: cashBookEntries.code,
      accountName: cashBookEntries.accountName,
      details: cashBookEntries.details,
      refType: cashBookEntries.refType,
      refNumber: cashBookEntries.refNumber,
      debit: cashBookEntries.debit,
      credit: cashBookEntries.credit,
      runningBalance: cashBookEntries.runningBalance,
      recordedByName: users.fullName,
    })
    .from(cashBookEntries)
    .innerJoin(users, eq(users.id, cashBookEntries.recordedBy))
    .where(and(...conditions))
    .orderBy(asc(cashBookEntries.entryDate), asc(cashBookEntries.id));
}

export async function listCashBookAccountNames(branchId: number) {
  const db = getDb();
  const rows = await db
    .selectDistinct({ accountName: cashBookEntries.accountName })
    .from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), sql`${cashBookEntries.accountName} is not null`));
  return rows.map((r) => r.accountName).filter((a): a is string => !!a);
}

// Recomputes every row's running balance in one statement, scoped per
// (branch, account) — each named sub-account keeps its own independent
// running balance, same as the source cash book.
//
// Matches the source cash book's own formula (balance = prior - debit + credit,
// i.e. a bank-statement view: debit is money paid out, credit is money received).
//
// This is a single set-based UPDATE using a window function rather than a
// read-all-rows-then-update-one-at-a-time loop: the old loop ran outside any
// transaction, so a crash partway through left balances half-updated with no
// repair path, and two entries recorded close together could race and
// overwrite each other's math. A single UPDATE is atomic — it either fully
// applies or fully rolls back with the rest of the caller's transaction, and
// Postgres row-locks the affected rows for its duration, so a second
// concurrent recompute on the same (branch, account) simply waits its turn
// rather than reading a stale in-flight balance.
export async function recomputeRunningBalances(tx: DbTx, branchId: number, accountName: string | null) {
  const accountCondition = accountName === null ? sql`account_name is null` : sql`account_name = ${accountName}`;

  await tx.execute(sql`
    with computed as (
      select id, sum(credit - debit) over (order by entry_date, id) as balance
      from cash_book_entries
      where branch_id = ${branchId} and ${accountCondition}
    )
    update cash_book_entries as e
    set running_balance = computed.balance
    from computed
    where e.id = computed.id
  `);
}

type NewCashBookEntry = {
  branchId: number;
  entryDate: string;
  code?: string;
  accountName?: string;
  details?: string;
  refType?: string;
  debit: string;
  credit: string;
  recordedBy: number;
};

async function insertCashBookEntry(tx: DbTx, data: NewCashBookEntry) {
  const refNumber = await generatePaymentId(tx, data.branchId, new Date(data.entryDate));
  const [row] = await tx
    .insert(cashBookEntries)
    .values({ ...data, refNumber, runningBalance: "0" })
    .returning();
  return row;
}

export async function createCashBookEntry(data: NewCashBookEntry) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const row = await insertCashBookEntry(tx, data);
    await recomputeRunningBalances(tx, data.branchId, data.accountName ?? null);
    const [updated] = await tx.select().from(cashBookEntries).where(eq(cashBookEntries.id, row.id));
    return updated ?? row;
  });
}

// For bulk imports: inserts one entry without recomputing running balances —
// the caller is responsible for calling recomputeRunningBalances itself once
// per (branch, account) after every row is in, rather than once per row.
// Recomputing per row on an import is what previously turned a few hundred
// imported rows into well over a million sequential updates against an
// already-established branch.
export async function createCashBookEntryBulk(data: NewCashBookEntry) {
  const db = getDb();
  return db.transaction((tx) => insertCashBookEntry(tx, data));
}
