"use server";

import { redirect } from "next/navigation";
import { getUserByUsername, recordLoginSuccess, recordLoginFailure } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { logAction } from "@/lib/db/audit";

export type LoginState = { error: string | null };

const GENERIC_ERROR = "Invalid username or password.";

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Only follow same-site paths — a crafted /login?next=https://evil.example
  // (or protocol-relative //evil.example, or /\evil.example) would otherwise
  // send the user off-site right after a successful login.
  const rawNext = String(formData.get("next") ?? "/dashboard");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\") ? rawNext : "/dashboard";

  if (!username || !password) {
    return { error: GENERIC_ERROR };
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return { error: GENERIC_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return { error: "This account is temporarily locked. Try again later." };
  }

  if (!user.isActive) {
    return { error: GENERIC_ERROR };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordLoginFailure(user.id, user.failedLoginAttempts);
    return { error: GENERIC_ERROR };
  }

  await recordLoginSuccess(user.id);
  await logAction({ userId: user.id, branchId: user.branchId, action: "user.login" });

  const session = await getSession();
  session.user = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    roleId: user.roleId,
    roleKey: user.roleKey,
    branchId: user.branchId,
    clientId: user.clientId,
    tokenVersion: user.tokenVersion,
  };
  await session.save();

  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  redirect(user.roleKey === "client" ? "/portal" : next || "/dashboard");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
