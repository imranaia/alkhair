import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listReconciliations } from "@/lib/db/bankReconciliation";
import { listActiveBranches } from "@/lib/db/branches";
import { Button } from "@/components/ui/button";
import { ReconciliationCard } from "./ReconciliationCard";
import { NewReconciliationDialog } from "./NewReconciliationDialog";

export default async function BankReconciliationPage() {
  const user = await requireModule("bank_reconciliation", "view");
  const { canCreate } = await getModulePermission("bank_reconciliation");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [rows, branches] = await Promise.all([
    listReconciliations({ branchId: isSuperAdmin ? null : user.branchId }),
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Bank Reconciliation</h1>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href="/bank-reconciliation/cash-book">
              <BookOpen className="size-4" />
              Cash Book
            </Link>
          </Button>
          {canCreate && <NewReconciliationDialog branches={branches} showBranchSelect={isSuperAdmin} />}
        </div>
      </div>

      {rows.length === 0 ? (
        <div data-tour="tour-reconciliation" className="glass-panel p-6 text-center text-muted-foreground">
          No reconciliations recorded yet.
        </div>
      ) : (
        <div data-tour="tour-reconciliation" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((r) => (
            <ReconciliationCard key={r.id} row={r} showBranch={isSuperAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
