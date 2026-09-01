import "server-only";
import { getISOWeek, getISODay } from "date-fns";
import { sql } from "drizzle-orm";
import { clientWeekdaySequences, clientLoanSequences } from "@/lib/db/schema";
import type { DbTx } from "@/lib/db/client";

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

// {BRANCH}-{enrollment weekday}-{seq}, e.g. ZUB-01-001: the 1st client ever
// to enroll on a Monday at this branch. Permanent — never regenerated once
// assigned. The weekday is which day of the week the client enrolled on
// (see deriveEnrollmentWeekDay below), not their loan collection day —
// collection day is set per loan agreement instead (see generateLoanId),
// since it can differ from one loan to the next for the same client. The
// sequence is a running count per (branch, weekday) that never resets.
export async function generateClientCode(tx: DbTx, branchCode: string, branchId: number, weekday: number): Promise<string> {
  const result = await tx.execute(sql`
    INSERT INTO ${clientWeekdaySequences} (branch_id, weekday, last_seq)
    VALUES (${branchId}, ${weekday}, 1)
    ON CONFLICT (branch_id, weekday)
    DO UPDATE SET last_seq = ${clientWeekdaySequences.lastSeq} + 1
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  return `${branchCode.toUpperCase()}-${pad(weekday, 2)}-${pad(seq, 3)}`;
}

// {clientCode}-L{n}, e.g. ZUB-01-001-L1, then -L2 for that same client's next
// loan once the first is repaid — the permanent reference for one specific
// loan agreement, connected to (built from) the client's own permanent code.
// n is a running count per client that never resets.
export async function generateLoanId(tx: DbTx, clientId: number, clientCode: string): Promise<string> {
  const result = await tx.execute(sql`
    INSERT INTO ${clientLoanSequences} (client_id, last_seq)
    VALUES (${clientId}, 1)
    ON CONFLICT (client_id)
    DO UPDATE SET last_seq = ${clientLoanSequences.lastSeq} + 1
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  return `${clientCode}-L${seq}`;
}

// Retained for the historical enrollment_week/enrollment_day columns — the
// weekday now feeds directly into the client code (see generateClientCode
// above), while the week number is kept purely for record-keeping.
export function deriveEnrollmentWeekDay(enrollmentDate: Date): { enrollmentWeek: number; enrollmentDay: number } {
  return { enrollmentWeek: getISOWeek(enrollmentDate), enrollmentDay: getISODay(enrollmentDate) };
}
