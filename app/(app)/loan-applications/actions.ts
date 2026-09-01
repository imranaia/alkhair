"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import {
  getPendingChangeById,
  claimPendingChangeApproval,
  claimPendingChangeRejection,
  revertPendingChangeToPending,
} from "@/lib/db/pendingChanges";
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
  if (user.roleKey !== "super_admin" && change.branchId !== user.branchId) {
    return { error: "Not authorized for this branch." };
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

  // Claim the request atomically before doing anything else — this is what
  // stops two admins approving within moments of each other (or a
  // double-click) from both passing the "still pending" check above and
  // each creating their own loan agreement for the same application.
  const claimed = await claimPendingChangeApproval(change.id, user.userId);
  if (!claimed) {
    return { error: "This application was already handled by someone else." };
  }

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

    await logAction({
      userId: user.userId,
      branchId: change.branchId,
      action: "loan_application.approve",
      entityType: "loan_agreement",
      entityId: agreement.id,
      after: { principalAmount: agreement.principalAmount, profitAmount: agreement.profitAmount, tenureWeeks: agreement.tenureWeeks },
    });
  } catch (err) {
    // The claim above already flipped status to 'approved' — if creating the
    // agreement itself then fails, put the request back to 'pending' rather
    // than leaving it stuck approved with no agreement to show for it.
    await revertPendingChangeToPending(change.id);
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
  if (user.roleKey !== "super_admin" && change.branchId !== user.branchId) {
    return { error: "Not authorized for this branch." };
  }

  const claimed = await claimPendingChangeRejection(change.id, user.userId, note);
  if (!claimed) {
    return { error: "This application was already handled by someone else." };
  }

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
