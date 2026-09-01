import { notFound, redirect } from "next/navigation";
import { requireModule, isAdmin } from "@/lib/auth/session";
import { getClientById } from "@/lib/db/clients";
import { getActiveLoanSummary, listLoanAgreementsForClient } from "@/lib/db/loanAgreements";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { NewAgreementForm } from "./NewAgreementForm";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function NewLoanAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("loan_applications", "create");
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();

  const client = await getClientById(clientId);
  if (!client) notFound();
  if (user.roleKey !== "super_admin" && client.branchId !== user.branchId) notFound();
  // Non-admin officers submit a request instead — "Apply for principal" on
  // the client page, which waits for an admin to approve it.
  if (!isAdmin(user.roleKey)) redirect(`/clients/${client.id}`);

  const loanSummary = await getActiveLoanSummary(clientId);
  const loanHistory = await listLoanAgreementsForClient(clientId);
  const isReturning = loanHistory.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink href={`/clients/${client.id}`} label={`Back to ${client.fullName}`} />
      <h1 className="text-lg font-semibold">New principal agreement</h1>

      <GlassPanel className="p-4 text-sm">
        <p className="font-medium">{client.fullName}</p>
        <p className="text-xs text-muted-foreground">{client.clientCode}</p>
      </GlassPanel>

      {loanSummary ? (
        <GlassPanel className="p-6 text-center text-sm text-muted-foreground">
          This client has an outstanding principal of ₦{money(loanSummary.remainingBalance)} remaining on the
          principal started {loanSummary.agreement.startDate}. A new principal can&apos;t be issued until it&apos;s
          fully repaid.
        </GlassPanel>
      ) : (
        <GlassPanel className="p-6">
          <NewAgreementForm clientId={client.id} isReturning={isReturning} isSuperAdmin={user.roleKey === "super_admin"} />
        </GlassPanel>
      )}
    </div>
  );
}
