import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listUsersForBranch } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listActiveBranches } from "@/lib/db/branches";
import { NewUserDialog } from "./NewUserDialog";
import { UserCard } from "./UserCard";

const BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS = ["loan_collector", "expense_officer", "viewer"];

export default async function UsersPage() {
  const sessionUser = await requireModule("users", "view");
  const { canCreate, canEdit } = await getModulePermission("users");
  const isSuperAdmin = sessionUser.roleKey === "super_admin";

  const [users, allRoles, branches] = await Promise.all([
    listUsersForBranch(isSuperAdmin ? null : sessionUser.branchId),
    listRoles(),
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
  ]);

  const assignableRoles = isSuperAdmin ? allRoles : allRoles.filter((r) => BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS.includes(r.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        {canCreate && <NewUserDialog roles={assignableRoles} branches={branches} showBranchSelect={isSuperAdmin} />}
      </div>

      {users.length === 0 ? (
        <div data-tour="tour-admin-users" className="glass-panel p-6 text-center text-muted-foreground">
          No users yet.
        </div>
      ) : (
        <div data-tour="tour-admin-users" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              roles={
                assignableRoles.some((r) => r.id === u.roleId)
                  ? assignableRoles
                  : [...assignableRoles, { id: u.roleId, name: u.roleName }]
              }
              branches={branches}
              showBranchSelect={isSuperAdmin}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
