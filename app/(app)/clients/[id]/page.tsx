import { notFound } from "next/navigation";
import { requireModule, getModulePermission, isAdmin } from "@/lib/auth/session";
import { getClientById, listClientTransactions } from "@/lib/db/clients";
import { getActiveLoanSummary, listLoanAgreementsForClient } from "@/lib/db/loanAgreements";
import { getClientLogin } from "@/lib/db/users";
import { getLatestChecklist } from "@/lib/db/checklists";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import { ClientStatusControl } from "./ClientStatusControl";
import { RecordMaturityDialog } from "./RecordMaturityDialog";
import { LoanAgreementDialog } from "./LoanAgreementDialog";
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

  return (
    <div className="space-y-4">
      <BackLink href="/clients" label="Back to Clients" />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold">{client.fullName}</h1>
          <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
            {client.status}
          </Badge>
          {canEdit && <ClientStatusControl clientId={client.id} status={client.status} />}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <ChecklistDialog clientId={client.id} />}
          {canEdit && admin && <LoanAgreementDialog clientId={client.id} />}
          {canEdit && !admin && (
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
        <div>
          <p className="text-xs text-muted-foreground">Client code</p>
          <p className="font-medium">{client.clientCode}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Branch</p>
          <p className="font-medium">{client.branchName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Group</p>
          <p className="font-medium">{client.groupName || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-medium">{client.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Enrollment date</p>
          <p className="font-medium">{client.enrollmentDate}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Collections officer</p>
          <p className="font-medium">{client.loanCollectorName || "Unassigned"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trade / business</p>
          <p className="font-medium">{client.businessType || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Business location</p>
          <p className="font-medium">{client.businessLocation || "—"}</p>
        </div>
      </GlassPanel>

      {loanSummary && (
        <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Principal</p>
            <p className="text-lg font-semibold">{money(loanSummary.agreement.principalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className="text-lg font-semibold">{money(loanSummary.agreement.profitAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next payment due</p>
            <p className="text-lg font-semibold">
              {loanSummary.nextDue ? `${money(loanSummary.nextDue.dueAmount)} on ${loanSummary.nextDue.dueDate}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining balance</p>
            <p className="text-lg font-semibold text-primary">{money(loanSummary.remainingBalance)}</p>
          </div>
        </GlassPanel>
      )}

      {!loanSummary && loanHistory.length > 0 && (
        <p className="text-sm text-muted-foreground">
          No outstanding principal &mdash; every past agreement below is fully repaid. Eligible for a new principal.
        </p>
      )}

      {loanHistory.length > 0 && (
        <GlassPanel className="space-y-3 p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Loan history</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start date</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loanHistory.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.startDate}</TableCell>
                  <TableCell className="text-right">{money(a.principalAmount)}</TableCell>
                  <TableCell className="text-right">{money(a.profitAmount)}</TableCell>
                  <TableCell>{a.tenureWeeks} wks</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{a.purpose || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="capitalize">
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassPanel>
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
            <div>
              <p className="text-xs text-muted-foreground">Client type</p>
              <p className="text-sm font-medium capitalize">{checklist.clientType}</p>
            </div>
            {checklist.amountApproved && (
              <div>
                <p className="text-xs text-muted-foreground">Amount approved</p>
                <p className="text-sm font-medium">{money(checklist.amountApproved)}</p>
              </div>
            )}
            {checklist.preferredTenureMonths && (
              <div>
                <p className="text-xs text-muted-foreground">Preferred tenure</p>
                <p className="text-sm font-medium">{checklist.preferredTenureMonths} months</p>
              </div>
            )}
            {checklist.nin && (
              <div>
                <p className="text-xs text-muted-foreground">NIN</p>
                <p className="text-sm font-medium">{checklist.nin}</p>
              </div>
            )}
          </div>
        </GlassPanel>
      )}

      {canEdit && <PortalPanel clientId={client.id} existingLogin={portalLogin} />}

      <h2 className="text-sm font-semibold text-muted-foreground">Transaction history</h2>
      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead className="text-right">Principal Disb.</TableHead>
              <TableHead className="text-right">Recall</TableHead>
              <TableHead className="text-right">New Savings</TableHead>
              <TableHead className="text-right">Collateral In</TableHead>
              <TableHead className="text-right">Collateral Out</TableHead>
              <TableHead className="text-right">Savings B/F</TableHead>
              <TableHead className="text-right">Savings C/F</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.transactionDate}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.paymentId ?? "—"}</TableCell>
                <TableCell className="text-right">{money(t.loanDisbursement)}</TableCell>
                <TableCell className="text-right">{money(t.loanRecovery)}</TableCell>
                <TableCell className="text-right">{money(t.newSavings)}</TableCell>
                <TableCell className="text-right">{money(t.collateralTransferIn)}</TableCell>
                <TableCell className="text-right">{money(t.collateralTransferOut)}</TableCell>
                <TableCell className="text-right">{money(t.savingsBalanceBf)}</TableCell>
                <TableCell className="text-right">{money(t.savingsBalanceCf)}</TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No transactions recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
