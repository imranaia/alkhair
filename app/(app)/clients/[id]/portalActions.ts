"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { getClientById } from "@/lib/db/clients";
import { getClientLogin, createClientLogin, resetUserPassword } from "@/lib/db/users";
import { createNotice } from "@/lib/db/clientNotices";
import { createLoanAgreement, getActiveLoanSummary, OutstandingLoanError } from "@/lib/db/loanAgreements";
import { submitForApproval } from "@/lib/db/pendingChanges";
import { logAction } from "@/lib/db/audit";
import { sendEmail } from "@/lib/email/send";
import { clientAccountCreatedEmail, loanApprovedEmail, APP_URL } from "@/lib/email/templates";

export type PortalLoginState = { error: string | null; username?: string; tempPassword?: string };

async function assertClientInScope(clientId: number, userBranchId: number | null, roleKey: string) {
  const client = await getClientById(clientId);
  if (!client) throw new Error("Client not found.");
  if (roleKey !== "super_admin" && client.branchId !== userBranchId) throw new Error("Not authorized for this branch.");
  return client;
}

export async function createPortalLoginAction(_prevState: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  const user = await requireModule("clients", "edit");
  const clientId = Number(formData.get("clientId"));
  if (!Number.isInteger(clientId)) return { error: "Invalid client." };

  const client = await assertClientInScope(clientId, user.branchId, user.roleKey);

  const existing = await getClientLogin(clientId);
  if (existing) {
    return { error: "This client already has a portal login." };
  }

  const { user: createdUser, tempPassword } = await createClientLogin({
    clientId,
    clientCode: client.clientCode,
    clientFullName: client.fullName,
    branchId: client.branchId,
    createdBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId: client.branchId,
    action: "client.portal_login_created",
    entityType: "client",
    entityId: clientId,
  });

  if (client.email) {
    const email = clientAccountCreatedEmail({
      clientName: client.fullName,
      clientCode: client.clientCode,
      username: createdUser.username,
      tempPassword,
      loginUrl: `${APP_URL}/login`,
    });
    void sendEmail({ to: client.email, subject: email.subject, html: email.html });
  }

  revalidatePath(`/clients/${clientId}`);
  return { error: null, username: createdUser.username, tempPassword };
}

export async function resetPortalLoginAction(loginUserId: number, clientId: number): Promise<PortalLoginState> {
  const user = await requireModule("clients", "edit");
  await assertClientInScope(clientId, user.branchId, user.roleKey);

  const { user: resetUser, tempPassword } = await resetUserPassword(loginUserId);

  await logAction({
    userId: user.userId,
    branchId: user.branchId,
    action: "client.portal_login_reset",
    entityType: "client",
    entityId: clientId,
  });

  revalidatePath(`/clients/${clientId}`);
  return { error: null, username: resetUser.username, tempPassword };
}

const noticeSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  message: z.string().trim().min(1).max(500),
});

export type NoticeFormState = { error: string | null };

export async function createNoticeAction(_prevState: NoticeFormState, formData: FormData): Promise<NoticeFormState> {
  const user = await requireModule("clients", "edit");
  const parsed = noticeSchema.safeParse({ clientId: formData.get("clientId"), message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await assertClientInScope(parsed.data.clientId, user.branchId, user.roleKey);

  await createNotice({
    clientId: client.id,
    branchId: client.branchId,
    message: parsed.data.message,
    createdBy: user.userId,
  });

  revalidatePath(`/clients/${client.id}`);
  return { error: null };
}

const agreementSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  product: z.enum(["biz", "partner"]),
  principalAmount: z.coerce.number().positive(),
  profitAmount: z.coerce.number().nonnegative(),
  tenureWeeks: z.coerce.number().int().positive().max(12),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  paymentDay: z.coerce.number().int().min(1).max(6),
  amountApplied: z.coerce.number().nonnegative().optional(),
  recommendedAmount: z.coerce.number().nonnegative().optional(),
  applicationFormFilled: z.coerce.boolean(),
  appraisalReportAttached: z.coerce.boolean(),
  supervisionReportAttached: z.coerce.boolean().optional(),
  loanAmountReviewed: z.coerce.boolean().optional(),
  stockAvailabilityChecked: z.coerce.boolean(),
  bankDetails: z.string().trim().max(500).optional(),
  instantApprove: z.coerce.boolean().optional(),
});

export type AgreementFormState = { error: string | null };

// Branch admin can prepare and submit a full agreement here, but cannot give
// it final approval — their submission always goes into the review queue
// (loan_agreement_application) for super_admin (or whoever super_admin
// assigns) to approve, same as the simpler officer-submitted request path
// below. Only super_admin can tick "instantApprove" to skip the queue and
// create the agreement outright.
export async function createLoanAgreementAction(_prevState: AgreementFormState, formData: FormData): Promise<AgreementFormState> {
  const user = await requireModule("loan_applications", "create");
  // Empty optional number/text inputs arrive as "" — strip them so
  // z.coerce.number().optional() doesn't coerce "" to 0 and fail elsewhere.
  const raw = Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== ""));
  const parsed = agreementSchema.safeParse({
    ...raw,
    applicationFormFilled: formData.get("applicationFormFilled") === "on",
    appraisalReportAttached: formData.get("appraisalReportAttached") === "on",
    supervisionReportAttached: formData.get("supervisionReportAttached") === "on",
    loanAmountReviewed: formData.get("loanAmountReviewed") === "on",
    stockAvailabilityChecked: formData.get("stockAvailabilityChecked") === "on",
    instantApprove: formData.get("instantApprove") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await assertClientInScope(parsed.data.clientId, user.branchId, user.roleKey);
  const instant = user.roleKey === "super_admin" && parsed.data.instantApprove === true;

  if (!instant) {
    const active = await getActiveLoanSummary(client.id);
    if (active) {
      return {
        error: `This client has an outstanding principal of ₦${active.remainingBalance.toLocaleString()} remaining on the principal started ${active.agreement.startDate}. A new principal cannot be applied for until it is fully repaid.`,
      };
    }

    await submitForApproval({
      entityType: "loan_agreement_application",
      entityId: client.id,
      branchId: client.branchId,
      proposedChanges: {
        amountRequested: parsed.data.amountApplied ?? parsed.data.principalAmount,
        tenureWeeksRequested: parsed.data.tenureWeeks,
        product: parsed.data.product,
        principalAmount: parsed.data.principalAmount,
        profitAmount: parsed.data.profitAmount,
        startDate: parsed.data.startDate,
        paymentDay: parsed.data.paymentDay,
        amountApplied: parsed.data.amountApplied,
        recommendedAmount: parsed.data.recommendedAmount,
        applicationFormFilled: parsed.data.applicationFormFilled,
        appraisalReportAttached: parsed.data.appraisalReportAttached,
        supervisionReportAttached: parsed.data.supervisionReportAttached,
        loanAmountReviewed: parsed.data.loanAmountReviewed,
        stockAvailabilityChecked: parsed.data.stockAvailabilityChecked,
        bankDetails: parsed.data.bankDetails,
      },
      requestedBy: user.userId,
    });

    await logAction({
      userId: user.userId,
      branchId: client.branchId,
      action: "client.loan_agreement_submitted",
      entityType: "loan_agreement_application",
      entityId: client.id,
      after: { principalAmount: parsed.data.principalAmount, profitAmount: parsed.data.profitAmount, tenureWeeks: parsed.data.tenureWeeks },
    });

    revalidatePath(`/clients/${client.id}`);
    revalidatePath("/agreements");
    redirect(`/clients/${client.id}`);
  }

  let agreement;
  try {
    agreement = await createLoanAgreement({
      clientId: client.id,
      branchId: client.branchId,
      principalAmount: parsed.data.principalAmount,
      profitAmount: parsed.data.profitAmount,
      tenureWeeks: parsed.data.tenureWeeks,
      startDate: parsed.data.startDate,
      paymentDay: parsed.data.paymentDay,
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
  } catch (err) {
    if (err instanceof OutstandingLoanError) return { error: err.message };
    throw err;
  }

  await logAction({
    userId: user.userId,
    branchId: client.branchId,
    action: "client.loan_agreement_created",
    entityType: "loan_agreement",
    entityId: agreement.id,
    after: { principalAmount: agreement.principalAmount, profitAmount: agreement.profitAmount, tenureWeeks: agreement.tenureWeeks },
  });

  if (client.email) {
    const email = loanApprovedEmail({
      clientName: client.fullName,
      principalAmount: Number(agreement.principalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      tenureWeeks: agreement.tenureWeeks,
      startDate: agreement.startDate,
      loginUrl: `${APP_URL}/portal`,
    });
    void sendEmail({ to: client.email, subject: email.subject, html: email.html });
  }

  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/transactions");
  redirect(`/clients/${client.id}`);
}

const applyLoanSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  amountRequested: z.coerce.number().positive(),
  purpose: z.string().trim().min(1).max(500),
  tenureWeeksRequested: z.coerce.number().int().positive().max(12).optional(),
});

export type ApplyLoanState = { error: string | null };

// Non-admin path: submits a request for admin review instead of creating the
// agreement directly (LoanAgreementDialog is the admin fast path for that).
export async function applyForLoanAction(_prevState: ApplyLoanState, formData: FormData): Promise<ApplyLoanState> {
  const user = await requireModule("clients", "edit");
  const raw = Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== ""));
  const parsed = applyLoanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await assertClientInScope(parsed.data.clientId, user.branchId, user.roleKey);

  const active = await getActiveLoanSummary(client.id);
  if (active) {
    return {
      error: `This client has an outstanding principal of ₦${active.remainingBalance.toLocaleString()} remaining on the principal started ${active.agreement.startDate}. A new principal cannot be applied for until it is fully repaid.`,
    };
  }

  await submitForApproval({
    entityType: "loan_agreement_application",
    entityId: client.id,
    branchId: client.branchId,
    proposedChanges: {
      amountRequested: parsed.data.amountRequested,
      purpose: parsed.data.purpose,
      tenureWeeksRequested: parsed.data.tenureWeeksRequested,
    },
    requestedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId: client.branchId,
    action: "client.loan_application_submitted",
    entityType: "loan_agreement_application",
    entityId: client.id,
    after: { amountRequested: parsed.data.amountRequested, purpose: parsed.data.purpose },
  });

  revalidatePath(`/clients/${client.id}`);
  return { error: null };
}
