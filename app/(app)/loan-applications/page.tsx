import { requireModule } from "@/lib/auth/session";
import { listPendingLoanApplications } from "@/lib/db/pendingChanges";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoanApplicationActions } from "./LoanApplicationActions";

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

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount requested</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const proposed = r.proposedChanges as { amountRequested?: number; purpose?: string; tenureWeeksRequested?: number };
              const amountRequested = Number(proposed?.amountRequested ?? 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{new Date(r.requestedAt).toLocaleString()}</TableCell>
                  <TableCell>{r.requestedByName}</TableCell>
                  <TableCell>
                    {r.clientFullName} <span className="text-xs text-muted-foreground">{r.clientCode}</span>
                  </TableCell>
                  <TableCell className="font-medium text-brand">₦{amountRequested.toLocaleString()}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{proposed?.purpose || "—"}</TableCell>
                  <TableCell className="text-right">
                    <LoanApplicationActions
                      id={r.id}
                      amountRequested={amountRequested}
                      tenureWeeksRequested={proposed?.tenureWeeksRequested ?? null}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No pending loan applications.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
