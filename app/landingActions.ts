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
const moneyFlowStepSchema = z.object({ label: z.string().trim().min(1).max(60), detail: z.string().trim().min(1).max(200) });
const productSchema = z.object({
  label: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(300),
  comingSoon: z.boolean(),
});

const fieldSchemas = {
  heroHeadline: z.string().trim().min(1).max(200),
  heroSubheadline: z.string().trim().min(1).max(400),
  contactPhone: z.string().trim().min(1).max(40),
  contactEmail: z.string().trim().email().max(120),
  moneyFlowHeading: z.string().trim().min(1).max(80),
  // Fixed at 3 — tied one-to-one to the icons and animated path.
  moneyFlowSteps: z.array(moneyFlowStepSchema).length(3),
  tradesHeading: z.string().trim().min(1).max(80),
  trades: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
  peopleHeading: z.string().trim().min(1).max(80),
  // Fixed at 3 — tied one-to-one to the placeholder photos.
  peopleLabels: z.array(z.string().trim().min(1).max(60)).length(3),
  productsHeading: z.string().trim().min(1).max(80),
  products: z.array(productSchema).min(1).max(10),
  featuresHeading: z.string().trim().min(1).max(80),
  featureLabels: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  requirementsHeading: z.string().trim().min(1).max(80),
  requirements: z.array(requirementSchema).min(1).max(20),
  missionHeading: z.string().trim().min(1).max(200),
  missionBody: z.string().trim().min(1).max(500),
} as const;

export async function saveLandingFieldAction<K extends keyof LandingContent>(
  field: K,
  value: LandingContent[K],
): Promise<SaveLandingFieldState> {
  const user = await requireSuperAdmin();

  // `field` is only a valid key at compile time — a Server Action is a real
  // network endpoint, so a hand-crafted request could send anything here.
  // Without this check, an unrecognized field would hit fieldSchemas[field]
  // as undefined and throw on the next line instead of returning a normal
  // error.
  if (!(field in fieldSchemas)) {
    return { error: "Unknown field." };
  }

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
