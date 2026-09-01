import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_DAYS } from "@/lib/constants/paymentDays";
import { ALL_LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import { LoanApplicationActions, type ProposedLoanChanges } from "./LoanApplicationActions";

export type LoanApplicationRow = {
  id: number;
  requestedAt: string | Date;
  requestedByName: string;
  clientFullName: string;
  clientCode: string;
  clientPhone: string | null;
  clientBusinessType: string | null;
  isReturningClient: boolean;
  proposedChanges: unknown;
};

export function LoanApplicationCard({
  row,
  canRecommend,
  canApprove,
}: {
  row: LoanApplicationRow;
  canRecommend: boolean;
  canApprove: boolean;
}) {
  const proposed = (row.proposedChanges ?? {}) as ProposedLoanChanges;
  const amountRequested = Number(proposed?.amountRequested ?? 0);
  const productLabel = proposed?.product ? ALL_LOAN_PRODUCTS.find((p) => p.value === proposed.product)?.label : null;
  const paymentDayLabel = proposed?.paymentDay != null ? PAYMENT_DAYS.find((d) => d.value === proposed.paymentDay)?.label : null;

  return (
    <GlassPanel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {row.clientFullName} <span className="text-xs font-normal text-muted-foreground">{row.clientCode}</span>
          </p>
          <p className="text-xs text-muted-foreground">Requested by {row.requestedByName}</p>
        </div>
        <div className="flex items-center gap-2">
          {productLabel && <Badge variant="secondary">{productLabel}</Badge>}
          <p className="text-xs text-muted-foreground">{new Date(row.requestedAt).toLocaleString()}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Amount requested</dt>
          <dd className="font-medium text-brand">₦{amountRequested.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Tenure</dt>
          <dd className="font-medium">{proposed?.tenureWeeksRequested ? `${proposed.tenureWeeksRequested} wks` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Phone</dt>
          <dd className="font-medium">{row.clientPhone || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Business</dt>
          <dd className="font-medium">{row.clientBusinessType || "—"}</dd>
        </div>
        {paymentDayLabel && (
          <div>
            <dt className="text-xs text-muted-foreground">Payment day</dt>
            <dd className="font-medium">{paymentDayLabel}</dd>
          </div>
        )}
        {proposed?.recommendedAmount != null && (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-xs text-muted-foreground">Recommended</dt>
            <dd className="flex flex-wrap items-center gap-2 font-medium text-primary">
              ₦{Number(proposed.recommendedAmount).toLocaleString()}
              {proposed.recommendedByName && (
                <Badge variant="outline" className="text-xs font-normal">
                  by {proposed.recommendedByName}
                </Badge>
              )}
            </dd>
          </div>
        )}
        {proposed?.purpose && (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-xs text-muted-foreground">Purpose</dt>
            <dd className="font-medium">{proposed.purpose}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t border-border/60 pt-3">
        <LoanApplicationActions
          id={row.id}
          amountRequested={amountRequested}
          isReturningClient={row.isReturningClient}
          canRecommend={canRecommend}
          canApprove={canApprove}
          proposed={proposed}
        />
      </div>
    </GlassPanel>
  );
}
