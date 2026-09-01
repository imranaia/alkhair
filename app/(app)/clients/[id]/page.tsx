import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule, getModulePermission, isAdmin } from "@/lib/auth/session";
import { getClientById, listClientTransactions } from "@/lib/db/clients";
import { getActiveLoanSummary, listLoanAgreementsForClient } from "@/lib/db/loanAgreements";
import { getClientLogin } from "@/lib/db/users";
import { getLatestChecklist } from "@/lib/db/checklists";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordBox, EmptyBox } from "@/components/ui/record-box";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { CheckCircle2, XCircle } from "lucide-react";
import { ClientStatusControl } from "./ClientStatusControl";
import { RecordMaturityDialog } from "./RecordMaturityDialog";
import { ApplyLoanDialog } from "./ApplyLoanDialog";
import { ChecklistDialog } from "./ChecklistDialog";
import { PortalPanel } from "./PortalPanel";

function CheckStat({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("clients", "view");
  const { canEdit } = await getModulePermission("clients");
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();

  const client = await getClientById(clientId);
  if (!client) notFound();
  if (user.roleKey !== "super_admin" && client.branchId !== user.branchId) notFound();

  const transactions = await listClientTransactions(clientId);
  const loanSummary = await getActiveLoanSummary(clientId);
  const loanHistory = await listLoanAgreementsForClient(clientId);
  const portalLogin = await getClientLogin(clientId);
  const checklist = await getLatestChecklist(clientId);
  const admin = isAdmin(user.roleKey);
  // No active loan right now — either this client has never had one, or
  // their last one is fully repaid. Either way, applying for a new
  // principal is the primary thing to do on this page, so it gets the
  // prominent banner below instead of being buried in the header row.
  const eligibleForNewPrincipal = !loanSummary;

  return (
    <div className="space-y-4">
      <BackLink href="/clients" label="Back to Clients" />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-lg font-semibold">{client.fullName}</h1>
          <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
            {client.status}
          </Badge>
          {canEdit && <ClientStatusControl clientId={client.id} status={client.status} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <ChecklistDialog clientId={client.id} />}
          {canEdit && admin && !eligibleForNewPrincipal && (
            <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link href={`/clients/${client.id}/new-agreement`}>New principal agreement</Link>
            </Button>
          )}
          {canEdit && !admin && !eligibleForNewPrincipal && (
            <ApplyLoanDialog
              clientId={client.id}
              fullName={client.fullName}
              clientCode={client.clientCode}
              phone={client.phone}
              businessType={client.businessType}
            />
          )}
          {canEdit && <RecordMaturityDialog clientId={client.id} branchId={client.branchId} />}
        </div>
      </div>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Client code</p>
          <p className="font-medium break-words">{client.clientCode}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Branch</p>
          <p className="font-medium break-words">{client.branchName}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Group</p>
          <p className="font-medium break-words">{client.groupName || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-medium break-words">{client.phone || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Enrollment date</p>
          <p className="font-medium break-words">{client.enrollmentDate}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Collections officer</p>
          <p className="font-medium break-words">{client.loanCollectorName || "Unassigned"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Trade / business</p>
          <p className="font-medium break-words">{client.businessType || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Business location</p>
          <p className="font-medium break-words">{client.businessLocation || "—"}</p>
        </div>
      </GlassPanel>

      {eligibleForNewPrincipal && (
        <GlassPanel className="flex flex-wrap items-center justify-between gap-3 border-2 border-brand/50 bg-brand/5 p-5">
          <div>
            <p className="font-semibold">{loanHistory.length === 0 ? "No principal yet" : "Eligible for a new principal"}</p>
            <p className="text-sm text-muted-foreground">
              {loanHistory.length === 0
                ? "This client hasn't taken a principal."
                : "Every past agreement below is fully repaid."}
              {canEdit ? " Apply for one below." : ""}
            </p>
          </div>
          {canEdit &&
            (admin ? (
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link href={`/clients/${client.id}/new-agreement`}>New principal agreement</Link>
              </Button>
            ) : (
              <ApplyLoanDialog
                clientId={client.id}
                fullName={client.fullName}
                clientCode={client.clientCode}
                phone={client.phone}
                businessType={client.businessType}
              />
            ))}
        </GlassPanel>
      )}

      {loanSummary && (
        <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div className="col-span-2 min-w-0 sm:col-span-4">
            <p className="text-xs text-muted-foreground">Loan ID</p>
            <p className="font-mono text-sm font-medium break-words">{loanSummary.agreement.loanId}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Principal</p>
            <p className="text-lg font-semibold break-words">{money(loanSummary.agreement.principalAmount)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className="text-lg font-semibold break-words">{money(loanSummary.agreement.profitAmount)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Next payment due</p>
            <p className="text-lg font-semibold break-words">
              {loanSummary.nextDue ? `${money(loanSummary.nextDue.dueAmount)} on ${loanSummary.nextDue.dueDate}` : "—"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Remaining balance</p>
            <p className="text-lg font-semibold text-primary break-words">{money(loanSummary.remainingBalance)}</p>
          </div>
        </GlassPanel>
      )}

      {loanHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Loan history</h2>
          {loanHistory.map((a) => (
            <RecordBox
              key={a.id}
              cols={4}
              header={
                <>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{a.loanId}</p>
                    <p className="font-medium">{a.startDate}</p>
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">
                    {a.status}
                  </Badge>
                </>
              }
              fields={[
                { label: "Principal", value: money(a.principalAmount), align: "right" },
                { label: "Profit", value: money(a.profitAmount), align: "right" },
                { label: "Tenure", value: `${a.tenureWeeks} wks` },
                { label: "Payment day", value: PAYMENT_DAYS.find((d) => d.value === a.paymentDay)?.label ?? "—" },
                { label: "Purpose", value: a.purpose || "—", span: true },
              ]}
            />
          ))}
        </div>
      )}

      {checklist && (
        <GlassPanel className="space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Pre-disbursement checklist</h2>
            <span className="text-xs text-muted-foreground">
              {new Date(checklist.createdAt).toLocaleDateString()} &middot; {checklist.officerName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <CheckStat label="Shop owner" done={checklist.shopOwner} />
            <CheckStat label="Renting shop" done={checklist.rentingShop} />
            <CheckStat label="GPS photo verified" done={checklist.gpsPhotoVerified} />
            <CheckStat label="GPS time verified" done={checklist.gpsTimeVerified} />
            <CheckStat label="Application form filled" done={checklist.applicationFormFilled} />
            <CheckStat label="Appraisal report attached" done={checklist.appraisalReportAttached} />
            <CheckStat label="Stock availability checked" done={checklist.stockAvailabilityChecked} />
            {checklist.clientType === "returning" && (
              <>
                <CheckStat label="Supervision report attached" done={!!checklist.supervisionReportAttached} />
                <CheckStat label="Principal amount reviewed" done={!!checklist.loanAmountReviewed} />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Client type</p>
              <p className="text-sm font-medium capitalize break-words">{checklist.clientType}</p>
            </div>
            {checklist.amountApproved && (
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Amount approved</p>
                <p className="text-sm font-medium break-words">{money(checklist.amountApproved)}</p>
              </div>
            )}
            {checklist.preferredTenureMonths && (
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Preferred tenure</p>
                <p className="text-sm font-medium break-words">{checklist.preferredTenureMonths} months</p>
              </div>
            )}
            {checklist.nin && (
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">NIN</p>
                <p className="text-sm font-medium break-words">{checklist.nin}</p>
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      {canEdit && <PortalPanel clientId={client.id} existingLogin={portalLogin} />}

      <h2 className="text-sm font-semibold text-muted-foreground">Transaction history</h2>
      {transactions.length === 0 ? (
        <EmptyBox>No transactions recorded yet.</EmptyBox>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <RecordBox
              key={t.id}
              cols={4}
              header={
                <>
                  <p className="font-medium">{t.transactionDate}</p>
                  <p className="font-mono text-xs text-muted-foreground">{t.paymentId ?? "—"}</p>
                </>
              }
              fields={[
                { label: "Principal Disb.", value: money(t.loanDisbursement), align: "right" },
                { label: "Recall", value: money(t.loanRecovery), align: "right" },
                { label: "New Savings", value: money(t.newSavings), align: "right" },
                { label: "Collateral In", value: money(t.collateralTransferIn), align: "right" },
                { label: "Collateral Out", value: money(t.collateralTransferOut), align: "right" },
                { label: "Savings B/F", value: money(t.savingsBalanceBf), align: "right" },
                { label: "Savings C/F", value: money(t.savingsBalanceCf), align: "right" },
              ]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
