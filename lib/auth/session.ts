import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { users, roles, rolePermissions, modules } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type SessionData = {
  userId: number;
  username: string;
  fullName: string;
  roleId: number;
  roleKey: string;
  branchId: number | null;
  // Set only for portal accounts (role "client") — the borrower's own client record.
  clientId: number | null;
  tokenVersion: number;
};

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionData;
  }
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set and at least 32 characters long");
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "utiya_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // 30-minute idle timeout: proxy.ts re-saves the session on every
    // authenticated request, which re-issues this cookie with a fresh
    // 30-minute window — so an active user never hits it, but 30 minutes of
    // no requests expires the cookie outright.
    maxAge: 60 * 30,
  },
};

export async function getSession(): Promise<IronSession<{ user?: SessionData }>> {
  const cookieStore = await cookies();
  return getIronSession<{ user?: SessionData }>(cookieStore, sessionOptions);
}

// Server Components/layouts: returns the session user or null (no redirect).
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  return session.user ?? null;
}

// Server Components/pages: redirects to /login if unauthenticated.
export async function requireUser(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Re-checks the DB (not just the cookie) so a password reset / deactivation
// takes effect immediately instead of waiting for the cookie to expire.
export async function requireActiveUser(): Promise<SessionData> {
  const sessionUser = await requireUser();
  const db = getDb();
  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.userId));

  if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== sessionUser.tokenVersion) {
    // Can't mutate the session cookie here (Server Components can't set
    // cookies, only Server Actions/Route Handlers can) — redirecting is
    // enough, since every request re-validates against the DB anyway. The
    // stale cookie gets overwritten the next time this user logs in.
    redirect("/login");
  }

  if (dbUser.mustChangePassword) {
    redirect("/change-password");
  }

  // Portal (borrower) accounts have no business in the staff app — bounce
  // them to their own read-only area instead of erroring on module checks.
  if (sessionUser.roleKey === "client") {
    redirect("/portal");
  }

  return sessionUser;
}

// Server Components/pages under the client portal: redirects to /login if
// unauthenticated, and to /dashboard if authenticated but not a portal
// (role "client") account. The portal has its own row-scoped auth — it
// intentionally bypasses the module/role_permissions system entirely, since
// that system answers "can this role see the Clients module", not "can this
// user see only their own client record."
export async function requirePortalClient(): Promise<SessionData & { clientId: number }> {
  const sessionUser = await requireUser();
  const db = getDb();
  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.userId));

  if (!dbUser || !dbUser.isActive || dbUser.tokenVersion !== sessionUser.tokenVersion) {
    redirect("/login");
  }
  if (dbUser.mustChangePassword) {
    redirect("/change-password");
  }
  if (sessionUser.roleKey !== "client" || !sessionUser.clientId) {
    redirect("/dashboard");
  }

  return { ...sessionUser, clientId: sessionUser.clientId };
}

// Roles that can approve pending changes and whose own edits apply immediately.
export function isAdmin(roleKey: string): boolean {
  return roleKey === "super_admin" || roleKey === "branch_admin";
}

export type ModuleAction = "view" | "create" | "edit" | "delete";

// Non-throwing permission lookup — use this in Server Components when you need
// to know *which* actions to render (e.g. hide the "Save" button), not just
// whether the page itself is accessible.
export async function getModulePermission(moduleKey: string) {
  const user = await requireActiveUser();
  const db = getDb();

  const [perm] = await db
    .select({
      canView: rolePermissions.canView,
      canCreate: rolePermissions.canCreate,
      canEdit: rolePermissions.canEdit,
      canDelete: rolePermissions.canDelete,
    })
    .from(rolePermissions)
    .innerJoin(modules, eq(modules.id, rolePermissions.moduleId))
    .where(and(eq(rolePermissions.roleId, user.roleId), eq(modules.key, moduleKey)));

  return {
    user,
    canView: perm?.canView ?? false,
    canCreate: perm?.canCreate ?? false,
    canEdit: perm?.canEdit ?? false,
    canDelete: perm?.canDelete ?? false,
  };
}

// Server Actions/route handlers: throws if the user's role lacks the given
// permission on the given module. Always call this in mutating actions —
// the sidebar hiding a link is not itself an access control mechanism.
export async function requireModule(moduleKey: string, action: ModuleAction = "view") {
  const { user, canView, canCreate, canEdit, canDelete } = await getModulePermission(moduleKey);
  const allowed = { view: canView, create: canCreate, edit: canEdit, delete: canDelete }[action];

  if (!allowed) {
    throw new Error(`Not authorized: role lacks '${action}' on module '${moduleKey}'`);
  }

  return user;
}

export async function getSidebarModules(roleId: number) {
  const db = getDb();
  return db
    .select({
      key: modules.key,
      label: modules.label,
      icon: modules.icon,
      routePrefix: modules.routePrefix,
    })
    .from(rolePermissions)
    .innerJoin(modules, eq(modules.id, rolePermissions.moduleId))
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.canView, true)))
    .orderBy(modules.sortOrder);
}

export async function getRoleByKey(roleKey: string) {
  const db = getDb();
  const [role] = await db.select().from(roles).where(eq(roles.key, roleKey));
  return role;
}
