import "server-only";
import { getISOWeek, getISODay } from "date-fns";
import { sql } from "drizzle-orm";
import { paymentSequences } from "@/lib/db/schema";
import type { DbTx } from "@/lib/db/client";

// Arbitrary fixed key for the transaction-scoped advisory lock below.
const PAYMENT_SEQ_LOCK_KEY = 74_201_001;

// {WW}{D}-{SEQ} — e.g. "312-0007" (ISO week 31, day 2/Tuesday, running
// sequence). Entirely separate from — and never affects — a client's own
// permanent client_code.
//
// payment_id is unique across ALL branches, but the ID carries no branch
// code — so the sequence has to be global too. It used to be per-branch,
// which let two branches each reach e.g. seq 7 on the same week/day and
// produce the same "312-0007", failing the insert on the unique constraint.
// Each new seq is now max(last_seq across every branch) + 1, taken under an
// advisory lock so concurrent saves in different branches can't pick the
// same number. Because it starts above every branch's existing counter, it
// can never repeat an ID issued under the old per-branch scheme either.
export async function generatePaymentId(tx: DbTx, branchId: number, date: Date): Promise<string> {
  const week = getISOWeek(date);
  const day = getISODay(date);

  await tx.execute(sql`SELECT pg_advisory_xact_lock(${PAYMENT_SEQ_LOCK_KEY})`);

  const result = await tx.execute(sql`
    INSERT INTO ${paymentSequences} (branch_id, last_seq)
    VALUES (${branchId}, (SELECT coalesce(max(last_seq), 0) + 1 FROM ${paymentSequences}))
    ON CONFLICT (branch_id)
    DO UPDATE SET last_seq = EXCLUDED.last_seq
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  return `${String(week).padStart(2, "0")}${day}-${String(seq).padStart(4, "0")}`;
}
