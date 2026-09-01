import "server-only";
import { getDb } from "./client";
import { siteContent } from "./schema";
import { eq, sql } from "drizzle-orm";

export type LandingContent = {
  heroHeadline: string;
  heroSubheadline: string;
  contactPhone: string;
  contactEmail: string;
  // Fixed-length, matched by index to the icon each slot already has on the
  // page — editing changes the wording only, not how many there are.
  featureLabels: string[]; // 6
  requirements: { label: string; detail: string }[]; // 4
  missionHeading: string;
  missionBody: string;
};

// What the page shows before a super admin has ever saved anything —
// matches the copy the page originally shipped with.
export const DEFAULT_LANDING_CONTENT: LandingContent = {
  heroHeadline: "Financing for the business you already run.",
  heroSubheadline:
    "Fast approval, flexible collateral, and transparent profit terms — no interest, ever — built for market traders, shop owners, and service providers.",
  contactPhone: "+234 800 000 0000",
  contactEmail: "alkhairmicrocredit@gmail.com",
  featureLabels: [
    "Fast processing and approval",
    "Ethical financing — profit only, never interest",
    "Flexible collateral options",
    "Flexible weekly repayment",
    "Friendly, responsive support",
    "Simple, clear terms",
  ],
  requirements: [
    { label: "Your own business", detail: "An existing trade or service you run — financing is built around businesses already up and running." },
    { label: "A valid NIN", detail: "National Identification Number on record before approval." },
    { label: "A guarantor with their own business or work", detail: "Not a family member, someone independent who can vouch for you." },
    { label: "A business within 5km", detail: "Your trade should be based close to the branch you apply through." },
  ],
  missionHeading: "Every small business deserves the opportunity.",
  missionBody:
    "Alkhair Microcredit Limited supports hardworking entrepreneurs with financing built around how they actually work, week to week, trade to trade.",
};

const KEY = "landing";

export async function getSiteContent(): Promise<LandingContent> {
  const db = getDb();
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEY));
  if (!row) return DEFAULT_LANDING_CONTENT;
  // Merge over defaults so a partially-saved row (or a field added to the
  // shape after the row was first created) never renders as missing/blank.
  return { ...DEFAULT_LANDING_CONTENT, ...(row.content as Partial<LandingContent>) };
}

export async function saveSiteContentField<K extends keyof LandingContent>(
  field: K,
  value: LandingContent[K],
  updatedBy: number,
): Promise<LandingContent> {
  const db = getDb();
  const current = await getSiteContent();
  const next: LandingContent = { ...current, [field]: value };

  await db
    .insert(siteContent)
    .values({ key: KEY, content: next, updatedBy })
    .onConflictDoUpdate({
      target: siteContent.key,
      set: { content: next, updatedBy, updatedAt: sql`now()` },
    });

  return next;
}
