import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listCashBookEntries, listCashBookAccountNames } from "@/lib/db/cashBook";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { AddEntryDialog } from "./AddEntryDialog";
import { CashBookEntryCard } from "./CashBookEntryCard";

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function CashBookPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; accountName?: string }>;
}) {
  const user = await requireModule("bank_reconciliation", "view");
  const { canCreate } = await getModulePermission("bank_reconciliation");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, accountName } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const accountNames = branchId ? await listCashBookAccountNames(branchId) : [];
  const rows = branchId ? await listCashBookEntries({ branchId, accountName }) : [];

  return (
    <div className="space-y-4">
      <BackLink href="/bank-reconciliation" label="Back to Bank Reconciliation" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Cash Book</h1>
        {canCreate && branchId && <AddEntryDialog branchId={branchId} />}
      </div>

      <GlassPanel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {accountNames.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground" htmlFor="accountName">
                Account
              </label>
              <select id="accountName" name="accountName" defaultValue={accountName ?? ""} className={nativeSelectClass}>
                <option value="">All accounts</option>
                {accountNames.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
          {accountNames.length > 0 && (
            <button type="submit" className="h-8 rounded-lg bg-secondary px-3 text-sm">
              Filter
            </button>
          )}
        </form>
      </GlassPanel>

      {rows.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground">No cash book entries yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((r) => (
            <CashBookEntryCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
