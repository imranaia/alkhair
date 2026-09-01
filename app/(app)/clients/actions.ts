"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule, isAdmin } from "@/lib/auth/session";
import { createClient, updateClient, getClientById, setClientStatus, CLIENT_STATUSES, type ClientStatus } from "@/lib/db/clients";
import { createLoanMaturityEvent } from "@/lib/db/loanMaturity";
import { submitForApproval } from "@/lib/db/pendingChanges";
import { logAction } from "@/lib/db/audit";

const clientSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  groupName: z.string().trim().max(80).optional().or(z.literal("")),
  businessType: z.string().trim().max(80).optional().or(z.literal("")),
  businessLocation: z.string().trim().max(120).optional().or(z.literal("")),
  enrollmentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  branchId: z.coerce.number().int().positive().optional(),
  loanCollectorId: z.coerce.number().int().positive().optional(),
  openingSavings: z.coerce.number().nonnegative().optional(),
  nickname: z.string().trim().max(120).optional().or(z.literal("")),
  nin: z.string().trim().max(20).optional().or(z.literal("")),
  neighborRelativePhone: z.string().trim().max(30).optional().or(z.literal("")),
  shopOwner: z.coerce.boolean(),
  rentingShop: z.coerce.boolean(),
  gpsPhotoVerified: z.coerce.boolean(),
  gpsTimeVerified: z.coerce.boolean(),
  experienceYears: z.coerce.number().int().nonnegative().optional(),
  customerType: z.enum(["walk_in", "marketing"]).optional(),
});

export type ClientFormState = { error: string | null; submitted?: boolean };

export async function createClientAction(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireModule("clients", "create");

  const raw = Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== ""));
  const parsed = clientSchema.safeParse({
    ...raw,
    shopOwner: formData.get("shopOwner") === "on",
    rentingShop: formData.get("rentingShop") === "on",
    gpsPhotoVerified: formData.get("gpsPhotoVerified") === "on",
    gpsTimeVerified: formData.get("gpsTimeVerified") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : user.branchId ?? undefined;
  if (!branchId) {
    return { error: "A branch is required." };
  }

  const client = await createClient({
    branchId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    address: parsed.data.address || undefined,
    groupName: parsed.data.groupName || undefined,
    businessType: parsed.data.businessType || undefined,
    businessLocation: parsed.data.businessLocation || undefined,
    enrollmentDate: new Date(parsed.data.enrollmentDate),
    loanCollectorId: parsed.data.loanCollectorId,
    openingSavings: parsed.data.openingSavings?.toString(),
    createdByUserId: user.userId,
    nickname: parsed.data.nickname || undefined,
    nin: parsed.data.nin || undefined,
    neighborRelativePhone: parsed.data.neighborRelativePhone || undefined,
    shopOwner: parsed.data.shopOwner,
    rentingShop: parsed.data.rentingShop,
    gpsPhotoVerified: parsed.data.gpsPhotoVerified,
    gpsTimeVerified: parsed.data.gpsTimeVerified,
    experienceYears: parsed.data.experienceYears,
    customerType: parsed.data.customerType,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
    after: { clientCode: client.clientCode, fullName: client.fullName },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

const updateClientSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  groupName: z.string().trim().max(80).optional().or(z.literal("")),
  businessType: z.string().trim().max(80).optional().or(z.literal("")),
  businessLocation: z.string().trim().max(120).optional().or(z.literal("")),
  loanCollectorId: z.coerce.number().int().positive().optional(),
});

export async function updateClientAction(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireModule("clients", "edit");

  const parsed = updateClientSchema.safeParse({
    clientId: formData.get("clientId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    groupName: formData.get("groupName"),
    businessType: formData.get("businessType"),
    businessLocation: formData.get("businessLocation"),
    loanCollectorId: formData.get("loanCollectorId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await getClientById(parsed.data.clientId);
  if (!existing) {
    return { error: "Client not found." };
  }

  const proposedChanges = {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    address: parsed.data.address || undefined,
    groupName: parsed.data.groupName || undefined,
    businessType: parsed.data.businessType || undefined,
    businessLocation: parsed.data.businessLocation || undefined,
    loanCollectorId: parsed.data.loanCollectorId ?? null,
  };

  if (!isAdmin(user.roleKey)) {
    await submitForApproval({
      entityType: "client",
      entityId: existing.id,
      branchId: existing.branchId,
      proposedChanges,
      requestedBy: user.userId,
    });
    revalidatePath(`/clients/${existing.id}`);
    return { error: null, submitted: true };
  }

  const client = await updateClient(parsed.data.clientId, proposedChanges);
  if (!client) {
    return { error: "Client not found." };
  }

  await logAction({
    userId: user.userId,
    branchId: client.branchId,
    action: "client.update",
    entityType: "client",
    entityId: client.id,
    after: { fullName: client.fullName },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${client.id}`);
  return { error: null };
}

export async function setClientStatusAction(clientId: number, status: string) {
  const user = await requireModule("clients", "edit");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) return;

  const client = await setClientStatus(clientId, status as ClientStatus);
  if (client) {
    await logAction({
      userId: user.userId,
      branchId: client.branchId,
      action: "client.set_status",
      entityType: "client",
      entityId: client.id,
      after: { status },
    });
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reports/dormant-clients");
}

const maturitySchema = z.object({
  clientId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive(),
  maturedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  renewed: z.enum(["yes", "no"]),
  amountWithClient: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type MaturityFormState = { error: string | null };

export async function recordLoanMaturityAction(
  _prevState: MaturityFormState,
  formData: FormData,
): Promise<MaturityFormState> {
  const user = await requireModule("clients", "edit");

  const parsed = maturitySchema.safeParse({
    clientId: formData.get("clientId"),
    branchId: formData.get("branchId"),
    maturedAt: formData.get("maturedAt"),
    renewed: formData.get("renewed"),
    amountWithClient: formData.get("amountWithClient") || undefined,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (user.roleKey !== "super_admin" && user.branchId !== parsed.data.branchId) {
    return { error: "Not authorized for this branch." };
  }

  const event = await createLoanMaturityEvent({
    clientId: parsed.data.clientId,
    branchId: parsed.data.branchId,
    maturedAt: parsed.data.maturedAt,
    renewed: parsed.data.renewed === "yes",
    amountWithClient: parsed.data.amountWithClient?.toString(),
    notes: parsed.data.notes || undefined,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId: parsed.data.branchId,
    action: "client.loan_maturity",
    entityType: "loan_maturity_events",
    entityId: event.id,
    after: { renewed: event.renewed },
  });

  revalidatePath(`/clients/${parsed.data.clientId}`);
  revalidatePath("/reports/loan-maturity");
  return { error: null };
}
