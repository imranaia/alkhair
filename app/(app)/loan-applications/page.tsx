import { requireModule } from "@/lib/auth/session";
import { listPendingLoanApplications } from "@/lib/db/pendingChanges";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { LoanApplicationCard } from "./LoanApplicationCard";

export default async function LoanApplicationsPage() {
  const user = await requireModule("loan_applications", "view");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listPendingLoanApplications(isSuperAdmin ? null : user.branchId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Loan Applications</h1>
        <p className="text-sm text-muted-foreground">
          Requests for a new principal wait here until an admin reviews and approves them.
        </p>
      </div>

      {rows.length === 0 ? (
        <GlassPanel className="p-6 text-center text-muted-foreground">No pending loan applications.</GlassPanel>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <LoanApplicationCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
