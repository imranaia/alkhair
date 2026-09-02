"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import {
  getPendingChangeById,
  claimPendingChangeApproval,
  claimPendingChangeRejection,
  revertPendingChangeToPending,
  recommendLoanApplicationAmount,
} from "@/lib/db/pendingChanges";
import { createLoanAgreement, OutstandingLoanError } from "@/lib/db/loanAgreements";
import { getClientById } from "@/lib/db/clients";
import { logAction } from "@/lib/db/audit";
import { sendEmail } from "@/lib/email/send";
import { loanApprovedEmail, APP_URL } from "@/lib/email/templates";

const approveSchema = z.object({
  product: z.enum(["biz", "partner"]),
  principalAmount: z.coerce.number().positive(),
  profitAmount: z.coerce.number().nonnegative(),
  tenureWeeks: z.coerce.number().int().positive().max(12),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  paymentDay: z.coerce.number().int().min(1).max(6),
  amountApplied: z.coerce.number().nonnegative().optional(),
  recommendedAmount: z.coerce.number().nonnegative().optional(),
  bankDetails: z.string().trim().max(500).optional(),
  applicationFormFilled: z.coerce.boolean(),
  appraisalReportAttached: z.coerce.boolean(),
  supervisionReportAttached: z.coerce.boolean().optional(),
  loanAmountReviewed: z.coerce.boolean().optional(),
  stockAvailabilityChecked: z.coerce.boolean(),
});

export type LoanApplicationActionState = { error: string | null };

// Branch admin's "recommend" step — sets a recommended amount on a still-
// pending request without approving it, so whoever gives final approval
// (super_admin, or someone super_admin has assigned) sees it as a starting
// point. Gated on "create" rather than "edit": branch admin has create but
// not edit on this module by default, precisely so they can do this without
// being able to approve outright.
export async function recommendLoanApplicationAction(id: number, recommendedAmount: number): Promise<{ error: string | null }> {
  const user = await requireModule("loan_applications", "create");

  const change = await getPendingChangeById(id);
  if (!change || change.status !== "pending" || change.entityType !== "loan_agreement_application") {
    return { error: "This application is no longer pending." };
  }
  if (user.roleKey !== "super_admin" && change.branchId !== user.branchId) {
    return { error: "Not authorized for this branch." };
  }
  if (!Number.isFinite(recommendedAmount) || recommendedAmount <= 0) {
    return { error: "Enter a valid recommended amount." };
  }

  const updated = await recommendLoanApplicationAmount(id, recommendedAmount, user.fullName);
  if (!updated) {
    return { error: "This application was already handled by someone else." };
  }

  await logAction({
    userId: user.userId,
    branchId: change.branchId,
    action: "loan_application.recommend",
    entityType: "loan_agreement_application",
    entityId: change.entityId,
    after: { recommendedAmount },
  });

  revalidatePath("/agreements");
  return { error: null };
}

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

  const raw = Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== ""));
  const parsed = approveSchema.safeParse({
    ...raw,
    applicationFormFilled: formData.get("applicationFormFilled") === "on",
    appraisalReportAttached: formData.get("appraisalReportAttached") === "on",
    supervisionReportAttached: formData.get("supervisionReportAttached") === "on",
    loanAmountReviewed: formData.get("loanAmountReviewed") === "on",
    stockAvailabilityChecked: formData.get("stockAvailabilityChecked") === "on",
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
      paymentDay: parsed.data.paymentDay,
      purpose: proposed?.purpose || undefined,
      product: parsed.data.product,
      amountApplied: parsed.data.amountApplied,
      recommendedAmount: parsed.data.recommendedAmount,
      applicationFormFilled: parsed.data.applicationFormFilled,
      appraisalReportAttached: parsed.data.appraisalReportAttached,
      supervisionReportAttached: parsed.data.supervisionReportAttached,
      loanAmountReviewed: parsed.data.loanAmountReviewed,
      stockAvailabilityChecked: parsed.data.stockAvailabilityChecked,
      bankDetails: parsed.data.bankDetails,
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

    const client = await getClientById(change.entityId);
    if (client?.email) {
      const email = loanApprovedEmail({
        clientName: client.fullName,
        principalAmount: Number(agreement.principalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        tenureWeeks: agreement.tenureWeeks,
        startDate: agreement.startDate,
        loginUrl: `${APP_URL}/portal`,
      });
      void sendEmail({ to: client.email, subject: email.subject, html: email.html });
    }
  } catch (err) {
    // The claim above already flipped status to 'approved' — if creating the
    // agreement itself then fails, put the request back to 'pending' rather
    // than leaving it stuck approved with no agreement to show for it.
    await revertPendingChangeToPending(change.id);
    if (err instanceof OutstandingLoanError) return { error: err.message };
    throw err;
  }

  revalidatePath("/agreements");
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

  revalidatePath("/agreements");
  return { error: null };
}
