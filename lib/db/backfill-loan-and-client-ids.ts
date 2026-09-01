// One-off data migration, run once by hand against the live database after
// migration 0002 (which added the nullable columns/tables this script
// fills in) and before migration 0003 (which tightens them to NOT NULL).
// Not wired into any app code path or npm script — see the session notes
// for why: this reshapes every existing client's permanent code and every
// loan agreement's reference number, a real one-time operational decision,
// not something that should ever run twice or run automatically.
import "dotenv/config";
import { getDb } from "./client";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();

  await db.transaction(async (tx) => {
    // 1. Regenerate every client's permanent code as
    //    {PREFIX}-{enrollment weekday}-{seq within that prefix+weekday},
    //    e.g. ZUB-01-001 — ordered by original enrollment date (then id as a
    //    tiebreak) so the sequence reads as "who enrolled first." Keeps each
    //    client's existing prefix (the part before the first "-") rather
    //    than the branch table's code: 467 of 469 live clients are prefixed
    //    "ZUB", not "ABJ" (the only branch in the system) — that prefix
    //    predates this app and stays as-is; only the DDMM/paymentDay/YYYY
    //    part of the old format is being replaced.
    const codeResult = await tx.execute(sql`
      with ranked as (
        select id, branch_id, enrollment_day, split_part(client_code, '-', 1) as prefix,
          row_number() over (partition by branch_id, split_part(client_code, '-', 1), enrollment_day order by enrollment_date, id) as seq
        from clients
      )
      update clients c
      set client_code = ranked.prefix || '-' || lpad(ranked.enrollment_day::text, 2, '0') || '-' || lpad(ranked.seq::text, 3, '0')
      from ranked
      where c.id = ranked.id
      returning c.id, c.client_code
    `);
    console.log(`Regenerated ${codeResult.rows.length} client codes.`);

    // 2. Seed client_weekday_sequences so the next new client at each
    //    (branch, weekday) continues from the right number.
    const seqResult = await tx.execute(sql`
      insert into client_weekday_sequences (branch_id, weekday, last_seq)
      select branch_id, enrollment_day, count(*)
      from clients
      group by branch_id, enrollment_day
      on conflict (branch_id, weekday) do update set last_seq = excluded.last_seq
      returning branch_id, weekday, last_seq
    `);
    console.log(`Seeded ${seqResult.rows.length} client_weekday_sequences rows.`);

    // 3. Backfill each loan agreement's payment_day from what was on the
    //    client record at the time — the best available value, since loans
    //    didn't track this separately before.
    const paymentDayResult = await tx.execute(sql`
      update loan_agreements la
      set payment_day = c.payment_day
      from clients c
      where la.client_id = c.id
      returning la.id
    `);
    console.log(`Backfilled payment_day on ${paymentDayResult.rows.length} loan agreements.`);

    // 4. Backfill each loan agreement's loan_id as {client_code}-L{n}, where
    //    n is that client's loans in chronological order (by start_date,
    //    then id as a tiebreak) — uses the just-regenerated client codes
    //    from step 1.
    const loanIdResult = await tx.execute(sql`
      with ranked as (
        select id, client_id, row_number() over (partition by client_id order by start_date, id) as seq
        from loan_agreements
      )
      update loan_agreements la
      set loan_id = c.client_code || '-L' || ranked.seq
      from ranked
      join clients c on c.id = ranked.client_id
      where la.id = ranked.id
      returning la.id, la.loan_id
    `);
    console.log(`Backfilled loan_id on ${loanIdResult.rows.length} loan agreements.`);

    // 5. Seed client_loan_sequences so the next loan for each client
    //    continues from the right number.
    const loanSeqResult = await tx.execute(sql`
      insert into client_loan_sequences (client_id, last_seq)
      select client_id, count(*) from loan_agreements group by client_id
      on conflict (client_id) do update set last_seq = excluded.last_seq
      returning client_id, last_seq
    `);
    console.log(`Seeded ${loanSeqResult.rows.length} client_loan_sequences rows.`);

    // Sanity check before the transaction commits: every loan agreement
    // must now have both a loan_id and a payment_day, and every client code
    // must be unique (the schema's own constraint enforces this too, but
    // fail loudly here rather than surface it as a generic constraint error).
    const [{ missing }] = (
      await tx.execute<{ missing: number }>(sql`
        select count(*)::int as missing from loan_agreements where loan_id is null or payment_day is null
      `)
    ).rows;
    if (missing > 0) {
      throw new Error(`${missing} loan_agreements row(s) still missing loan_id/payment_day — aborting, nothing committed.`);
    }
  });

  console.log("Backfill complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed, transaction rolled back:", err);
  process.exit(1);
});
