import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/branches";
import { NewBranchDialog } from "./NewBranchDialog";
import { BranchCard } from "./BranchCard";

export default async function BranchesPage() {
  await requireModule("branches", "view");
  const { canCreate, canEdit } = await getModulePermission("branches");
  const branches = await listBranches();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Branches</h1>
        {canCreate && <NewBranchDialog />}
      </div>

      {branches.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground">No branches yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
