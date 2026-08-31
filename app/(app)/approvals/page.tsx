import { requireModule } from "@/lib/auth/session";
import { listPendingChanges } from "@/lib/db/pendingChanges";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { ApprovalCard } from "./ApprovalCard";

export default async function ApprovalsPage() {
  const user = await requireModule("approvals", "view");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listPendingChanges(isSuperAdmin ? null : user.branchId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Edits submitted by non-admin staff wait here until an admin approves or rejects them.
        </p>
      </div>

      {rows.length === 0 ? (
        <GlassPanel className="p-6 text-center text-muted-foreground">No pending changes.</GlassPanel>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <ApprovalCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
