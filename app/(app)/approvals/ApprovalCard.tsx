import { GlassPanel } from "@/components/layout/GlassPanel";
import { ApprovalActions } from "./ApprovalActions";

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  phone: "Phone",
  address: "Address",
  groupName: "Group",
  businessType: "Trade / business",
  businessLocation: "Business location",
  loanCollectorId: "Collections officer",
  loanDisbursement: "Principal disbursement",
  loanRecovery: "Principal recovery",
  profitInterest: "Profit",
  serviceCharge: "Service charge",
  newSavings: "New savings",
  savingsRecall: "Savings recall",
  collateralTransferIn: "Collateral in",
  collateralTransferOut: "Collateral out",
  notes: "Notes",
  supplementaryOverride: "Not supplementary",
};

function changeEntries(proposedChanges: unknown): [string, string][] {
  if (!proposedChanges || typeof proposedChanges !== "object") return [];
  return Object.entries(proposedChanges as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => [FIELD_LABELS[k] ?? k, String(v)]);
}

export type ApprovalRow = {
  id: number;
  entityType: string;
  entityId: number;
  requestedAt: string | Date;
  requestedByName: string;
  clientCode: string | null;
  clientFullName: string | null;
  proposedChanges: unknown;
};

export function ApprovalCard({ row }: { row: ApprovalRow }) {
  const entries = changeEntries(row.proposedChanges);

  return (
    <GlassPanel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {row.clientFullName ? (
              <>
                {row.clientFullName} <span className="text-xs font-normal text-muted-foreground">{row.clientCode}</span>
              </>
            ) : (
              `#${row.entityId}`
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.entityType === "client" ? "Client" : "Transaction"} · Requested by {row.requestedByName}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(row.requestedAt).toLocaleString()}</p>
      </div>

      {entries.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {entries.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No changes</p>
      )}

      <div className="mt-3 border-t border-border/60 pt-3">
        <ApprovalActions id={row.id} />
      </div>
    </GlassPanel>
  );
}
