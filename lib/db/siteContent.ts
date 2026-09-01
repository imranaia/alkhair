import "server-only";
import { getDb } from "./client";
import { siteContent } from "./schema";
import { eq, sql } from "drizzle-orm";

export type LandingContent = {
  heroHeadline: string;
  heroSubheadline: string;
  contactPhone: string;
  contactEmail: string;
  moneyFlowHeading: string;
  // Fixed at 3 — tied one-to-one (by index) to the phone/cash/bank icons and
  // the animated path in MoneyFlowDiagram, so only the wording is editable.
  moneyFlowSteps: { label: string; detail: string }[];
  tradesHeading: string;
  // Variable length — icons cycle through a fixed set by index, so a super
  // admin can add a new trade without needing to pick an icon for it.
  trades: string[];
  peopleHeading: string;
  // Fixed at 3 — tied one-to-one to the placeholder photos.
  peopleLabels: string[];
  productsHeading: string;
  // Decorative marketing copy only — NOT the same list that governs which
  // products are selectable on an actual loan agreement (see
  // lib/constants/loanProducts.ts). Adding one here doesn't make it a real
  // selectable product.
  products: { label: string; description: string; comingSoon: boolean }[];
  featuresHeading: string;
  featureLabels: string[];
  requirementsHeading: string;
  requirements: { label: string; detail: string }[];
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
  moneyFlowHeading: "How the money moves",
  moneyFlowSteps: [
    { label: "You apply", detail: "Tell us about your business and how much you need, right from your phone." },
    { label: "Cash reaches you", detail: "Approved principal is paid directly into your hands, no collateral held." },
    { label: "You repay weekly", detail: "Small, predictable installments as your business earns, paid in at your branch." },
  ],
  tradesHeading: "Who we finance",
  trades: [
    "Market Trader",
    "Car Wash Operator",
    "Food Vendor / Cook",
    "Shop Owner",
    "Tailor / Fashion Designer",
    "Laundry / Dry Cleaner",
    "POS / Mobile Money Agent",
    "Phone Seller / Repairer",
    "Butcher",
  ],
  peopleHeading: "Built for people like you",
  peopleLabels: ["Market Trader", "Tailor", "Food Vendor"],
  productsHeading: "Our products",
  products: [
    { label: "Alkhair Biz", description: "Project financing for entrepreneurs and business owners (Mudarabah).", comingSoon: false },
    { label: "Alkhair Partner", description: "Equity-based support with shared profit and loss (Musharakah).", comingSoon: false },
    { label: "Alkhair Lease", description: "Alkhair purchases an asset and leases it to you for an agreed term (Ijara).", comingSoon: true },
  ],
  featuresHeading: "Why work with us",
  featureLabels: [
    "Fast processing and approval",
    "Ethical financing — profit only, never interest",
    "Flexible collateral options",
    "Flexible weekly repayment",
    "Friendly, responsive support",
    "Simple, clear terms",
  ],
  requirementsHeading: "What you need to apply",
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
