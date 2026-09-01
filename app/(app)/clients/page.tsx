import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listClients } from "@/lib/db/clients";
import { listActiveBranches } from "@/lib/db/branches";
import { listLoanCollectorsForBranch, listLoanCollectorsByBranch } from "@/lib/db/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientCard } from "./ClientCard";
import { NewClientDialog } from "./NewClientDialog";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireModule("clients", "view");
  const { canCreate, canEdit } = await getModulePermission("clients");
  const { q } = await searchParams;
  const isSuperAdmin = user.roleKey === "super_admin";

  const clients = await listClients({ branchId: isSuperAdmin ? null : user.branchId, search: q });
  const branches = isSuperAdmin ? await listActiveBranches() : [];

  const collectorsByBranch = isSuperAdmin
    ? await listLoanCollectorsByBranch(branches.map((b) => b.id))
    : new Map(user.branchId ? [[user.branchId, await listLoanCollectorsForBranch(user.branchId)]] : []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Clients</h1>
        <div data-tour="tour-clients-actions" className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href="/clients/defaults">
              <AlertTriangle className="size-4" />
              Defaults
            </Link>
          </Button>
          {canCreate && (
            <NewClientDialog
              branches={branches}
              collectorsByBranch={Object.fromEntries(collectorsByBranch)}
              showBranchSelect={isSuperAdmin}
              defaultBranchId={isSuperAdmin ? undefined : (user.branchId ?? undefined)}
            />
          )}
        </div>
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or client code…" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {clients.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground">No clients yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} canEdit={canEdit} collectors={collectorsByBranch.get(c.branchId) ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
