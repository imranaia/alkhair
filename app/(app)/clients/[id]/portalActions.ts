"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { getClientById } from "@/lib/db/clients";
import { getClientLogin, createClientLogin, resetUserPassword } from "@/lib/db/users";
import { createNotice } from "@/lib/db/clientNotices";
import { createLoanAgreement, getActiveLoanSummary, OutstandingLoanError } from "@/lib/db/loanAgreements";
import { createChecklist } from "@/lib/db/checklists";
import { submitForApproval } from "@/lib/db/pendingChanges";
import { logAction } from "@/lib/db/audit";

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
  principalAmount: z.coerce.number().positive(),
  profitAmount: z.coerce.number().nonnegative(),
  tenureWeeks: z.coerce.number().int().positive().max(104),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
});

export type AgreementFormState = { error: string | null };

export async function createLoanAgreementAction(_prevState: AgreementFormState, formData: FormData): Promise<AgreementFormState> {
  const user = await requireModule("clients", "edit");
  const parsed = agreementSchema.safeParse({
    clientId: formData.get("clientId"),
    principalAmount: formData.get("principalAmount"),
    profitAmount: formData.get("profitAmount"),
    tenureWeeks: formData.get("tenureWeeks"),
    startDate: formData.get("startDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await assertClientInScope(parsed.data.clientId, user.branchId, user.roleKey);

  let agreement;
  try {
    agreement = await createLoanAgreement({
      clientId: client.id,
      branchId: client.branchId,
      principalAmount: parsed.data.principalAmount,
      profitAmount: parsed.data.profitAmount,
      tenureWeeks: parsed.data.tenureWeeks,
      startDate: parsed.data.startDate,
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

  revalidatePath(`/clients/${client.id}`);
  revalidatePath("/transactions");
  redirect(`/clients/${client.id}`);
}

const checklistSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  nickname: z.string().trim().max(120).optional(),
  nin: z.string().trim().max(20).optional(),
  neighborRelativePhone: z.string().trim().max(30).optional(),
  shopOwner: z.coerce.boolean(),
  rentingShop: z.coerce.boolean(),
  gpsPhotoVerified: z.coerce.boolean(),
  gpsTimeVerified: z.coerce.boolean(),
  amountApplied: z.coerce.number().nonnegative().optional(),
  recommendedAmount: z.coerce.number().nonnegative().optional(),
  amountApproved: z.coerce.number().nonnegative().optional(),
  clientType: z.enum(["new", "returning"]),
  preferredTenureMonths: z.coerce.number().int().positive().optional(),
  typeOfBusiness: z.string().trim().max(80).optional(),
  experienceYears: z.coerce.number().int().nonnegative().optional(),
  applicationFormFilled: z.coerce.boolean(),
  customerType: z.enum(["walk_in", "marketing"]).optional(),
  appraisalReportAttached: z.coerce.boolean(),
  supervisionReportAttached: z.coerce.boolean().optional(),
  loanAmountReviewed: z.coerce.boolean().optional(),
  stockAvailabilityChecked: z.coerce.boolean(),
  bankDetails: z.string().trim().max(500).optional(),
  officerName: z.string().trim().min(1).max(120),
});

export type ChecklistFormState = { error: string | null };

export async function createChecklistAction(_prevState: ChecklistFormState, formData: FormData): Promise<ChecklistFormState> {
  const user = await requireModule("clients", "edit");
  // Empty optional text/number inputs arrive as "" — strip them so
  // z.coerce.number().optional() doesn't coerce "" to 0 and fail .positive().
  const raw = Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== ""));
  const parsed = checklistSchema.safeParse({
    ...raw,
    shopOwner: formData.get("shopOwner") === "on",
    rentingShop: formData.get("rentingShop") === "on",
    gpsPhotoVerified: formData.get("gpsPhotoVerified") === "on",
    gpsTimeVerified: formData.get("gpsTimeVerified") === "on",
    applicationFormFilled: formData.get("applicationFormFilled") === "on",
    appraisalReportAttached: formData.get("appraisalReportAttached") === "on",
    supervisionReportAttached: formData.get("supervisionReportAttached") === "on",
    loanAmountReviewed: formData.get("loanAmountReviewed") === "on",
    stockAvailabilityChecked: formData.get("stockAvailabilityChecked") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await assertClientInScope(parsed.data.clientId, user.branchId, user.roleKey);
  const d = parsed.data;

  await createChecklist({
    clientId: client.id,
    branchId: client.branchId,
    nickname: d.nickname || undefined,
    nin: d.nin || undefined,
    neighborRelativePhone: d.neighborRelativePhone || undefined,
    shopOwner: d.shopOwner,
    rentingShop: d.rentingShop,
    gpsPhotoVerified: d.gpsPhotoVerified,
    gpsTimeVerified: d.gpsTimeVerified,
    amountApplied: d.amountApplied?.toFixed(2),
    recommendedAmount: d.recommendedAmount?.toFixed(2),
    amountApproved: d.amountApproved?.toFixed(2),
    clientType: d.clientType,
    preferredTenureMonths: d.preferredTenureMonths,
    typeOfBusiness: d.typeOfBusiness || undefined,
    experienceYears: d.experienceYears,
    applicationFormFilled: d.applicationFormFilled,
    customerType: d.customerType,
    appraisalReportAttached: d.appraisalReportAttached,
    supervisionReportAttached: d.clientType === "returning" ? d.supervisionReportAttached ?? false : undefined,
    loanAmountReviewed: d.clientType === "returning" ? d.loanAmountReviewed ?? false : undefined,
    stockAvailabilityChecked: d.stockAvailabilityChecked,
    bankDetails: d.bankDetails || undefined,
    officerName: d.officerName,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId: client.branchId,
    action: "client.checklist_recorded",
    entityType: "client",
    entityId: client.id,
  });

  revalidatePath(`/clients/${client.id}`);
  return { error: null };
}

const applyLoanSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  amountRequested: z.coerce.number().positive(),
  purpose: z.string().trim().min(1).max(500),
  tenureWeeksRequested: z.coerce.number().int().positive().max(104).optional(),
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
