import { GlassPanel } from "@/components/layout/GlassPanel";
import { LoanApplicationActions } from "./LoanApplicationActions";

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

export function LoanApplicationCard({ row }: { row: LoanApplicationRow }) {
  const proposed = row.proposedChanges as {
    amountRequested?: number;
    purpose?: string;
    tenureWeeksRequested?: number;
  };
  const amountRequested = Number(proposed?.amountRequested ?? 0);

  return (
    <GlassPanel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {row.clientFullName} <span className="text-xs font-normal text-muted-foreground">{row.clientCode}</span>
          </p>
          <p className="text-xs text-muted-foreground">Requested by {row.requestedByName}</p>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(row.requestedAt).toLocaleString()}</p>
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
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-xs text-muted-foreground">Purpose</dt>
          <dd className="font-medium">{proposed?.purpose || "—"}</dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-border/60 pt-3">
        <LoanApplicationActions
          id={row.id}
          amountRequested={amountRequested}
          tenureWeeksRequested={proposed?.tenureWeeksRequested ?? null}
          isReturningClient={row.isReturningClient}
        />
      </div>
    </GlassPanel>
  );
}
