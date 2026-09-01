import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listRoles } from "@/lib/db/roles";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { NewRoleDialog } from "./NewRoleDialog";

export default async function RolesPage() {
  await requireModule("roles", "view");
  const { canCreate } = await getModulePermission("roles");
  const roles = await listRoles();

  return (
    <div className="space-y-4" data-tour="tour-roles">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Roles</h1>
        {canCreate && <NewRoleDialog />}
      </div>

      <GlassPanel className="divide-y divide-border overflow-hidden p-0">
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/admin/roles/${role.id}`}
            className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-foreground/5"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-medium">{role.name}</span>
              {role.isSystem && (
                <Badge variant="secondary" className="text-xs">
                  Preset
                </Badge>
              )}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </GlassPanel>
    </div>
  );
}
