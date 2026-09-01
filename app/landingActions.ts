"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { saveSiteContentField, type LandingContent } from "@/lib/db/siteContent";
import { logAction } from "@/lib/db/audit";

export type SaveLandingFieldState = { error: string | null };

// Only super_admin can edit the public landing page — deliberately not
// gated through the module/role_permissions system like the rest of the
// app, since this isn't a business module a role can be granted access to;
// it's the one page every visitor (including logged-out ones) sees.
async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.roleKey !== "super_admin") {
    throw new Error("Only a super admin can edit the landing page.");
  }
  return user;
}

const requirementSchema = z.object({ label: z.string().trim().min(1).max(120), detail: z.string().trim().min(1).max(300) });

const fieldSchemas = {
  heroHeadline: z.string().trim().min(1).max(200),
  heroSubheadline: z.string().trim().min(1).max(400),
  contactPhone: z.string().trim().min(1).max(40),
  contactEmail: z.string().trim().email().max(120),
  featureLabels: z.array(z.string().trim().min(1).max(120)).length(6),
  requirements: z.array(requirementSchema).length(4),
  missionHeading: z.string().trim().min(1).max(200),
  missionBody: z.string().trim().min(1).max(500),
} as const;

export async function saveLandingFieldAction<K extends keyof LandingContent>(
  field: K,
  value: LandingContent[K],
): Promise<SaveLandingFieldState> {
  const user = await requireSuperAdmin();

  const schema = fieldSchemas[field];
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await saveSiteContentField(field, parsed.data as LandingContent[K], user.userId);

  await logAction({
    userId: user.userId,
    branchId: user.branchId,
    action: "landing_page.content_updated",
    entityType: "site_content",
    entityId: 0,
    after: { field },
  });

  revalidatePath("/");
  return { error: null };
}
