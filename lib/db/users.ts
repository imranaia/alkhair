import "server-only";
import { getDb } from "./client";
import { users, roles, branches } from "./schema";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      fullName: users.fullName,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      tokenVersion: users.tokenVersion,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      roleId: users.roleId,
      roleKey: roles.key,
      branchId: users.branchId,
      clientId: users.clientId,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.username, username.toLowerCase()));
  return row ?? null;
}

export async function recordLoginSuccess(userId: number) {
  const db = getDb();
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function recordLoginFailure(userId: number, currentAttempts: number) {
  const db = getDb();
  const attempts = currentAttempts + 1;
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
  await db
    .update(users)
    .set({ failedLoginAttempts: attempts, lockedUntil, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserProfile(userId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      username: users.username,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      roleName: roles.name,
      roleKey: roles.key,
      branchName: branches.name,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(branches, eq(branches.id, users.branchId))
    .where(eq(users.id, userId));
  return row ?? null;
}

export async function listActiveUsersForBranch(branchId: number) {
  const db = getDb();
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.branchId, branchId), eq(users.isActive, true)));
}

export async function listLoanCollectorsForBranch(branchId: number) {
  const db = getDb();
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.branchId, branchId), eq(roles.key, "loan_collector"), eq(users.isActive, true)));
}

// Grouped by branch so a single query can back a client-side branch select
// (e.g. super admin picking a branch on the "Add client" form) without a
// server round-trip per selection.
export async function listLoanCollectorsByBranch(branchIds: number[]) {
  if (branchIds.length === 0) return new Map<number, { id: number; fullName: string }[]>();
  const db = getDb();
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, branchId: users.branchId })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(inArray(users.branchId, branchIds), eq(roles.key, "loan_collector"), eq(users.isActive, true)));

  const map = new Map<number, { id: number; fullName: string }[]>();
  for (const row of rows) {
    if (row.branchId === null) continue;
    const list = map.get(row.branchId) ?? [];
    list.push({ id: row.id, fullName: row.fullName });
    map.set(row.branchId, list);
  }
  return map;
}

// Who gets emailed when something needs an admin's attention for a branch —
// that branch's own branch_admin(s), plus every super_admin (they can see
// and act on anything). Only returns accounts with an email on file.
export async function listApprovalNotificationRecipients(branchId: number) {
  const db = getDb();
  return db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(
      and(
        eq(users.isActive, true),
        sql`${users.email} is not null`,
        or(and(eq(roles.key, "branch_admin"), eq(users.branchId, branchId)), eq(roles.key, "super_admin")),
      ),
    ) as Promise<{ email: string; fullName: string }[]>;
}

export async function listUsersForBranch(branchId: number | null) {
  const db = getDb();
  const query = db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      isActive: users.isActive,
      roleId: users.roleId,
      roleName: roles.name,
      roleKey: roles.key,
      branchId: users.branchId,
      branchName: branches.name,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(branches, eq(branches.id, users.branchId));

  if (branchId === null) return query;
  return query.where(eq(users.branchId, branchId));
}

export async function getUserById(userId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      phone: users.phone,
      isActive: users.isActive,
      roleId: users.roleId,
      roleKey: roles.key,
      branchId: users.branchId,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.id, userId));
  return row ?? null;
}

export async function createUser(data: {
  username: string;
  fullName: string;
  phone?: string;
  email?: string;
  roleId: number;
  branchId: number | null;
  createdBy: number;
}) {
  const db = getDb();
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const [user] = await db
    .insert(users)
    .values({
      username: data.username.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      roleId: data.roleId,
      branchId: data.branchId,
      createdBy: data.createdBy,
      mustChangePassword: true,
    })
    .returning();
  return { user, tempPassword };
}

// `forSelf` skips the forced-change-on-next-login flag: the admin is seeing
// the temp password directly in this same request, so there's nothing left
// to force — and leaving it set would otherwise redirect them to
// /change-password on the very next page load, potentially before they've
// had a chance to read/copy the password.
export async function resetUserPassword(userId: number, forSelf = false) {
  const db = getDb();
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: !forSelf,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return { user, tempPassword };
}

// Admin-driven edit of another (or their own) user record. Username/role/branch
// are all cached in the session cookie, so changing any of them bumps
// token_version to force that user's session to re-validate against the DB
// on their next request (see requireActiveUser) and pick up the change.
export async function updateUser(
  userId: number,
  data: {
    username: string;
    fullName: string;
    phone?: string;
    email?: string;
    roleId: number;
    branchId: number | null;
    bumpTokenVersion: boolean;
  },
) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({
      username: data.username.toLowerCase(),
      fullName: data.fullName,
      phone: data.phone || null,
      email: data.email || null,
      roleId: data.roleId,
      branchId: data.branchId,
      ...(data.bumpTokenVersion ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

// Self-service edit from the Profile page. Username is included here too —
// changing it bumps token_version (see updateUser above) since it's cached
// in the session cookie; the caller re-seals the session in the same request
// so the user isn't logged out mid-action.
export async function updateOwnProfile(
  userId: number,
  data: { username: string; fullName: string; phone?: string; email?: string; bumpTokenVersion: boolean },
) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({
      username: data.username.toLowerCase(),
      fullName: data.fullName,
      phone: data.phone || null,
      email: data.email || null,
      ...(data.bumpTokenVersion ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function setUserActive(userId: number, isActive: boolean) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ isActive, tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

// ===================== Client portal logins =====================
// A portal account is just a `users` row with role "client" and clientId
// set — it reuses the same session/login/password machinery as staff
// accounts instead of a parallel auth system.

export async function getClientLogin(clientId: number) {
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, username: users.username, isActive: users.isActive })
    .from(users)
    .where(eq(users.clientId, clientId));
  return row ?? null;
}

// Username derives from the client's own (already-unique) client code, e.g.
// "yol-3-0503-01-2026" — memorable to the client and guaranteed unique.
export async function createClientLogin(data: {
  clientId: number;
  clientCode: string;
  clientFullName: string;
  branchId: number;
  createdBy: number;
}) {
  const db = getDb();
  const [clientRole] = await db.select().from(roles).where(eq(roles.key, "client"));
  if (!clientRole) throw new Error("Client role is not seeded.");

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const [user] = await db
    .insert(users)
    .values({
      username: data.clientCode.toLowerCase(),
      passwordHash,
      fullName: data.clientFullName,
      roleId: clientRole.id,
      branchId: data.branchId,
      clientId: data.clientId,
      createdBy: data.createdBy,
      mustChangePassword: true,
    })
    .returning();
  return { user, tempPassword };
}

export async function usernameExists(username: string, excludeUserId?: number) {
  const db = getDb();
  const conditions = [eq(users.username, username.toLowerCase())];
  if (excludeUserId !== undefined) {
    conditions.push(sql`${users.id} != ${excludeUserId}`);
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(...conditions));
  return (row?.count ?? 0) > 0;
}
