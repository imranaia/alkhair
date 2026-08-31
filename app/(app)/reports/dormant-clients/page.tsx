import Link from "next/link";
import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listDormantClients } from "@/lib/db/clients";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function DormantClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;

  const rows = await listDormantClients({ branchId });

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Dormant Clients</h1>
        <p className="text-sm text-muted-foreground">
          Clients marked dormant, or with no activity in the last 60 days but still carrying a savings balance —
          mirrors the source ledger&apos;s own dormant-savers tracking.
        </p>
      </div>

      {isSuperAdmin && (
        <GlassPanel className="p-4">
          <form className="flex items-end gap-3">
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
          </form>
        </GlassPanel>
      )}

      {rows.length === 0 ? (
        <EmptyBox>No dormant clients — everyone&apos;s been active in the last 60 days.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <RecordBox
              key={r.id}
              cols={isSuperAdmin ? 4 : 3}
              header={
                <>
                  <div>
                    <Link href={`/clients/${r.id}`} className="font-semibold hover:underline">
                      {r.fullName}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">{r.clientCode}</span>
                  </div>
                  <Badge variant={r.status === "dormant" ? "secondary" : "outline"} className="capitalize">
                    {r.status}
                  </Badge>
                </>
              }
              fields={[
                ...(isSuperAdmin ? [{ label: "Branch", value: r.branchName }] : []),
                { label: "Last Activity", value: r.lastTransactionDate ?? "Never" },
                { label: "Savings Balance", value: money(r.savingsBalance), align: "right" as const },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
