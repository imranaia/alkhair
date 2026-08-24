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
} from "lucide-react";
import { requireActiveUser } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import {
  getPortfolioSummary,
  getLoanPortfolioSummary,
  getDailyTransactionTotals,
  getDailyExpenseTotal,
  getTotalCollateralHeld,
  getTransactionTotalsForRange,
  getRecentTransactions,
} from "@/lib/db/reports";
import { getOpenDefaultCount } from "@/lib/db/clientDefaults";
import { listDutyAssignments, DUTY_POSTS } from "@/lib/db/dutyAssignments";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";

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

export default async function DashboardPage() {
  const user = await requireActiveUser();
  const isSuperAdmin = user.roleKey === "super_admin";
  const reportDate = today();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branches[0]?.id ?? null) : user.branchId;

  const [portfolio, loanPortfolio, dailyTotals, dailyExpenses, openDefaults, totalCollateral, recent, dutyToday] =
    await Promise.all([
      getPortfolioSummary(branchId),
      getLoanPortfolioSummary(branchId),
      getDailyTransactionTotals({ branchId, date: reportDate }),
      getDailyExpenseTotal({ branchId, date: reportDate }),
      getOpenDefaultCount(branchId),
      getTotalCollateralHeld(branchId),
      getRecentTransactions({ branchId, limit: 8 }),
      branchId ? listDutyAssignments({ branchId, date: reportDate }) : Promise.resolve([]),
    ]);

  const weekTotals = branchId
    ? await getTransactionTotalsForRange({ branchId, from: weekStart, to: reportDate })
    : null;

  const netCashMovement =
    Number(dailyTotals?.loanRecovery ?? 0) +
    Number(dailyTotals?.newSavings ?? 0) -
    Number(dailyTotals?.loanDisbursement ?? 0) -
    Number(dailyTotals?.savingsRecall ?? 0) -
    Number(dailyExpenses);

  const dutyMap = new Map(dutyToday.map((d) => [d.dutyPost, d.userName]));
  const currentBranchName = branches.find((b) => b.id === branchId)?.name;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-6">
        <h1 className="text-lg font-semibold">Welcome, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy")}
          {currentBranchName && ` — ${currentBranchName}`}
        </p>
      </GlassPanel>

      <GlassPanel data-tour="tour-dashboard-stats" className="grid grid-cols-2 gap-6 p-6 sm:grid-cols-3">
        <StatTile icon={Users} label="Active Clients" value={portfolio.activeClients.toLocaleString()} />
        <StatTile icon={Wallet} label="Active Principal Outstanding" value={money(loanPortfolio.activeLoanBalance)} />
        <StatTile icon={PiggyBank} label="Total Capital (Savings)" value={money(portfolio.totalSavings)} />
        <StatTile icon={ShieldCheck} label="Total Collateral Held" value={money(totalCollateral)} />
        <StatTile icon={ReceiptText} label="Today's Expenses" value={money(dailyExpenses)} emphasis="negative" />
        <StatTile
          icon={AlertTriangle}
          label="Open Defaults"
          value={`${openDefaults.toLocaleString()} (${money(loanPortfolio.openDefaultBalance)})`}
          emphasis={openDefaults > 0 ? "negative" : undefined}
        />
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel className="p-6 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Today — {reportDate}</h2>
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
            <p className="text-sm text-muted-foreground">Select a branch to see today&apos;s duty roster.</p>
          )}
          <Link href="/transactions" className="mt-4 inline-block text-xs text-primary hover:underline">
            Manage duty roster →
          </Link>
        </GlassPanel>
      </div>

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

      <GlassPanel className="flex flex-wrap items-center gap-2 p-4">
        <Link href="/reports/week-summary" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <BookOpen className="size-4" />
          Week Summary
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/reports" className="text-sm text-primary hover:underline">
          Full Reports
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/ledger" className="text-sm text-primary hover:underline">
          Ledger
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/clients" className="text-sm text-primary hover:underline">
          Clients
        </Link>
      </GlassPanel>
    </div>
  );
}
