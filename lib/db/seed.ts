import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "./client";
import { branches, roles, modules, rolePermissions, users, clientSequences, expenseCategories } from "./schema";
import { eq } from "drizzle-orm";

const MODULE_DEFS = [
  { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", routePrefix: "/dashboard", sortOrder: 0 },
  { key: "clients", label: "Clients", icon: "Users", routePrefix: "/clients", sortOrder: 10 },
  { key: "transactions", label: "Transactions", icon: "Banknote", routePrefix: "/transactions", sortOrder: 20 },
  { key: "expenses", label: "Expenses", icon: "Receipt", routePrefix: "/expenses", sortOrder: 30 },
  { key: "bank_reconciliation", label: "Bank Reconciliation", icon: "Landmark", routePrefix: "/bank-reconciliation", sortOrder: 40 },
  { key: "ledger", label: "Ledger", icon: "BookText", routePrefix: "/ledger", sortOrder: 45 },
  { key: "reports", label: "Reports", icon: "BarChart3", routePrefix: "/reports", sortOrder: 50 },
  { key: "import", label: "Excel Import", icon: "Upload", routePrefix: "/import", sortOrder: 60 },
  { key: "loan_applications", label: "Agreements", icon: "HandCoins", routePrefix: "/agreements", sortOrder: 63 },
  { key: "approvals", label: "Approvals", icon: "CheckCheck", routePrefix: "/approvals", sortOrder: 65 },
  { key: "users", label: "Users", icon: "UserCog", routePrefix: "/admin/users", sortOrder: 70 },
  { key: "roles", label: "Roles", icon: "ShieldCheck", routePrefix: "/admin/roles", sortOrder: 80 },
  { key: "branches", label: "Branches", icon: "Building2", routePrefix: "/admin/branches", sortOrder: 90 },
] as const;

const ROLE_DEFS = [
  { key: "super_admin", name: "Super Admin", isSystem: true },
  { key: "branch_admin", name: "Branch Admin", isSystem: true },
  { key: "loan_collector", name: "Collections Officer", isSystem: true },
  { key: "expense_officer", name: "Expense Officer", isSystem: true },
  { key: "viewer", name: "Viewer", isSystem: true },
  // Portal (borrower) accounts. Deliberately given no role_permissions rows
  // below — the portal is row-scoped to the account's own client record and
  // bypasses the module/permission system entirely (see requirePortalClient
  // in lib/auth/session.ts) rather than being granted fake module access.
  { key: "client", name: "Client Portal", isSystem: true },
] as const;

// module -> { view, create, edit, delete } per role key
const PERMISSION_MATRIX: Record<string, Record<string, [boolean, boolean, boolean, boolean]>> = {
  super_admin: Object.fromEntries(MODULE_DEFS.map((m) => [m.key, [true, true, true, true]])),
  branch_admin: {
    dashboard: [true, false, false, false],
    clients: [true, true, true, false],
    transactions: [true, true, true, false],
    expenses: [true, true, true, false],
    bank_reconciliation: [true, true, true, false],
    ledger: [true, true, true, false],
    reports: [true, false, false, false],
    import: [true, true, false, false],
    loan_applications: [true, false, true, false],
    approvals: [true, false, true, false],
    users: [true, true, true, false],
  },
  loan_collector: {
    dashboard: [true, false, false, false],
    clients: [true, true, false, false],
    transactions: [true, true, true, false],
  },
  expense_officer: {
    dashboard: [true, false, false, false],
    expenses: [true, true, false, false],
    reports: [true, false, false, false],
  },
  viewer: {
    dashboard: [true, false, false, false],
    clients: [true, false, false, false],
    transactions: [true, false, false, false],
    expenses: [true, false, false, false],
    bank_reconciliation: [true, false, false, false],
    ledger: [true, false, false, false],
    reports: [true, false, false, false],
  },
};

const EXPENSE_CATEGORY_DEFS = [
  "Directors Expenses",
  "Salaries and Allowances",
  "Travelling and Lodging",
  "Printing and Stationary",
  "Motor Vehicle Running Cost",
  "Newspapers and Periodicals",
  "Electricity and Water Rates",
  "Postage, Telephone and Internet",
  "General Furniture Repairs and Maintenance",
  "Public Relations and Advertisement",
  "Audit Fee",
  "Consulting Expenses",
  "Rent",
  "Licences and Insurance",
  "Staff Training and Development",
  "Bank Charges",
  "Local Transport",
  "Computer Repair and Maintenance",
  "General Office Expenses",
  "Entertainment",
  "Staff Retirement Benefit Scheme",
  "Supervision Expenses",
  "Generator Running Cost",
  "Vocational Employment Expenses",
  "Consumable Equipment and Machinery",
  "Investment Appraisal Expenses",
  "Community Development Payments",
  "Bad Debts Written Off",
  "Commission",
];

async function main() {
  const db = getDb();

  console.log("Seeding modules...");
  const moduleRows = await db
    .insert(modules)
    .values([...MODULE_DEFS])
    .onConflictDoNothing({ target: modules.key })
    .returning();
  const allModules = moduleRows.length ? moduleRows : await db.select().from(modules);
  const moduleByKey = new Map(allModules.map((m) => [m.key, m]));

  console.log("Seeding roles...");
  for (const roleDef of ROLE_DEFS) {
    await db
      .insert(roles)
      .values(roleDef)
      .onConflictDoUpdate({ target: roles.key, set: { name: roleDef.name } });
  }
  const allRoles = await db.select().from(roles);
  const roleByKey = new Map(allRoles.map((r) => [r.key, r]));

  console.log("Seeding role_permissions...");
  for (const [roleKey, modulePerms] of Object.entries(PERMISSION_MATRIX)) {
    const role = roleByKey.get(roleKey);
    if (!role) continue;
    for (const [moduleKey, [canView, canCreate, canEdit, canDelete]] of Object.entries(modulePerms)) {
      const mod = moduleByKey.get(moduleKey);
      if (!mod) continue;
      await db
        .insert(rolePermissions)
        .values({ roleId: role.id, moduleId: mod.id, canView, canCreate, canEdit, canDelete })
        .onConflictDoUpdate({
          target: [rolePermissions.roleId, rolePermissions.moduleId],
          set: { canView, canCreate, canEdit, canDelete },
        });
    }
  }

  console.log("Seeding Abuja branch...");
  const [abuja] = await db
    .insert(branches)
    .values({ code: "ABJ", name: "Abuja Branch", isActive: true })
    .onConflictDoNothing({ target: branches.code })
    .returning();
  const branch = abuja ?? (await db.select().from(branches).where(eq(branches.code, "ABJ")))[0];
  await db.insert(clientSequences).values({ branchId: branch.id, lastSeq: 0 }).onConflictDoNothing();

  console.log("Seeding expense categories...");
  await db
    .insert(expenseCategories)
    .values(EXPENSE_CATEGORY_DEFS.map((name) => ({ name })))
    .onConflictDoNothing({ target: expenseCategories.name });

  console.log("Seeding super admin user...");
  const superAdminRole = roleByKey.get("super_admin")!;
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
  if (existingAdmin.length === 0) {
    const tempPassword = "ChangeMe123!";
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await db.insert(users).values({
      username: "admin",
      passwordHash,
      fullName: "Super Admin",
      roleId: superAdminRole.id,
      branchId: branch.id,
      mustChangePassword: true,
    });
    console.log(`\nCreated super admin user:\n  username: admin\n  password: ${tempPassword}\n  (must change password on first login)\n`);
  } else {
    console.log("Super admin user already exists, skipping.");
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
