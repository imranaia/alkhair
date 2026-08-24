import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listActiveClientsForSelect } from "@/lib/db/clients";
import { listDefaults, RESOLUTION_TYPES } from "@/lib/db/clientDefaults";

const RESOLUTION_LABELS = Object.fromEntries(RESOLUTION_TYPES.map((r) => [r.key, r.label]));
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { AddDefaultDialog } from "./AddDefaultDialog";
import { DefaultCard } from "./DefaultCard";

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ClientDefaultsPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const user = await requireModule("clients", "view");
  const { canEdit } = await getModulePermission("clients");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const [rows, clientOptions] = await Promise.all([
    listDefaults({ branchId }),
    branchId ? listActiveClientsForSelect(branchId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <BackLink href="/clients" label="Back to Clients" />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Bad Debts / Defaults</h1>
        {canEdit && branchId && <AddDefaultDialog clients={clientOptions} branchId={branchId} />}
      </div>

      {isSuperAdmin && (
        <GlassPanel className="p-4">
          <form className="flex items-end gap-3">
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
          </form>
        </GlassPanel>
      )}

      {rows.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground">No defaults recorded.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((r) => (
            <DefaultCard key={r.id} row={r} resolutionLabels={RESOLUTION_LABELS} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
