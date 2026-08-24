"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { getPendingChangeById, markApproved, markRejected } from "@/lib/db/pendingChanges";
import { createLoanAgreement, OutstandingLoanError } from "@/lib/db/loanAgreements";
import { logAction } from "@/lib/db/audit";

const approveSchema = z.object({
  principalAmount: z.coerce.number().positive(),
  profitAmount: z.coerce.number().nonnegative(),
  tenureWeeks: z.coerce.number().int().positive().max(104),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export type LoanApplicationActionState = { error: string | null };

export async function approveLoanApplicationAction(
  id: number,
  _prevState: LoanApplicationActionState,
  formData: FormData,
): Promise<LoanApplicationActionState> {
  const user = await requireModule("loan_applications", "edit");

  const change = await getPendingChangeById(id);
  if (!change || change.status !== "pending" || change.entityType !== "loan_agreement_application") {
    return { error: "This application is no longer pending." };
  }

  const parsed = approveSchema.safeParse({
    principalAmount: formData.get("principalAmount"),
    profitAmount: formData.get("profitAmount"),
    tenureWeeks: formData.get("tenureWeeks"),
    startDate: formData.get("startDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const proposed = change.proposedChanges as { purpose?: string };

  try {
    const agreement = await createLoanAgreement({
      clientId: change.entityId,
      branchId: change.branchId,
      principalAmount: parsed.data.principalAmount,
      profitAmount: parsed.data.profitAmount,
      tenureWeeks: parsed.data.tenureWeeks,
      startDate: parsed.data.startDate,
      purpose: proposed?.purpose || undefined,
      createdBy: user.userId,
    });

    await markApproved(change.id, user.userId);
    await logAction({
      userId: user.userId,
      branchId: change.branchId,
      action: "loan_application.approve",
      entityType: "loan_agreement",
      entityId: agreement.id,
      after: { principalAmount: agreement.principalAmount, profitAmount: agreement.profitAmount, tenureWeeks: agreement.tenureWeeks },
    });
  } catch (err) {
    if (err instanceof OutstandingLoanError) return { error: err.message };
    throw err;
  }

  revalidatePath("/loan-applications");
  revalidatePath(`/clients/${change.entityId}`);
  revalidatePath("/transactions");
  return { error: null };
}

export async function rejectLoanApplicationAction(id: number, note?: string): Promise<{ error: string | null }> {
  const user = await requireModule("loan_applications", "edit");

  const change = await getPendingChangeById(id);
  if (!change || change.status !== "pending" || change.entityType !== "loan_agreement_application") {
    return { error: "This application is no longer pending." };
  }

  await markRejected(change.id, user.userId, note);
  await logAction({
    userId: user.userId,
    branchId: change.branchId,
    action: "loan_application.reject",
    entityType: "loan_agreement_application",
    entityId: change.entityId,
  });

  revalidatePath("/loan-applications");
  return { error: null };
}
