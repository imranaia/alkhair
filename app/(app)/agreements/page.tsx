import Link from "next/link";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listPendingLoanApplications } from "@/lib/db/pendingChanges";
import { listActiveLoanAgreements } from "@/lib/db/loanAgreements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { ALL_LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import { LoanApplicationCard } from "./LoanApplicationCard";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AgreementsPage() {
  const user = await requireModule("loan_applications", "view");
  const { canCreate, canEdit } = await getModulePermission("loan_applications");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [pending, ongoing] = await Promise.all([
    listPendingLoanApplications(isSuperAdmin ? null : user.branchId),
    listActiveLoanAgreements(isSuperAdmin ? null : user.branchId),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Agreements</h1>
          <p className="text-sm text-muted-foreground">Every currently ongoing principal, and requests waiting on approval.</p>
        </div>
        <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Link href="/clients">Select a client to start a new agreement</Link>
        </Button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground">Pending approval ({pending.length})</h2>
      {pending.length === 0 ? (
        <EmptyBox>No pending loan applications.</EmptyBox>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <LoanApplicationCard key={r.id} row={r} canRecommend={canCreate} canApprove={canEdit} />
          ))}
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Ongoing agreements ({ongoing.length})</h2>
      {ongoing.length === 0 ? (
        <EmptyBox>No ongoing agreements right now.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {ongoing.map((o) => (
            <Link key={o.agreement.id} href={`/clients/${o.client.id}`}>
              <RecordBox
                className="transition-colors hover:bg-accent/40"
                cols={4}
                header={
                  <>
                    <div>
                      <p className="font-semibold">
                        {o.client.fullName} <span className="text-xs font-normal text-muted-foreground">{o.client.clientCode}</span>
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">{o.agreement.loanId}</p>
                    </div>
                    <Badge variant="secondary">{ALL_LOAN_PRODUCTS.find((p) => p.value === o.agreement.product)?.label ?? o.agreement.product}</Badge>
                  </>
                }
                fields={[
                  { label: "Principal", value: money(o.agreement.principalAmount), align: "right" },
                  { label: "Remaining balance", value: money(o.remainingBalance), align: "right" },
                  {
                    label: "Next payment due",
                    value: o.nextDue ? `${money(o.nextDue.dueAmount)} on ${o.nextDue.dueDate}` : "—",
                  },
                  { label: "Payment day", value: PAYMENT_DAYS.find((d) => d.value === o.agreement.paymentDay)?.label ?? "—" },
                ]}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
