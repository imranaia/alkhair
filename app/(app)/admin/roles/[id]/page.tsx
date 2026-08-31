import { notFound } from "next/navigation";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { getRole, getRolePermissionMatrix } from "@/lib/db/roles";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { updateRolePermissionsAction } from "../actions";
import { SubmitButton } from "./SubmitButton";

export default async function RolePermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("roles", "view");
  const { canEdit } = await getModulePermission("roles");
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId)) notFound();

  const role = await getRole(roleId);
  if (!role) notFound();

  const matrix = await getRolePermissionMatrix(roleId);
  const isSuperAdminRole = role.key === "super_admin";
  const isLocked = isSuperAdminRole || !canEdit;
  const action = updateRolePermissionsAction.bind(null, roleId);

  return (
    <div className="space-y-4">
      <BackLink href="/admin/roles" label="Back to Roles" />
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold">{role.name}</h1>
        {role.isSystem && (
          <Badge variant="secondary" className="text-xs">
            Preset
          </Badge>
        )}
      </div>

      {isSuperAdminRole && (
        <p className="text-sm text-muted-foreground">
          The Super Admin role always has full access to every module and cannot be changed.
        </p>
      )}
      {!isSuperAdminRole && !canEdit && (
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to change role permissions.</p>
      )}

      <form action={isLocked ? undefined : action}>
        <div className="space-y-2">
          {matrix.map((m) => (
            <GlassPanel key={m.moduleId} className="p-4">
              <p className="mb-2.5 font-medium">{m.moduleLabel}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-1.5">
                  <Checkbox name={`view_${m.moduleId}`} defaultChecked={m.canView} disabled={isLocked} />
                  View
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox name={`create_${m.moduleId}`} defaultChecked={m.canCreate} disabled={isLocked} />
                  Create
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox name={`edit_${m.moduleId}`} defaultChecked={m.canEdit} disabled={isLocked} />
                  Edit
                </label>
                <label className="flex items-center gap-1.5">
                  <Checkbox name={`delete_${m.moduleId}`} defaultChecked={m.canDelete} disabled={isLocked} />
                  Delete
                </label>
              </div>
            </GlassPanel>
          ))}
        </div>

        {!isLocked && (
          <div className="mt-4 flex justify-end">
            <SubmitButton />
          </div>
        )}
      </form>
    </div>
  );
}
