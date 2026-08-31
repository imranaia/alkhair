import Link from "next/link";
import { requireModule } from "@/lib/auth/session";
import { listLoanMaturityEvents } from "@/lib/db/loanMaturity";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";

function money(n: string | number | null) {
  if (n === null) return "—";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function LoanMaturityPage() {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listLoanMaturityEvents({ branchId: isSuperAdmin ? null : user.branchId });
  const notRenewedCount = rows.filter((r) => !r.renewed).length;

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Principal Maturity</h1>
        <p className="text-sm text-muted-foreground">
          Clients whose principal cycle ended, and whether they took new principal — matches the source ledger&apos;s own
          &quot;Returning Clients of the Day not Renewing their Loans&quot; tracking.
        </p>
      </div>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-lg font-semibold">{rows.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Renewed</p>
          <p className="text-lg font-semibold text-primary">{rows.length - notRenewedCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Not Renewing</p>
          <p className="text-lg font-semibold text-destructive">{notRenewedCount}</p>
        </div>
      </GlassPanel>

      {rows.length === 0 ? (
        <EmptyBox>No principal maturity events recorded yet.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <RecordBox
              key={r.id}
              cols={isSuperAdmin ? 4 : 3}
              header={
                <>
                  <div>
                    <Link href={`/clients/${r.clientId}`} className="font-semibold hover:underline">
                      {r.clientName}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">{r.clientCode}</span>
                  </div>
                  <Badge variant={r.renewed ? "default" : "destructive"}>{r.renewed ? "Renewed" : "Not Renewing"}</Badge>
                </>
              }
              fields={[
                { label: "Date", value: r.maturedAt },
                ...(isSuperAdmin ? [{ label: "Branch", value: r.branchName }] : []),
                { label: "Amount With Client", value: money(r.amountWithClient), align: "right" as const },
                { label: "Recorded By", value: r.recordedByName },
                { label: "Notes", value: r.notes || "—", span: true },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
