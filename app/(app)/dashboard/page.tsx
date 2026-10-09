import Link from "next/link";
import { format, startOfWeek } from "date-fns";
import {
  Users,
  Wallet,
  PiggyBank,
  ShieldCheck,
  ReceiptText,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  ListChecks,
  Building2,
  UserCog,
  CheckCheck,
  HandCoins,
} from "lucide-react";
import { requireActiveUser, getSidebarModules } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listUsersForBranch } from "@/lib/db/users";
import { listPendingChanges, listPendingLoanApplications } from "@/lib/db/pendingChanges";
import {
  getPortfolioSummary,
  getLoanPortfolioSummary,
  getDailyTransactionTotals,
  getDailyExpenseTotal,
  getTotalCollateralHeld,
  getTransactionTotalsForRange,
  getRecentTransactions,
  getBranchBreakdown,
} from "@/lib/db/reports";
import { getOpenDefaultCount } from "@/lib/db/clientDefaults";
import { listDutyAssignments, DUTY_POSTS } from "@/lib/db/dutyAssignments";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchBreakdownCard } from "@/app/(app)/reports/BranchBreakdownCard";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatTile({
  icon: Icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={
          "flex size-9 shrink-0 items-center justify-center rounded-lg " +
          (emphasis === "negative" ? "bg-destructive/15 text-destructive" : "bg-brand/15 text-brand-foreground text-foreground")
        }
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            "break-words text-lg font-semibold " +
            (emphasis === "positive" ? "text-brand" : emphasis === "negative" ? "text-destructive" : "text-foreground")
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const user = await requireActiveUser();
  const isSuperAdmin = user.roleKey === "super_admin";
  const reportDate = today();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // The sidebar's own module list — a viewer sees exactly this set of
  // widgets on their dashboard too, so nobody gets a glimpse of numbers from
  // a module they can't otherwise open.
  const modules = await getSidebarModules(user.roleId);
  const can = new Set(modules.map((m) => m.key));
  const canClients = can.has("clients");
  const canTransactions = can.has("transactions");
  const canExpenses = can.has("expenses");
  const canLedger = can.has("ledger");
  const canReports = can.has("reports");
  const canApprovals = can.has("approvals");
  const canAgreements = can.has("loan_applications");
  const showPortfolioStats = canClients || canTransactions;
  const showStatsPanel = showPortfolioStats || canExpenses;

  const { branchId: branchIdParam } = await searchParams;
  const branches = isSuperAdmin ? await listActiveBranches() : [];
  // A super admin's KPIs default to every branch combined (branchId: null) —
  // same convention as /reports — with the option to drill into one branch
  // via the selector below. Everyone else is always scoped to their own.
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;

  const [
    portfolio,
    loanPortfolio,
    dailyTotals,
    dailyExpenses,
    openDefaults,
    totalCollateral,
    recent,
    dutyToday,
    weekTotals,
    breakdown,
    pendingApprovals,
    pendingLoanApps,
    allStaff,
  ] = await Promise.all([
    showPortfolioStats ? getPortfolioSummary(branchId) : Promise.resolve(null),
    canTransactions ? getLoanPortfolioSummary(branchId) : Promise.resolve(null),
    canTransactions ? getDailyTransactionTotals({ branchId, date: reportDate }) : Promise.resolve(null),
    canExpenses ? getDailyExpenseTotal({ branchId, date: reportDate }) : Promise.resolve(0),
    canClients ? getOpenDefaultCount(branchId) : Promise.resolve(0),
    canTransactions ? getTotalCollateralHeld(branchId) : Promise.resolve(0),
    canTransactions ? getRecentTransactions({ branchId, limit: 8 }) : Promise.resolve([]),
    canTransactions && branchId ? listDutyAssignments({ branchId, date: reportDate }) : Promise.resolve([]),
    canTransactions && branchId ? getTransactionTotalsForRange({ branchId, from: weekStart, to: reportDate }) : Promise.resolve(null),
    isSuperAdmin ? getBranchBreakdown(reportDate) : Promise.resolve(null),
    canApprovals ? listPendingChanges(isSuperAdmin ? null : user.branchId) : Promise.resolve([]),
    canAgreements ? listPendingLoanApplications(isSuperAdmin ? null : user.branchId) : Promise.resolve([]),
    isSuperAdmin ? listUsersForBranch(null) : Promise.resolve([]),
  ]);

  const netCashMovement =
    Number(dailyTotals?.loanRecovery ?? 0) +
    Number(dailyTotals?.newSavings ?? 0) -
    Number(dailyTotals?.loanDisbursement ?? 0) -
    Number(dailyTotals?.savingsRecall ?? 0) -
    Number(dailyExpenses);

  const dutyMap = new Map(dutyToday.map((d) => [d.dutyPost, d.userName]));
  const currentBranchName = branchId ? branches.find((b) => b.id === branchId)?.name : null;
  const activeStaffCount = allStaff.filter((u) => u.roleKey !== "client" && u.isActive).length;
  const hasPendingWidget = canApprovals || canAgreements;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-6">
        <h1 className="text-lg font-semibold">Welcome, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy")}
          {currentBranchName && ` — ${currentBranchName}`}
          {isSuperAdmin && !currentBranchName && " — All branches"}
        </p>
      </GlassPanel>

      {isSuperAdmin && (
        <GlassPanel className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          <StatTile icon={Building2} label="Active Branches" value={branches.length.toLocaleString()} />
          <StatTile icon={UserCog} label="Active Staff" value={activeStaffCount.toLocaleString()} />
          <StatTile
            icon={CheckCheck}
            label="Pending Approvals"
            value={pendingApprovals.length.toLocaleString()}
            emphasis={pendingApprovals.length > 0 ? "negative" : undefined}
          />
          <StatTile
            icon={HandCoins}
            label="Pending Loan Applications"
            value={pendingLoanApps.length.toLocaleString()}
            emphasis={pendingLoanApps.length > 0 ? "negative" : undefined}
          />
        </GlassPanel>
      )}

      {!isSuperAdmin && hasPendingWidget && (pendingApprovals.length > 0 || pendingLoanApps.length > 0) && (
        <GlassPanel className="flex flex-wrap items-center gap-4 p-4">
          {canApprovals && (
            <Link href="/approvals" className="flex items-center gap-2 text-sm hover:underline">
              <CheckCheck className="size-4 text-muted-foreground" />
              <span className="font-medium">{pendingApprovals.length}</span>
              <span className="text-muted-foreground">pending approval{pendingApprovals.length === 1 ? "" : "s"}</span>
            </Link>
          )}
          {canAgreements && (
            <Link href="/agreements" className="flex items-center gap-2 text-sm hover:underline">
              <HandCoins className="size-4 text-muted-foreground" />
              <span className="font-medium">{pendingLoanApps.length}</span>
              <span className="text-muted-foreground">pending loan application{pendingLoanApps.length === 1 ? "" : "s"}</span>
            </Link>
          )}
        </GlassPanel>
      )}

      {showStatsPanel && (
        <GlassPanel data-tour="tour-dashboard-stats" className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3">
          {canClients && <StatTile icon={Users} label="Active Clients" value={portfolio!.activeClients.toLocaleString()} />}
          {canTransactions && (
            <StatTile icon={Wallet} label="Active Principal Outstanding" value={money(loanPortfolio!.activeLoanBalance)} />
          )}
          {canTransactions && <StatTile icon={PiggyBank} label="Total Capital (Savings)" value={money(portfolio!.totalSavings)} />}
          {canTransactions && <StatTile icon={ShieldCheck} label="Total Collateral Held" value={money(totalCollateral)} />}
          {canExpenses && (
            <StatTile icon={ReceiptText} label="Today's Expenses" value={money(dailyExpenses)} emphasis="negative" />
          )}
          {canClients && (
            <StatTile
              icon={AlertTriangle}
              label="Open Defaults"
              value={canTransactions ? `${openDefaults.toLocaleString()} (${money(loanPortfolio?.openDefaultBalance ?? 0)})` : openDefaults.toLocaleString()}
              emphasis={openDefaults > 0 ? "negative" : undefined}
            />
          )}
        </GlassPanel>
      )}

      {canTransactions && (
        <div className="grid gap-4 lg:grid-cols-3">
          <GlassPanel className="p-6 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Today — {reportDate}</h2>
              {isSuperAdmin && (
                <form className="flex items-center gap-2">
                  <select name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" size="sm">
                    View
                  </Button>
                </form>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile icon={ArrowDownCircle} label="Principal Disbursement" value={money(dailyTotals?.loanDisbursement ?? 0)} />
              <StatTile icon={ArrowUpCircle} label="Principal Recovery" value={money(dailyTotals?.loanRecovery ?? 0)} />
              <StatTile icon={PiggyBank} label="New Savings" value={money(dailyTotals?.newSavings ?? 0)} />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <StatTile
                icon={Wallet}
                label="Net Cash Movement"
                value={money(netCashMovement)}
                emphasis={netCashMovement >= 0 ? "positive" : "negative"}
              />
            </div>
            {weekTotals && (
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Week to date (since {weekStart})</h3>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Disbursed</p>
                    <p className="font-medium">{money(weekTotals.loanDisbursement)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Recovered</p>
                    <p className="font-medium">{money(weekTotals.loanRecovery)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">New Savings</p>
                    <p className="font-medium">{money(weekTotals.newSavings)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Savings Recall</p>
                    <p className="font-medium">{money(weekTotals.savingsRecall)}</p>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>

          <GlassPanel data-tour="tour-dashboard-duty" className="p-6">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <ListChecks className="size-4" />
              Duty Roster — {reportDate}
            </h2>
            {branchId ? (
              <ul className="space-y-2 text-sm">
                {DUTY_POSTS.map((post) => (
                  <li key={post.key} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{post.label}</span>
                    <span className={dutyMap.get(post.key) ? "font-medium" : "text-muted-foreground"}>
                      {dutyMap.get(post.key) ?? "Unassigned"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Select a branch above to see today&apos;s duty roster.</p>
            )}
            <Link href="/transactions" className="mt-4 inline-block text-xs text-primary hover:underline">
              Manage duty roster →
            </Link>
          </GlassPanel>
        </div>
      )}

      {isSuperAdmin && breakdown && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground">By Branch — {reportDate}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {breakdown.map((b) => (
              <BranchBreakdownCard key={b.branchId} branch={b} reportDate={reportDate} />
            ))}
          </div>
        </>
      )}

      {canTransactions && (
        <GlassPanel className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Recent Activity</h2>
            <Link href="/transactions" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.clientName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.clientCode} · {t.transactionDate}
                      {isSuperAdmin && ` · ${t.branchName}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right">
                    {Number(t.loanDisbursement) > 0 && <Badge variant="secondary">Disb. {money(t.loanDisbursement)}</Badge>}
                    {Number(t.loanRecovery) > 0 && <Badge variant="secondary">Rec. {money(t.loanRecovery)}</Badge>}
                    {Number(t.newSavings) > 0 && <Badge variant="secondary">Sav. {money(t.newSavings)}</Badge>}
                    {t.paymentId && <span className="text-xs text-muted-foreground">{t.paymentId}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      )}

      {(canReports || canLedger || canClients) && (
        <GlassPanel className="flex flex-wrap items-center gap-2 p-4">
          {canReports && (
            <>
              <Link href="/reports/week-summary" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <BookOpen className="size-4" />
                Week Summary
              </Link>
              <span className="text-muted-foreground">·</span>
              <Link href="/reports" className="text-sm text-primary hover:underline">
                Full Reports
              </Link>
            </>
          )}
          {canLedger && (
            <>
              <span className="text-muted-foreground">·</span>
              <Link href="/ledger" className="text-sm text-primary hover:underline">
                Ledger
              </Link>
            </>
          )}
          {canClients && (
            <>
              <span className="text-muted-foreground">·</span>
              <Link href="/clients" className="text-sm text-primary hover:underline">
                Clients
              </Link>
            </>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
