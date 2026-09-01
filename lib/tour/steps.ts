export type TourStep = {
  id: string;
  /** Route to navigate to for this step. Omit to stay on the current page (used by centered steps). */
  path?: string;
  /** Matches a `data-tour="…"` attribute on the element to spotlight. Omit for a centered card. */
  target?: string;
  /** Module key from the sidebar — the step is skipped if the signed-in user can't see this module. */
  module?: string;
  title: string;
  body: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Alkhair Microcredit",
    body: "A quick walkthrough of every screen — about a minute per stop. Use Next/Back to move around, or Skip tour to stop any time. You can always replay this from your Profile page.",
  },
  {
    id: "dashboard-stats",
    path: "/dashboard",
    target: "tour-dashboard-stats",
    module: "dashboard",
    title: "Your daily snapshot",
    body: "Active clients, outstanding principal, savings, collateral, today's expenses and open defaults — the numbers you'd want first thing in the morning.",
  },
  {
    id: "dashboard-duty",
    path: "/dashboard",
    target: "tour-dashboard-duty",
    module: "dashboard",
    title: "Duty Roster",
    body: "Who's covering Branch Head, Receiving Officer, Supervision Officer and Disbursement Officer today. It's editable from the Transactions page.",
  },
  {
    id: "clients",
    path: "/clients",
    target: "tour-clients-actions",
    module: "clients",
    title: "Clients",
    body: "Your full roster, searchable by name or code. When adding a client, you choose their weekly payment day yourself — it's baked permanently into their client code, so it's worth getting right the first time.",
  },
  {
    id: "agreements",
    path: "/agreements",
    target: "tour-agreements",
    module: "loan_applications",
    title: "Agreements",
    body: "Pending principal requests and every ongoing agreement in one place. A branch admin can submit or recommend an amount here, but only super_admin (or whoever they assign) gives final approval.",
  },
  {
    id: "approvals",
    path: "/approvals",
    target: "tour-approvals",
    module: "approvals",
    title: "Approvals",
    body: "Edits a non-admin staff member makes — to a client record or a transaction — wait here for an admin to approve or reject before they take effect.",
  },
  {
    id: "txn-filters",
    path: "/transactions",
    target: "tour-txn-filters",
    module: "transactions",
    title: "Daily Transactions",
    body: "Where the day's collections get entered. Filter by date, branch and collector — it defaults to today's \"Due Today\" list so you're not scrolling past everyone else.",
  },
  {
    id: "txn-cards",
    path: "/transactions",
    target: "tour-txn-cards",
    module: "transactions",
    title: "One card per client",
    body: "Expand a card, enter figures, and Save just that card — it never touches anyone else's entry. Paid on the wrong day? The system auto-flags it Supplementary, with a checkbox to correct a false flag.",
  },
  {
    id: "expenses",
    path: "/expenses",
    target: "tour-expenses",
    module: "expenses",
    title: "Expenses",
    body: "Filter by branch and date range, with a By Category breakdown that also flags categories with zero spend — useful for spotting gaps.",
  },
  {
    id: "reconciliation",
    path: "/bank-reconciliation",
    target: "tour-reconciliation",
    module: "bank_reconciliation",
    title: "Bank Reconciliation",
    body: "Compares bank, cash and book balances for a date — variance shows in red. Adding one has an Auto-calculate button for the expected book balance, which you can still override against your physical count.",
  },
  {
    id: "ledger",
    path: "/ledger",
    target: "tour-ledger",
    module: "ledger",
    title: "Ledger",
    body: "For everything that isn't a client transaction or an expense — fund transfers, asset purchases, borrowings, other investment income. Feeds directly into the Week Summary report, so keep it current.",
  },
  {
    id: "reports-summary",
    path: "/reports",
    target: "tour-reports-summary",
    module: "reports",
    title: "Reports",
    body: "A daily/branch summary — disbursement, recovery, profit, savings movement and a Total Receipt figure matching the old paper ledger's own column.",
  },
  {
    id: "reports-links",
    path: "/reports",
    target: "tour-reports-links",
    module: "reports",
    title: "Seven deeper reports",
    body: "Portfolio Tracker (the digital CGL Tracker), Supplementary, Dormant Clients, Client Statement, Custom Report, Principal Maturity, and Week Summary — each one covered in the full user guide.",
  },
  {
    id: "import",
    path: "/import",
    target: "tour-import",
    module: "import",
    title: "Excel Import",
    body: "Bulk-add clients from a spreadsheet instead of one by one. Download the template first to get the exact expected columns, then upload — each batch is reviewable row by row.",
  },
  {
    id: "admin",
    path: "/admin/users",
    target: "tour-admin-users",
    module: "users",
    title: "Admin",
    body: "Manage staff accounts here. Branch admins can only assign Collections Officer, Expense Officer or Viewer.",
  },
  {
    id: "roles",
    path: "/admin/roles",
    target: "tour-roles",
    module: "roles",
    title: "Roles",
    body: "What each role can view, create, edit or delete, module by module. Build a custom role here if the presets don't fit — e.g. someone super_admin assigns to approve agreements without full admin access.",
  },
  {
    id: "branches",
    path: "/admin/branches",
    target: "tour-branches",
    module: "branches",
    title: "Branches",
    body: "Every branch on record — add one here before assigning staff or clients to it.",
  },
  {
    id: "profile",
    path: "/profile",
    target: "tour-profile",
    title: "Your profile",
    body: "Your account details, and a password change form you can use any time — not just when forced to.",
  },
  {
    id: "finish",
    title: "That's everything",
    body: "You can replay this tour any time from the help button in the top bar, or from your Profile page. Good luck out there.",
  },
];
