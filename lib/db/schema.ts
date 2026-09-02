import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  smallint,
  numeric,
  date,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===================== Branches =====================
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 30 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Roles / Modules / Permissions =====================
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  label: varchar("label", { length: 80 }).notNull(),
  icon: varchar("icon", { length: 40 }),
  routePrefix: varchar("route_prefix", { length: 80 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    canView: boolean("can_view").notNull().default(false),
    canCreate: boolean("can_create").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    canDelete: boolean("can_delete").notNull().default(false),
  },
  (t) => [uniqueIndex("role_module_unique").on(t.roleId, t.moduleId)],
);

// ===================== Users =====================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id),
  branchId: integer("branch_id").references(() => branches.id),
  // Set only for portal accounts (role "client") — links the login back to
  // the borrower's own client record. Null for every staff account.
  // Explicit AnyPgColumn return type breaks the users<->clients circular
  // type-inference cycle (clients.loan_collector_id references users.id).
  clientId: integer("client_id").references((): AnyPgColumn => clients.id),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  tokenVersion: integer("token_version").notNull().default(1),
  failedLoginAttempts: smallint("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdBy: integer("created_by"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Clients =====================
export const clientSequences = pgTable("client_sequences", {
  branchId: integer("branch_id")
    .primaryKey()
    .references(() => branches.id),
  lastSeq: integer("last_seq").notNull().default(0),
});

// Backs auto-generated Payment IDs (client transactions + cash book entries)
// — a single running counter per branch so every payment is uniquely
// trackable, separate from and never affecting the client's own permanent
// client_code.
export const paymentSequences = pgTable("payment_sequences", {
  branchId: integer("branch_id")
    .primaryKey()
    .references(() => branches.id),
  lastSeq: integer("last_seq").notNull().default(0),
});

// Backs the client-code sequence digit, which resets every calendar month
// (unlike client_sequences, which never resets) — one counter per
// branch+year+month.
export const clientMonthSequences = pgTable(
  "client_month_sequences",
  {
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.year, t.month] })],
);

// Backs the current client-code scheme: {BRANCH}-{enrollment weekday}-{seq},
// e.g. YOL-01-001 — a running counter per (branch, weekday) that never
// resets, so it's a straight count of "how many clients have ever enrolled
// on this weekday at this branch." client_month_sequences above backed the
// previous DDMM/monthly-reset scheme and is left in place unused rather than
// removed, since nothing currently reads it and dropping it isn't required
// for the new scheme to work.
export const clientWeekdaySequences = pgTable(
  "client_weekday_sequences",
  {
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    weekday: smallint("weekday").notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.branchId, t.weekday] })],
);

// Backs each loan agreement's loan_id (e.g. YOL-01-001-L1, ...-L2 for that
// same client's next loan after the first is repaid) — a running counter per
// client, so a loan's number always reflects how many loans that client has
// ever had, regardless of how many other clients exist.
export const clientLoanSequences = pgTable("client_loan_sequences", {
  clientId: integer("client_id")
    .primaryKey()
    .references(() => clients.id),
  lastSeq: integer("last_seq").notNull().default(0),
});

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    clientCode: varchar("client_code", { length: 20 }).notNull().unique(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    groupName: varchar("group_name", { length: 80 }),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    // A notable nearby building/feature — standard practice for locating an
    // address in areas without formal street numbering.
    landmark: varchar("landmark", { length: 150 }),
    enrollmentWeek: smallint("enrollment_week").notNull(),
    enrollmentDay: smallint("enrollment_day").notNull(),
    enrollmentDate: date("enrollment_date").notNull(),
    loanCollectorId: integer("loan_collector_id").references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    // Business/trade profile — matches the source ledger's own "Supervision
    // Dept Report" (Project + Location columns), captured at enrollment.
    businessType: varchar("business_type", { length: 80 }),
    businessLocation: varchar("business_location", { length: 120 }),
    // KYC fields from the AMC Pre-Disbursement Checklist that belong at
    // enrollment, not per loan — the loan-specific half of that same
    // checklist lives on loan_agreements instead (see below).
    nickname: varchar("nickname", { length: 120 }),
    nin: varchar("nin", { length: 20 }),
    neighborRelativePhone: varchar("neighbor_relative_phone", { length: 30 }),
    shopOwner: boolean("shop_owner"),
    rentingShop: boolean("renting_shop"),
    gpsPhotoVerified: boolean("gps_photo_verified"),
    gpsTimeVerified: boolean("gps_time_verified"),
    experienceYears: integer("experience_years"),
    customerType: varchar("customer_type", { length: 20 }), // walk_in | marketing
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_clients_branch").on(t.branchId)],
);

// ===================== Client portal notices =====================
// Short admin-authored messages shown on a borrower's portal dashboard.
// clientId null = branch-wide broadcast to every portal user in that branch.
export const clientNotices = pgTable(
  "client_notices",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").references(() => clients.id),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    message: text("message").notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_client_notices_client").on(t.clientId)],
);

// ===================== Pending changes (approval workflow) =====================
// Non-admin edits to clients/client_transactions land here instead of writing
// through; an admin approves (re-applies proposedChanges) or rejects.
export const pendingChanges = pgTable(
  "pending_changes",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 30 }).notNull(), // 'client' | 'client_transaction'
    entityId: integer("entity_id").notNull(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    proposedChanges: jsonb("proposed_changes").notNull(),
    requestedBy: integer("requested_by")
      .notNull()
      .references(() => users.id),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
    reviewedBy: integer("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
  },
  (t) => [index("idx_pending_changes_status").on(t.status)],
);

// ===================== Loan (Principal) agreements =====================
// Principal + profit + tenure -> an automatically computed repayment
// schedule (see lib/services/loanAgreement.ts). The weekly schedule itself
// isn't persisted per row — it's derived on demand from these fields.
export const loanAgreements = pgTable(
  "loan_agreements",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    principalAmount: numeric("principal_amount", { precision: 14, scale: 2 }).notNull(),
    profitAmount: numeric("profit_amount", { precision: 14, scale: 2 }).notNull(),
    totalRepayable: numeric("total_repayable", { precision: 14, scale: 2 }).notNull(),
    tenureWeeks: integer("tenure_weeks").notNull(),
    installmentAmount: numeric("installment_amount", { precision: 14, scale: 2 }).notNull(),
    startDate: date("start_date").notNull(),
    // A recovery payment already recorded for this client/date *before* this
    // agreement existed — almost always the previous loan's closing payment
    // on a same-day renewal. getActiveLoanSummary subtracts this from the
    // recovered total it sums from startDate onward, so that payment isn't
    // double-counted as progress against this new agreement too.
    openingRecoveryOffset: numeric("opening_recovery_offset", { precision: 14, scale: 2 }).notNull().default("0"),
    // The permanent, human-readable reference for this specific loan, e.g.
    // ZUB-01-001-L1 — the client's own code with a per-client loan sequence
    // appended (see client_loan_sequences).
    loanId: varchar("loan_id", { length: 40 }).notNull().unique(),
    // Set per agreement rather than on the client — the collection day a
    // client is assigned can differ from one loan to the next, so it isn't a
    // permanent client attribute.
    paymentDay: smallint("payment_day").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | completed | cancelled
    // What the borrower told us they need it for — set when the agreement
    // comes from an approved loan application; null for direct admin-created
    // agreements that skipped the application step.
    purpose: text("purpose"),
    // Which Alkhair product this loan is filed under — a classification tag
    // for reporting, not a different repayment structure; every product
    // still uses the same fixed principal+profit weekly schedule above.
    product: varchar("product", { length: 20 }).notNull(), // biz | partner | lease
    // Loan-specific half of the AMC Pre-Disbursement Checklist — the KYC
    // half lives on clients instead (see above). Filled in by whoever
    // creates the agreement (direct admin create, or an admin approving an
    // application), not the requesting officer.
    amountApplied: numeric("amount_applied", { precision: 14, scale: 2 }),
    recommendedAmount: numeric("recommended_amount", { precision: 14, scale: 2 }),
    applicationFormFilled: boolean("application_form_filled").notNull().default(false),
    appraisalReportAttached: boolean("appraisal_report_attached").notNull().default(false),
    // Returning-client-only checks — null for a client's first loan.
    supervisionReportAttached: boolean("supervision_report_attached"),
    loanAmountReviewed: boolean("loan_amount_reviewed"),
    stockAvailabilityChecked: boolean("stock_availability_checked").notNull().default(false),
    bankDetails: text("bank_details"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_loan_agreements_client").on(t.clientId)],
);

// ===================== Pre-disbursement checklist =====================
// Matches AMC Check list.docx — the branch officer's verification pass
// before a principal is disbursed (or a returning client's next cycle
// approved). One client can have several over time, one per disbursement.
export const preDisbursementChecklists = pgTable(
  "pre_disbursement_checklists",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    nickname: varchar("nickname", { length: 120 }),
    nin: varchar("nin", { length: 20 }),
    neighborRelativePhone: varchar("neighbor_relative_phone", { length: 30 }),
    shopOwner: boolean("shop_owner").notNull().default(false),
    rentingShop: boolean("renting_shop").notNull().default(false),
    gpsPhotoVerified: boolean("gps_photo_verified").notNull().default(false),
    gpsTimeVerified: boolean("gps_time_verified").notNull().default(false),
    amountApplied: numeric("amount_applied", { precision: 14, scale: 2 }),
    recommendedAmount: numeric("recommended_amount", { precision: 14, scale: 2 }),
    amountApproved: numeric("amount_approved", { precision: 14, scale: 2 }),
    clientType: varchar("client_type", { length: 20 }).notNull().default("new"), // new | returning
    preferredTenureMonths: integer("preferred_tenure_months"),
    typeOfBusiness: varchar("type_of_business", { length: 80 }),
    experienceYears: integer("experience_years"),
    applicationFormFilled: boolean("application_form_filled").notNull().default(false),
    customerType: varchar("customer_type", { length: 20 }), // walk_in | marketing
    appraisalReportAttached: boolean("appraisal_report_attached").notNull().default(false),
    // Returning-client-only checks on the source document — left null for new clients.
    supervisionReportAttached: boolean("supervision_report_attached"),
    loanAmountReviewed: boolean("loan_amount_reviewed"),
    stockAvailabilityChecked: boolean("stock_availability_checked").notNull().default(false),
    bankDetails: text("bank_details"),
    officerName: varchar("officer_name", { length: 120 }).notNull(),
    recordedBy: integer("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_checklists_client").on(t.clientId)],
);

// ===================== Import batches (declared before client_transactions, referenced by it) =====================
export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name", { length: 200 }).notNull(),
  importType: varchar("import_type", { length: 20 }).notNull().default("clients"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalRows: integer("total_rows").notNull().default(0),
  successRows: integer("success_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importRows = pgTable("import_rows", {
  id: serial("id").primaryKey(),
  importBatchId: integer("import_batch_id")
    .notNull()
    .references(() => importBatches.id, { onDelete: "cascade" }),
  rowNumber: integer("row_number").notNull(),
  rawData: jsonb("raw_data").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  createdClientId: integer("created_client_id").references(() => clients.id),
  createdTxnId: integer("created_txn_id"), // no FK: client_transactions is declared after this table
  createdExpenseId: integer("created_expense_id"), // no FK: expenses is declared after this table
  createdCashBookEntryId: integer("created_cash_book_entry_id"), // no FK: cash_book_entries is declared after this table
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Daily client transactions =====================
export const clientTransactions = pgTable(
  "client_transactions",
  {
    id: serial("id").primaryKey(),
    paymentId: varchar("payment_id", { length: 20 }).unique(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    transactionDate: date("transaction_date").notNull(),
    loanDisbursement: numeric("loan_disbursement", { precision: 14, scale: 2 }).notNull().default("0"),
    loanRecovery: numeric("loan_recovery", { precision: 14, scale: 2 }).notNull().default("0"),
    profitInterest: numeric("profit_interest", { precision: 14, scale: 2 }).notNull().default("0"),
    serviceCharge: numeric("service_charge", { precision: 14, scale: 2 }).notNull().default("0"),
    newSavings: numeric("new_savings", { precision: 14, scale: 2 }).notNull().default("0"),
    savingsRecall: numeric("savings_recall", { precision: 14, scale: 2 }).notNull().default("0"),
    collateralTransferIn: numeric("collateral_transfer_in", { precision: 14, scale: 2 }).notNull().default("0"),
    collateralTransferOut: numeric("collateral_transfer_out", { precision: 14, scale: 2 }).notNull().default("0"),
    savingsBalanceBf: numeric("savings_balance_bf", { precision: 14, scale: 2 }).notNull().default("0"),
    savingsBalanceCf: numeric("savings_balance_cf", { precision: 14, scale: 2 }).notNull().default("0"),
    // Lets staff correct the automatic day-mismatch detection when it's wrong
    // — e.g. a payment collected on the client's real day but entered into
    // the system late, which would otherwise be auto-flagged Supplementary.
    // 'not_supplementary' suppresses the flag; null/'auto' leaves it automatic.
    supplementaryOverride: varchar("supplementary_override", { length: 20 }),
    notes: text("notes"),
    recordedBy: integer("recorded_by")
      .notNull()
      .references(() => users.id),
    importRowId: integer("import_row_id").references(() => importRows.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("client_txn_date_unique").on(t.clientId, t.transactionDate),
    index("idx_txn_branch_date").on(t.branchId, t.transactionDate),
  ],
);

// ===================== Bad debt / default tracking =====================
export const clientDefaults = pgTable("client_defaults", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  defaultedAmount: numeric("defaulted_amount", { precision: 14, scale: 2 }).notNull(),
  defaultedAt: date("defaulted_at").notNull(),
  reason: text("reason"),
  resolvedAt: date("resolved_at"),
  // repaid | written_off | deceased — how the default was actually closed out,
  // matching the source ledger's own per-row annotations ("W/F", "Deceased").
  resolutionType: varchar("resolution_type", { length: 20 }),
  recordedBy: integer("recorded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Loan maturity / renewal tracking =====================
// Matches the source ledger's own "Returning Clients of the Day not Renewing
// their Loans" section — recorded when a client's loan cycle ends, capturing
// whether they took a new loan (renewed) or not.
export const loanMaturityEvents = pgTable("loan_maturity_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  maturedAt: date("matured_at").notNull(),
  renewed: boolean("renewed").notNull().default(false),
  amountWithClient: numeric("amount_with_client", { precision: 14, scale: 2 }),
  notes: text("notes"),
  recordedBy: integer("recorded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Expenses =====================
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    categoryId: integer("category_id")
      .notNull()
      .references(() => expenseCategories.id),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    receiptRef: varchar("receipt_ref", { length: 60 }),
    expenseDate: date("expense_date").notNull(),
    recordedBy: integer("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_expenses_branch_date").on(t.branchId, t.expenseDate)],
);

// ===================== Bank / cash reconciliation =====================
export const cashBookEntries = pgTable("cash_book_entries", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  entryDate: date("entry_date").notNull(),
  code: varchar("code", { length: 20 }),
  // Which named bank sub-account this entry belongs to (e.g. "Operations
  // account", "Investment account") — the source ledger splits banked
  // amounts across two such accounts. Null means a single undivided account.
  accountName: varchar("account_name", { length: 60 }),
  details: text("details"),
  refType: varchar("ref_type", { length: 10 }), // OR | PV | CQ
  refNumber: varchar("ref_number", { length: 30 }),
  debit: numeric("debit", { precision: 14, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).notNull().default("0"),
  runningBalance: numeric("running_balance", { precision: 14, scale: 2 }).notNull(),
  recordedBy: integer("recorded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankCashReconciliation = pgTable(
  "bank_cash_reconciliation",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    reconDate: date("recon_date").notNull(),
    // Same sub-account concept as cash_book_entries.account_name — null means
    // a single undivided account for that branch/day.
    accountName: varchar("account_name", { length: 60 }).notNull().default(""),
    bankBalance: numeric("bank_balance", { precision: 14, scale: 2 }).notNull(),
    cashBalance: numeric("cash_balance", { precision: 14, scale: 2 }).notNull(),
    bookBalance: numeric("book_balance", { precision: 14, scale: 2 }).notNull(),
    variance: numeric("variance", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    recordedBy: integer("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("branch_recon_date_unique").on(t.branchId, t.reconDate, t.accountName)],
);

// ===================== General ledger (Week Summary buckets) =====================
// Covers everything in the source "Week Summary" sheet not already captured
// by clients/transactions (loans, savings), expenses (operating expenses),
// or client_defaults (bad debt): funds transfer, asset purchase/disposal,
// borrowings, liabilities, and other investment income. `label` is free text
// (e.g. "Motor Vehicle", "Zenith Bank Account 1") rather than a fixed seeded
// taxonomy — this business's sub-accounts vary and aren't ours to hardcode.
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    section: varchar("section", { length: 30 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    entryDate: date("entry_date").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    recordedBy: integer("recorded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_ledger_branch_date").on(t.branchId, t.entryDate)],
);

// ===================== Daily duty roster =====================
// Matches the source sheet's daily sign-off block (Duty post | Name of
// officer): which staff member fills each duty post for a given branch+day.
export const dutyAssignments = pgTable(
  "duty_assignments",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    assignmentDate: date("assignment_date").notNull(),
    dutyPost: varchar("duty_post", { length: 30 }).notNull(), // branch_head | receiving_officer | supervision_officer | disbursement_officer
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    assignedBy: integer("assigned_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("duty_branch_date_post_unique").on(t.branchId, t.assignmentDate, t.dutyPost)],
);

// ===================== Audit log =====================
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  branchId: integer("branch_id").references(() => branches.id),
  action: varchar("action", { length: 60 }).notNull(),
  entityType: varchar("entity_type", { length: 60 }),
  entityId: integer("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ===================== Relations (for convenient query joins) =====================
export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  clients: many(clients),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(users),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  permissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  module: one(modules, { fields: [rolePermissions.moduleId], references: [modules.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  branch: one(branches, { fields: [clients.branchId], references: [branches.id] }),
  loanCollector: one(users, { fields: [clients.loanCollectorId], references: [users.id] }),
  transactions: many(clientTransactions),
}));

export const clientTransactionsRelations = relations(clientTransactions, ({ one }) => ({
  client: one(clients, { fields: [clientTransactions.clientId], references: [clients.id] }),
  branch: one(branches, { fields: [clientTransactions.branchId], references: [branches.id] }),
  recordedByUser: one(users, { fields: [clientTransactions.recordedBy], references: [users.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  branch: one(branches, { fields: [expenses.branchId], references: [branches.id] }),
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
}));

export const importBatchesRelations = relations(importBatches, ({ many }) => ({
  rows: many(importRows),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  batch: one(importBatches, { fields: [importRows.importBatchId], references: [importBatches.id] }),
}));

// ===================== Site content (landing page CMS) =====================
// One row per editable page — currently just "landing". Super admins edit
// this in place on the public landing page itself; everyone else just reads
// whatever's here (see lib/db/siteContent.ts for the fallback defaults used
// before this row exists).
export const siteContent = pgTable("site_content", {
  key: varchar("key", { length: 40 }).primaryKey(),
  content: jsonb("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});
