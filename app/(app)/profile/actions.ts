"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireActiveUser, getSession } from "@/lib/auth/session";
import { updateOwnProfile, usernameExists } from "@/lib/db/users";
import { logAction } from "@/lib/db/audit";

const profileSchema = z.object({
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
});

export type ProfileFormState = { error: string | null; success?: boolean };

export async function updateOwnProfileAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const sessionUser = await requireActiveUser();

  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const usernameChanged = parsed.data.username !== sessionUser.username;
  if (usernameChanged && (await usernameExists(parsed.data.username, sessionUser.userId))) {
    return { error: `Username "${parsed.data.username}" is already taken.` };
  }

  const user = await updateOwnProfile(sessionUser.userId, {
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    email: parsed.data.email || undefined,
    bumpTokenVersion: usernameChanged,
  });

  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.update_profile",
    entityType: "user",
    entityId: sessionUser.userId,
    before: { username: sessionUser.username },
    after: { username: user.username },
  });

  // Changing your own username bumps token_version (see updateOwnProfile),
  // which would otherwise invalidate this very session on the next request
  // before the "saved" state ever renders — re-seal it with the new values.
  if (usernameChanged) {
    const session = await getSession();
    session.user = { ...sessionUser, username: user.username, tokenVersion: user.tokenVersion };
    await session.save();
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { error: null, success: true };
}
