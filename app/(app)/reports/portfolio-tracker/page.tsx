import { format, startOfWeek, endOfWeek } from "date-fns";
import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { getDailyPortfolioTracker } from "@/lib/db/portfolioTracker";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function PortfolioTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from: fromParam, to: toParam } = await searchParams;

  const defaultFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultTo = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : defaultFrom;
  const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : defaultTo;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  if (!branchId) {
    return (
      <div className="space-y-4">
        <BackLink href="/reports" label="Back to Reports" />
        <h1 className="text-lg font-semibold">Portfolio Tracker</h1>
        <GlassPanel className="p-6 text-center text-muted-foreground">Select a branch to begin.</GlassPanel>
      </div>
    );
  }

  const days = await getDailyPortfolioTracker({ branchId, from, to });
  const last = days[days.length - 1];

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Portfolio Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Day-by-day balance b/f → movement → balance c/f for Active, Default, Net Office, and Savings investment —
          mirrors the source ledger&apos;s own CGL Tracker sheet.
        </p>
      </div>

      <GlassPanel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={String(branchId)} className={nativeSelectClass}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground" htmlFor="from">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground" htmlFor="to">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      {last && (
        <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Active Investment (c/f)</p>
            <p className="text-lg font-semibold">{money(last.active.cf)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Default Investment (c/f)</p>
            <p className="text-lg font-semibold text-destructive">{money(last.default.cf)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Office Investment (c/f)</p>
            <p className="text-lg font-semibold">{money(last.netOffice.cf)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Savings Investment (c/f)</p>
            <p className="text-lg font-semibold text-primary">{money(last.savings.cf)}</p>
          </div>
        </GlassPanel>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Active Investment</h2>
      {days.length === 0 ? (
        <EmptyBox>No data for this range.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {days.map((d) => (
            <RecordBox
              key={d.date}
              header={<p className="font-medium">{d.date}</p>}
              cols={5}
              fields={[
                { label: "Balance B/F", value: money(d.active.bf), align: "right" },
                { label: "Principal Disbursement", value: money(d.active.disbursement), align: "right" },
                { label: "Active Recovery", value: money(d.active.recovery), align: "right" },
                { label: "Default", value: money(d.active.defaulted), align: "right" },
                { label: "Balance C/F", value: money(d.active.cf), align: "right" },
              ]}
            />
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Default Investment</h2>
      {days.length === 0 ? (
        <EmptyBox>No data for this range.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {days.map((d) => (
            <RecordBox
              key={d.date}
              header={<p className="font-medium">{d.date}</p>}
              cols={4}
              fields={[
                { label: "Balance B/F", value: money(d.default.bf), align: "right" },
                { label: "New Default", value: money(d.default.newDefault), align: "right" },
                { label: "Default Recovery", value: money(d.default.recovered), align: "right" },
                { label: "Balance C/F", value: money(d.default.cf), align: "right" },
              ]}
            />
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Net Office Investment</h2>
      {days.length === 0 ? (
        <EmptyBox>No data for this range.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {days.map((d) => (
            <RecordBox
              key={d.date}
              header={<p className="font-medium">{d.date}</p>}
              cols={5}
              fields={[
                { label: "Balance B/F", value: money(d.netOffice.bf), align: "right" },
                { label: "Principal Disbursement", value: money(d.netOffice.disbursement), align: "right" },
                { label: "Active Recovery", value: money(d.netOffice.recovery), align: "right" },
                { label: "Default", value: money(d.netOffice.defaulted), align: "right" },
                { label: "Balance C/F", value: money(d.netOffice.cf), align: "right" },
              ]}
            />
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Collateral (Savings) Investment</h2>
      {days.length === 0 ? (
        <EmptyBox>No data for this range.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {days.map((d) => (
            <RecordBox
              key={d.date}
              header={<p className="font-medium">{d.date}</p>}
              cols={6}
              fields={[
                { label: "Balance B/F", value: money(d.savings.bf), align: "right" },
                { label: "New Savings", value: money(d.savings.newSavings), align: "right" },
                { label: "Recall", value: money(d.savings.recall), align: "right" },
                { label: "Collateral In", value: money(d.savings.collateralIn), align: "right" },
                { label: "Collateral Out", value: money(d.savings.collateralOut), align: "right" },
                { label: "Balance C/F", value: money(d.savings.cf), align: "right" },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
