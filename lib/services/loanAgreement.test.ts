import { describe, it, expect } from "vitest";
import { computeTotals, computeSchedule, nextDueInstallment } from "./loanAgreement";

describe("computeTotals", () => {
  it("adds principal and profit, and rounds the installment to the nearest cent", () => {
    const { totalRepayable, installmentAmount } = computeTotals({
      principalAmount: 10000,
      profitAmount: 2000,
      tenureWeeks: 10,
    });
    expect(totalRepayable).toBe(12000);
    expect(installmentAmount).toBe(1200);
  });

  it("rounds an uneven split to two decimal places", () => {
    const { installmentAmount } = computeTotals({
      principalAmount: 10000,
      profitAmount: 1000,
      tenureWeeks: 3,
    });
    // 11000 / 3 = 3666.666... -> rounds to 3666.67
    expect(installmentAmount).toBe(3666.67);
  });
});

describe("computeSchedule", () => {
  const agreement = { totalRepayable: 11000, tenureWeeks: 3, startDate: "2026-01-05" };

  it("produces one row per tenure week", () => {
    const schedule = computeSchedule(agreement);
    expect(schedule).toHaveLength(3);
    expect(schedule.map((r) => r.seq)).toEqual([1, 2, 3]);
  });

  it("sums to exactly the total repayable — the rounding remainder lands on the last installment, never lost or duplicated", () => {
    const schedule = computeSchedule(agreement);
    const sum = schedule.reduce((s, r) => s + r.dueAmount, 0);
    expect(Math.round(sum * 100) / 100).toBe(agreement.totalRepayable);
    // Every row but the last should be the floored base amount.
    expect(schedule[0].dueAmount).toBe(3666.66);
    expect(schedule[1].dueAmount).toBe(3666.66);
    // The last row absorbs whatever's left over so the total matches exactly.
    expect(schedule[2].dueAmount).toBe(3666.68);
  });

  it("spaces due dates one week apart, starting the week after startDate", () => {
    const schedule = computeSchedule(agreement);
    expect(schedule.map((r) => r.dueDate)).toEqual(["2026-01-12", "2026-01-19", "2026-01-26"]);
  });

  it("returns an empty schedule for zero tenure weeks rather than throwing", () => {
    expect(computeSchedule({ totalRepayable: 1000, tenureWeeks: 0, startDate: "2026-01-05" })).toEqual([]);
  });
});

describe("nextDueInstallment", () => {
  const schedule = computeSchedule({ totalRepayable: 3000, tenureWeeks: 3, startDate: "2026-01-05" });
  // due dates: 2026-01-12, 2026-01-19, 2026-01-26

  it("returns the first installment when today is before every due date", () => {
    expect(nextDueInstallment(schedule, new Date("2026-01-01"))?.seq).toBe(1);
  });

  it("returns the installment landing exactly on today", () => {
    expect(nextDueInstallment(schedule, new Date("2026-01-19"))?.seq).toBe(2);
  });

  it("returns the next installment when today falls between two due dates", () => {
    expect(nextDueInstallment(schedule, new Date("2026-01-13"))?.seq).toBe(2);
  });

  it("returns the last installment once every due date has already passed, instead of null", () => {
    expect(nextDueInstallment(schedule, new Date("2026-02-01"))?.seq).toBe(3);
  });

  it("returns null for an empty schedule", () => {
    expect(nextDueInstallment([])).toBeNull();
  });
});
