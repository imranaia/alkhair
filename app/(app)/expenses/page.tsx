import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listExpenses, getExpensesByCategory, listExpenseCategories } from "@/lib/db/expenses";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExpenseCard } from "./ExpenseCard";
import { NewExpenseDialog } from "./NewExpenseDialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const user = await requireModule("expenses", "view");
  const { canCreate } = await getModulePermission("expenses");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from, to } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;

  const [rows, byCategory, categories] = await Promise.all([
    listExpenses({ branchId, from, to }),
    getExpensesByCategory({ branchId, from, to }),
    listExpenseCategories(),
  ]);
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const nonZeroCategories = byCategory.filter((c) => Number(c.total) > 0);
  const zeroCategories = byCategory.filter((c) => Number(c.total) === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Expenses</h1>
        {canCreate && (
          <NewExpenseDialog branches={branches} categories={categories} showBranchSelect={isSuperAdmin} />
        )}
      </div>

      <GlassPanel data-tour="tour-expenses" className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-2">
              <label className="block text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground" htmlFor="from">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground" htmlFor="to">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      <h2 className="text-sm font-semibold text-muted-foreground">By Category</h2>
      <GlassPanel className="p-6">
        {nonZeroCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded in this range.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {nonZeroCategories.map((c) => (
              <div key={c.categoryId}>
                <p className="truncate text-xs text-muted-foreground">{c.categoryName}</p>
                <p className="font-semibold">{money(c.total)}</p>
              </div>
            ))}
          </div>
        )}
        {zeroCategories.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            No spending this range in: {zeroCategories.map((c) => c.categoryName).join(", ")}
          </p>
        )}
      </GlassPanel>

      {rows.length === 0 ? (
        <div className="glass-panel p-6 text-center text-muted-foreground">No expenses recorded yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {rows.map((r) => (
            <ExpenseCard key={r.id} expense={r} showBranch={isSuperAdmin} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="text-right text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{money(total)}</span>
        </div>
      )}
    </div>
  );
}
