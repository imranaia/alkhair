import { format, startOfMonth } from "date-fns";
import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listLoanCollectorsForBranch } from "@/lib/db/users";
import { runCustomReport, REPORT_METRICS, GROUP_BY_OPTIONS, type GroupByKey, type MetricKey } from "@/lib/db/customReport";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function CustomReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    branchId?: string;
    from?: string;
    to?: string;
    collectorId?: string;
    groupBy?: string;
    metrics?: string | string[];
  }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const params = await searchParams;

  const defaultFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const from = params.from && !Number.isNaN(Date.parse(params.from)) ? params.from : defaultFrom;
  const to = params.to && !Number.isNaN(Date.parse(params.to)) ? params.to : today();

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (params.branchId ? Number(params.branchId) : null) : user.branchId;
  const collectorId = params.collectorId ? Number(params.collectorId) : undefined;
  const collectors = branchId ? await listLoanCollectorsForBranch(branchId) : [];

  const groupByOptions = GROUP_BY_OPTIONS.map((g) => g.key);
  const groupBy: GroupByKey = groupByOptions.includes(params.groupBy as GroupByKey)
    ? (params.groupBy as GroupByKey)
    : "day";

  const selectedMetricsRaw = Array.isArray(params.metrics) ? params.metrics : params.metrics ? [params.metrics] : null;
  const selectedMetrics: MetricKey[] = selectedMetricsRaw
    ? (selectedMetricsRaw.filter((m) => REPORT_METRICS.some((rm) => rm.key === m)) as MetricKey[])
    : REPORT_METRICS.map((m) => m.key);

  const rows = await runCustomReport({ branchId, from, to, groupBy, collectorId });

  const totals = REPORT_METRICS.reduce(
    (acc, m) => ({ ...acc, [m.key]: rows.reduce((s, r) => s + Number(r[m.key]), 0) }),
    {} as Record<MetricKey, number>,
  );

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Custom Report</h1>
        <p className="text-sm text-muted-foreground">
          Pick a date range, grouping, and which figures to show — builds the table on demand.
        </p>
      </div>

      <GlassPanel className="space-y-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {collectors.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground" htmlFor="collectorId">
                Collector
              </label>
              <select
                id="collectorId"
                name="collectorId"
                defaultValue={collectorId ? String(collectorId) : ""}
                className={nativeSelectClass}
              >
                <option value="">All collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs text-muted-foreground" htmlFor="groupBy">
              Group by
            </label>
            <select id="groupBy" name="groupBy" defaultValue={groupBy} className={nativeSelectClass}>
              {GROUP_BY_OPTIONS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
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

          <fieldset className="w-full space-y-1.5">
            <legend className="text-xs text-muted-foreground">Figures to show</legend>
            <div className="flex flex-wrap gap-3">
              {REPORT_METRICS.map((m) => (
                <label key={m.key} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="metrics"
                    value={m.key}
                    defaultChecked={selectedMetrics.includes(m.key)}
                    className="size-3.5"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit" variant="secondary">
            Generate
          </Button>
        </form>
      </GlassPanel>

      {rows.length === 0 ? (
        <EmptyBox>No transactions in this range.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <RecordBox
              key={i}
              cols={4}
              header={<p className="font-semibold">{r.groupLabel}</p>}
              fields={[
                ...REPORT_METRICS.filter((m) => selectedMetrics.includes(m.key)).map((m) => ({
                  label: m.label,
                  value: money(r[m.key]),
                  align: "right" as const,
                })),
                { label: "Entries", value: r.rowCount, align: "right" as const },
              ]}
            />
          ))}
          <RecordBox
            className="border-t-2 border-border"
            cols={4}
            header={<p className="font-semibold">Total</p>}
            fields={[
              ...REPORT_METRICS.filter((m) => selectedMetrics.includes(m.key)).map((m) => ({
                label: m.label,
                value: money(totals[m.key]),
                align: "right" as const,
              })),
              { label: "Entries", value: rows.reduce((s, r) => s + r.rowCount, 0), align: "right" as const },
            ]}
          />
        </div>
      )}
    </div>
  );
}
