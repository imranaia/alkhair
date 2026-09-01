// Shared between server code (validation) and client components (the
// Product select on agreement forms, and the landing page) — deliberately
// has no "server-only" import so it can be used from either.

// Selectable when creating or approving an agreement — Lease isn't offered
// yet (its underlying Ijarah model is still "for later date" per the
// product brief), so it's listed on the landing page but left out here.
export const LOAN_PRODUCTS = [
  { value: "biz", label: "Alkhair Biz", description: "Project financing for entrepreneurs and business owners (Mudarabah)." },
  { value: "partner", label: "Alkhair Partner", description: "Equity-based support with shared profit and loss (Musharakah)." },
] as const;

// Every product shown on the landing page, including ones not yet
// selectable on an actual agreement.
export const ALL_LOAN_PRODUCTS = [
  ...LOAN_PRODUCTS,
  {
    value: "lease",
    label: "Alkhair Lease",
    description: "Alkhair purchases an asset and leases it to you for an agreed term (Ijara).",
    comingSoon: true,
  },
] as const;
