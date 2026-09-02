"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule, getSession } from "@/lib/auth/session";
import { createUser, resetUserPassword, setUserActive, usernameExists, getUserById, updateUser } from "@/lib/db/users";
import { getRole } from "@/lib/db/roles";
import { logAction } from "@/lib/db/audit";

const BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS = ["loan_collector", "expense_officer", "viewer"];

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dots, dashes, underscores only"),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email.").max(150).optional().or(z.literal("")),
  roleId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().optional(),
});

export type UserFormState = { error: string | null; tempPassword?: string };

export async function createUserAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const sessionUser = await requireModule("users", "create");

  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const role = await getRole(parsed.data.roleId);
  if (!role) {
    return { error: "Role not found." };
  }

  let branchId: number | null = parsed.data.branchId ?? null;

  if (sessionUser.roleKey !== "super_admin") {
    // Branch Admins (and anyone else with `users.create`) may only add
    // limited-scope staff to their own branch — not other admins.
    if (!BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS.includes(role.key)) {
      return { error: "You are not allowed to assign that role." };
    }
    branchId = sessionUser.branchId;
  }

  if (role.key !== "super_admin" && !branchId) {
    return { error: "A branch is required for this role." };
  }

  if (await usernameExists(parsed.data.username)) {
    return { error: `Username "${parsed.data.username}" is already taken.` };
  }

  const { user, tempPassword } = await createUser({
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    email: parsed.data.email || undefined,
    roleId: role.id,
    branchId: role.key === "super_admin" ? null : branchId,
    createdBy: sessionUser.userId,
  });

  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    after: { username: user.username, roleId: user.roleId, branchId: user.branchId },
  });

  revalidatePath("/admin/users");
  return { error: null, tempPassword };
}

const updateUserSchema = z.object({
  userId: z.coerce.number().int().positive(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dots, dashes, underscores only"),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email.").max(150).optional().or(z.literal("")),
  roleId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().optional(),
});

export async function updateUserAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const sessionUser = await requireModule("users", "edit");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const target = await getUserById(parsed.data.userId);
  if (!target) {
    return { error: "User not found." };
  }

  if (parsed.data.username !== target.username && (await usernameExists(parsed.data.username, target.id))) {
    return { error: `Username "${parsed.data.username}" is already taken.` };
  }

  if (sessionUser.roleKey !== "super_admin" && target.branchId !== sessionUser.branchId) {
    return { error: "You can only edit users in your own branch." };
  }

  const role = await getRole(parsed.data.roleId);
  if (!role) {
    return { error: "Role not found." };
  }

  let branchId: number | null = parsed.data.branchId ?? null;

  if (sessionUser.roleKey !== "super_admin") {
    // Same scoping as creation: Branch Admins may only grant limited-scope
    // roles, and only within their own branch. Leaving an existing
    // out-of-scope role untouched is still allowed — a Branch Admin editing a
    // peer's name shouldn't be blocked just because they can't grant that role.
    if (role.id !== target.roleId && !BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS.includes(role.key)) {
      return { error: "You are not allowed to assign that role." };
    }
    branchId = sessionUser.branchId;
  }

  if (role.key !== "super_admin" && !branchId) {
    return { error: "A branch is required for this role." };
  }

  // Unlike creation, edits don't force-null the branch for a Super Admin
  // target — the branch select (shown to super_admin actors regardless of
  // the target's role) reflects the target's existing branch, and silently
  // discarding that on every unrelated edit would quietly wipe real data.
  const finalBranchId = branchId;
  const bumpTokenVersion =
    role.id !== target.roleId || finalBranchId !== target.branchId || parsed.data.username !== target.username;

  const user = await updateUser(target.id, {
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    email: parsed.data.email || undefined,
    roleId: role.id,
    branchId: finalBranchId,
    bumpTokenVersion,
  });

  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.update",
    entityType: "user",
    entityId: user.id,
    before: { username: target.username, fullName: target.fullName, phone: target.phone, roleId: target.roleId, branchId: target.branchId },
    after: { username: user.username, fullName: user.fullName, phone: user.phone, roleId: user.roleId, branchId: user.branchId },
  });

  // If the acting admin just edited their own row and their username/role/branch
  // changed, re-seal the session so this request doesn't immediately bounce
  // itself to /login on the next page load (same reasoning as the self
  // password-reset case below).
  if (bumpTokenVersion && target.id === sessionUser.userId) {
    const session = await getSession();
    session.user = {
      ...sessionUser,
      username: user.username,
      roleId: user.roleId,
      roleKey: role.key,
      branchId: user.branchId,
      tokenVersion: user.tokenVersion,
    };
    await session.save();
  }

  revalidatePath("/admin/users");
  return { error: null };
}

export async function resetPasswordAction(userId: number): Promise<UserFormState> {
  const sessionUser = await requireModule("users", "edit");
  const isSelf = userId === sessionUser.userId;
  const { user, tempPassword } = await resetUserPassword(userId, isSelf);
  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.reset_password",
    entityType: "user",
    entityId: user.id,
  });

  // Resetting your own password bumps your own token_version, which would
  // otherwise invalidate this very session on the next request (before the
  // temp-password dialog ever renders) and boot you out mid-action. Re-seal
  // the session with the new token_version so it stays valid.
  if (isSelf) {
    const session = await getSession();
    session.user = { ...sessionUser, tokenVersion: user.tokenVersion };
    await session.save();
  }

  revalidatePath("/admin/users");
  return { error: null, tempPassword };
}

export async function toggleUserActiveAction(userId: number, isActive: boolean) {
  const sessionUser = await requireModule("users", "edit");
  const user = await setUserActive(userId, isActive);
  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.toggle_active",
    entityType: "user",
    entityId: userId,
    after: { isActive },
  });
  revalidatePath("/admin/users");
  return user;
}
