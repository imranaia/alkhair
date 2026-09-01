import "server-only";
import { getDb } from "./client";
import { clients, clientTransactions } from "./schema";
import { eq, and, asc, desc, lt, sql } from "drizzle-orm";
import type { DbTx } from "./client";
import { generatePaymentId } from "@/lib/services/paymentId";
import { startOfWeek, getISODay } from "date-fns";

export async function listDailyEntryRows(params: { branchId: number; collectorId?: number; date: string }) {
  const db = getDb();
  const conditions = [eq(clients.status, "active"), eq(clients.branchId, params.branchId)];
  if (params.collectorId) conditions.push(eq(clients.loanCollectorId, params.collectorId));

  const weekStart = startOfWeek(new Date(params.date + "T00:00:00Z"), { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const selectedDay = getISODay(new Date(params.date + "T00:00:00Z"));

  const rows = await db
    .select({
      clientId: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      groupName: clients.groupName,
      // The officer-assigned weekly collection day (baked into the client
      // code at enrollment) — not clients.enrollmentDay, which is only the
      // weekday the enrollment date happened to fall on and no longer drives
      // anything (see deriveEnrollmentWeekDay in lib/services/clientCode.ts).
      paymentDay: clients.paymentDay,
      paymentId: clientTransactions.paymentId,
      loanDisbursement: clientTransactions.loanDisbursement,
      loanRecovery: clientTransactions.loanRecovery,
      profitInterest: clientTransactions.profitInterest,
      serviceCharge: clientTransactions.serviceCharge,
      newSavings: clientTransactions.newSavings,
      savingsRecall: clientTransactions.savingsRecall,
      collateralTransferIn: clientTransactions.collateralTransferIn,
      collateralTransferOut: clientTransactions.collateralTransferOut,
      notes: clientTransactions.notes,
      supplementaryOverride: clientTransactions.supplementaryOverride,
      savingsBalanceBf: sql<string>`coalesce((
        select ct.savings_balance_cf from client_transactions ct
        where ct.client_id = ${clients.id} and ct.transaction_date < ${params.date}
        order by ct.transaction_date desc limit 1
      ), '0')`.as("savings_balance_bf"),
      // Most recent day this week (up to the selected date) the client actually
      // paid something in — used to tell "paid on time" from "paid early/late
      // (supplementary)" apart from "hasn't paid yet this week".
      lastPaymentThisWeek: sql<string | null>`(
        select ct.transaction_date::text from client_transactions ct
        where ct.client_id = ${clients.id}
          and ct.transaction_date >= ${weekStart} and ct.transaction_date <= ${params.date}
          and (ct.loan_recovery > 0 or ct.new_savings > 0 or ct.profit_interest > 0 or ct.service_charge > 0)
        order by ct.transaction_date desc limit 1
      )`,
    })
    .from(clients)
    .leftJoin(
      clientTransactions,
      and(eq(clientTransactions.clientId, clients.id), eq(clientTransactions.transactionDate, params.date)),
    )
    .where(and(...conditions))
    .orderBy(asc(clients.clientCode));

  return rows.map((r) => {
    let paymentStatus: "paid_on_day" | "paid_supplementary" | "due_today" | "overdue" | "not_due_yet";
    if (r.lastPaymentThisWeek) {
      const paidDay = getISODay(new Date(r.lastPaymentThisWeek + "T00:00:00Z"));
      paymentStatus = paidDay === r.paymentDay ? "paid_on_day" : "paid_supplementary";
    } else if (selectedDay === r.paymentDay) {
      paymentStatus = "due_today";
    } else if (selectedDay > r.paymentDay) {
      paymentStatus = "overdue";
    } else {
      paymentStatus = "not_due_yet";
    }
    return { ...r, paymentStatus };
  });
}

// Matches the source ledger's own C/F formula: B/F + New Savings - Savings
// Recall + Collateral Transfer In - Collateral Transfer Out.
//
// A single set-based UPDATE using window functions rather than a
// read-all-rows-then-update-one-at-a-time loop: the old loop rewrote every
// later row one at a time (slower the longer a client's history got), and
// wasn't concurrency-safe — two saves close together for the same client
// could each read the same starting balance before either had written,
// leaving the B/F->C/F chain inconsistent. This is one atomic statement:
// Postgres row-locks the affected rows for its duration, so a second
// concurrent recompute for the same client simply waits its turn.
async function recomputeSavingsForward(tx: DbTx, clientId: number, fromDate: string) {
  const [prior] = await tx
    .select({ cf: clientTransactions.savingsBalanceCf })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), lt(clientTransactions.transactionDate, fromDate)))
    .orderBy(desc(clientTransactions.transactionDate))
    .limit(1);

  const priorBf = prior?.cf ?? "0";

  await tx.execute(sql`
    with ordered as (
      select id, transaction_date,
        (new_savings - savings_recall + collateral_transfer_in - collateral_transfer_out) as delta
      from client_transactions
      where client_id = ${clientId} and transaction_date >= ${fromDate}
    ),
    computed as (
      select id, transaction_date,
        ${priorBf}::numeric + sum(delta) over (order by transaction_date) as cf
      from ordered
    ),
    final as (
      select id, coalesce(lag(cf) over (order by transaction_date), ${priorBf}::numeric) as bf, cf
      from computed
    )
    update client_transactions as t
    set savings_balance_bf = final.bf, savings_balance_cf = final.cf, updated_at = now()
    from final
    where t.id = final.id
  `);
}

// Used by the approval workflow to tell a create (goes through immediately)
// from an edit of an existing row (may need approval) before deciding.
export async function getExistingTransactionId(clientId: number, transactionDate: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: clientTransactions.id })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), eq(clientTransactions.transactionDate, transactionDate)));
  return row?.id ?? null;
}

// Full existing row values for a client/date, so a caller that only wants to
// add one figure (e.g. recording a loan-agreement disbursement) can merge
// into the existing row instead of overwriting it — saveTransactionRow's
// upsert always sets every field, so passing zeros for the rest would wipe
// out anything else already recorded for that client that day.
export async function getTransactionRow(clientId: number, transactionDate: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), eq(clientTransactions.transactionDate, transactionDate)));
  return row ?? null;
}

export async function saveTransactionRow(data: {
  clientId: number;
  branchId: number;
  transactionDate: string;
  loanDisbursement: string;
  loanRecovery: string;
  profitInterest: string;
  serviceCharge: string;
  newSavings: string;
  savingsRecall: string;
  collateralTransferIn: string;
  collateralTransferOut: string;
  notes?: string;
  supplementaryOverride?: boolean;
  recordedBy: number;
}) {
  const db = getDb();
  const supplementaryOverride = data.supplementaryOverride ? "not_supplementary" : null;
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: clientTransactions.id })
      .from(clientTransactions)
      .where(and(eq(clientTransactions.clientId, data.clientId), eq(clientTransactions.transactionDate, data.transactionDate)));

    const paymentId = existing ? undefined : await generatePaymentId(tx, data.branchId, new Date(data.transactionDate));

    await tx
      .insert(clientTransactions)
      .values({
        paymentId,
        clientId: data.clientId,
        branchId: data.branchId,
        transactionDate: data.transactionDate,
        loanDisbursement: data.loanDisbursement,
        loanRecovery: data.loanRecovery,
        profitInterest: data.profitInterest,
        serviceCharge: data.serviceCharge,
        newSavings: data.newSavings,
        savingsRecall: data.savingsRecall,
        collateralTransferIn: data.collateralTransferIn,
        collateralTransferOut: data.collateralTransferOut,
        savingsBalanceBf: "0",
        savingsBalanceCf: "0",
        notes: data.notes,
        supplementaryOverride,
        recordedBy: data.recordedBy,
      })
      .onConflictDoUpdate({
        target: [clientTransactions.clientId, clientTransactions.transactionDate],
        set: {
          loanDisbursement: data.loanDisbursement,
          loanRecovery: data.loanRecovery,
          profitInterest: data.profitInterest,
          serviceCharge: data.serviceCharge,
          newSavings: data.newSavings,
          savingsRecall: data.savingsRecall,
          collateralTransferIn: data.collateralTransferIn,
          collateralTransferOut: data.collateralTransferOut,
          notes: data.notes,
          supplementaryOverride,
          recordedBy: data.recordedBy,
          updatedAt: new Date(),
        },
      });

    await recomputeSavingsForward(tx, data.clientId, data.transactionDate);
  });
}

// Applies an approved pending_changes patch to an existing client_transactions
// row — a partial update (only the keys present in `patch`), unlike
// saveTransactionRow's full insert-or-update. Used by the approvals page,
// which never knows more than what the original requester proposed.
const PATCHABLE_TXN_FIELDS = [
  "loanDisbursement",
  "loanRecovery",
  "profitInterest",
  "serviceCharge",
  "newSavings",
  "savingsRecall",
  "collateralTransferIn",
  "collateralTransferOut",
  "notes",
] as const;

export async function applyClientTransactionPatch(id: number, patch: Record<string, unknown>) {
  const db = getDb();
  const [target] = await db
    .select({ clientId: clientTransactions.clientId, transactionDate: clientTransactions.transactionDate })
    .from(clientTransactions)
    .where(eq(clientTransactions.id, id));
  if (!target) return null;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of PATCHABLE_TXN_FIELDS) {
    if (key in patch) set[key] = patch[key];
  }
  if ("supplementaryOverride" in patch) {
    set.supplementaryOverride = patch.supplementaryOverride ? "not_supplementary" : null;
  }

  await db.transaction(async (tx) => {
    await tx.update(clientTransactions).set(set).where(eq(clientTransactions.id, id));
    await recomputeSavingsForward(tx, target.clientId, target.transactionDate);
  });

  return target;
}

export function isEmptyRow(d: {
  loanDisbursement: number;
  loanRecovery: number;
  profitInterest: number;
  serviceCharge: number;
  newSavings: number;
  savingsRecall: number;
  collateralTransferIn: number;
  collateralTransferOut: number;
  notes?: string;
}) {
  return (
    d.loanDisbursement === 0 &&
    d.loanRecovery === 0 &&
    d.profitInterest === 0 &&
    d.serviceCharge === 0 &&
    d.newSavings === 0 &&
    d.savingsRecall === 0 &&
    d.collateralTransferIn === 0 &&
    d.collateralTransferOut === 0 &&
    !d.notes
  );
}
